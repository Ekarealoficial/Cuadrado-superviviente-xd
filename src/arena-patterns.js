'use strict';
const SCORED_MOVES=new Set(['pendulum','seconds','rewind','zero','chime','fault','replicas','collapse']);
function waveReach(a,q,square,padding){
  const dx=Math.max(Math.abs(q.x-a.x),Math.abs(q.x-a.x-a.w));
  const dy=Math.max(Math.abs(q.y-a.y),Math.abs(q.y-a.y-a.h));
  return (square?Math.max(dx,dy):Math.hypot(dx,dy))+padding;
}
function wave(b,start,q,square,index,extra={}){
  const a=state.arena,safe=b.safeSize||state.player.size;
  const speed=(extra.speed||365)*(b.difficulty?.shot||1)*Math.sqrt(Math.hypot(a.w,a.h)/1567);
  const reach=waveReach(a,q,square,safe/2+22);
  cue(b,'wave',start,extra.warn??.52,Math.max(.1,(reach-34)/speed),{
    ...extra,origin:point(q),square,angle:.31+index*.23,width:12,speed,reach,
    arenaW:a.w,arenaH:a.h,arenaX:a.x,arenaY:a.y,baseSpeed:extra.speed||365,offset:Math.sin(index*1.45)*.17,aperture:Math.max(104,safe+85)
  });
}
function waveShapes(out,e,q,u,live){
  const r=Math.min(e.reach,34+u*e.speed),a=state.arena;
  if(!e.square){
    // Several separate arcs give large characters a nearby gate on each side.
    const opening=Math.min(.65,Math.max(.20,e.aperture/(2*r)));
    for(let j=0;j<4;j++)out.push({kind:'sector',...point(q),r,width:e.width,
      from:e.angle+j*Math.PI/2+opening,to:e.angle+(j+1)*Math.PI/2-opening,live});
  }else{
    for(let side=0;side<4;side++){
      const vertical=side%2===1,base=vertical?q.y:q.x;
      const lo=Math.max(base-r,vertical?a.y:a.x),hi=Math.min(base+r,vertical?a.y+a.h:a.x+a.w);
      if(hi<=lo)continue;
      const mid=(lo+hi)/2+e.offset*Math.min(580,hi-lo),h=Math.min(e.aperture/2,(hi-lo)*.48);
      const fixed=(vertical?q.x:q.y)+(side===0||side===3?-r:r);
      for(const [s,end] of [[lo,Math.max(lo,mid-h)],[Math.min(hi,mid+h),hi]])if(end>s)out.push({kind:'line',x:vertical?fixed:s,y:vertical?s:fixed,
        xx:vertical?fixed:end,yy:vertical?end:fixed,width:e.width,live});
    }
  }
}
function pathMetrics(path){
  const lengths=[0];for(let i=1;i<path.length;i++)lengths.push(lengths[i-1]+Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y));
  return lengths;
}
function railPoint(e,u){
  const d=clamp(u,0,1)*e.lengths.at(-1);
  let i=1;while(i<e.lengths.length-1&&e.lengths[i]<d)i++;
  return mixPoint(e.path[i-1],e.path[i],(d-e.lengths[i-1])/(e.lengths[i]-e.lengths[i-1]||1));
}
function rail(b,path,start,warn,run,extra={}){
  cue(b,'rail',start,warn,run,{path,lengths:pathMetrics(path),...extra});
}
function curvedPath(p,q,bend,n=16){
  return Array.from({length:n+1},(_,i)=>{const u=i/n,v=mixPoint(p,q,u);v.y+=bend*Math.sin(Math.PI*u);return v;});
}
function targetForBeat(b,k){return roomTargets.length?roomTargets[((b.id||1)-1+k)%roomTargets.length]:state.player;}
function stratifiedSpot(i,n,pad=48){
  const a=state.arena,cols=Math.ceil(Math.sqrt(n*a.w/a.h)),rows=Math.ceil(n/cols);
  return {x:a.x+pad+(a.w-2*pad)*((i%cols)+gameRand(.18,.82))/cols,
    y:a.y+pad+(a.h-2*pad)*(Math.floor(i/cols)+gameRand(.18,.82))/rows};
}
function zoneRound(b,start,k,n,clock){
  cue(b,'seedZones',start,0,.01,{round:k,count:n,clock});
  b.timer=Math.max(b.timer,start+1.62);
}
function seedZones(b,e){
  const p=targetForBeat(b,e.round),warn=(e.clock?.94:.86)-.055*(b.phase-1);
  for(let i=0;i<e.count;i++){
    const near=e.clock?i%6===0:e.round%3!==0&&i%(e.round===1?4:6)===0;
    let q=stratifiedSpot(i,e.count);
    if(near){
      const v=polarPoint(p,i===0?0:gameRand(75,160),i*2.4+e.round);
      q=boundedPoint(v.x,v.y,29);
    }
    cue(b,e.clock?'dial':'faultZone',e.start+.07*(i%4),warn,.28,{
      origin:q,r:e.clock?36+3*b.phase:gameRand(28,43),index:i,round:e.round});
  }
}
function replicas(b,start=0,small=false){
  const n=small?6:14+3*(b.phase-1),rounds=!small&&b.phase===3?2:1;
  const replay=(b.trail||[]).slice(-12);
  for(let k=0;k<rounds;k++)for(let i=0;i<n;i++){
    const q=stratifiedSpot(i,n,65),t=start+k*1.85+(i%5)*.32;
    cue(b,'copy',t,.72,.24,{origin:q,index:i,round:k,replay:i%3===0?replay.map(v=>({x:clamp(v.x-replay[0].x,-45,45),y:clamp(v.y-replay[0].y,-36,36)})):[]});
  }
}
function copyAt(e,t){
  if(!e.replay.length)return e.origin;
  const v=e.replay[Math.floor(clamp((t-e.start)/(e.on-e.start),0,1)*(e.replay.length-1))];
  return {x:e.origin.x+v.x,y:e.origin.y+v.y};
}
function perimeterPoint(a,f){
  let d=((f%1+1)%1)*2*(a.w+a.h);
  if(d<a.w)return {x:a.x+d,y:a.y};d-=a.w;
  if(d<a.h)return {x:a.x+a.w,y:a.y+d};d-=a.h;
  if(d<a.w)return {x:a.x+a.w-d,y:a.y+a.h};d-=a.w;
  return {x:a.x,y:a.y+a.h-d};
}
function zeroGate(f,k){return Math.cos(TAU*(f-.055*k)*4)>.67;}
function scheduleClassicScore(b,m){
  const a=state.arena,c=patternOrigin(),p=bossPrey(b),phase=b.phase;
  if(m==='fault'||m==='seconds'){
    const clock=m==='seconds',n=phase===1?16:phase===2?20:24;
    for(let k=0;k<(clock&&phase>=2?4:3);k++)zoneRound(b,k*(clock?.83:.95),k,n,clock);
  }else if(m==='replicas')replicas(b);
  else if(m==='collapse'||m==='chime'){
    Object.assign(b,c);const square=m==='collapse',n=square?9+phase:5;
    for(let i=0;i<n;i++)wave(b,i*(square?.53:.85),c,square,i,{speed:(square?305:290)+i*(square?21:64),warn:.72});
  }else if(m==='zero'){
    Object.assign(b,c);for(let k=0;k<14;k++)cue(b,'perimeter',k*.45,.52,.12,{round:k});b.timer=7;
  }else if(m==='pendulum'){
    let direction=b.x<c.x?-1:1;
    const count=7+Math.floor(gameRandom()*4);
    for(let i=0;i<count;i++,direction=-direction){
      const start=i*(1.05-.055*phase),off=(i%3-1)*a.h*.21;
      const from={x:c.x+direction*(a.w/2-88),y:clamp(p.y+off,a.y+115,a.y+a.h-115)};
      const to={x:2*c.x-from.x,y:i%3===1?2*c.y-from.y:clamp(from.y-off*.45,a.y+110,a.y+a.h-110)};
      rail(b,curvedPath(from,to,i%3===0?0:direction*Math.min(85,a.h*.13)),start,.46-.025*phase,.39-.025*phase,{fans:10+phase*2});
    }
  }else if(m==='rewind'){
    const side=b.x<c.x?-1:1,d=Math.hypot(a.w,a.h),w=(a.w-180)*.83;
    const from={x:c.x-side*w/2,y:c.y-.11*a.h},to={x:c.x+side*w/2,y:c.y+.11*a.h};
    const build=amp=>Array.from({length:41},(_,i)=>{const u=i/40,q=mixPoint(from,to,u);q.y+=amp*Math.sin(u*TAU*1.5);return q;});
    let lo=0,hi=a.h*.34;
    for(let j=0;j<12;j++){const amp=(lo+hi)/2;if(pathMetrics(build(amp)).at(-1)<d*.83)lo=amp;else hi=amp;}
    const trail=build((hi+lo)/2),run=2.1;
    rail(b,trail,0,.42,run,{outward:true});
    rail(b,[...trail].reverse(),run+.42,.54,run/2.5,{returning:true});
    wave(b,run+.42+.54+run/2.5,from,false,2,{speed:400});
    if(phase===3)addPatternLayer(b,'seconds');
  }
}
function tickArenaEvent(b,e,t){
  if(e.kind!=='rail')return;
  const u=clamp((t-e.on)/(e.end-e.on),0,1);
  const pos=railPoint(e,u),next=railPoint(e,Math.min(.9999,u)+.0001);
  b.angle=angleTo(pos,next);Object.assign(b,pos);
  if(t<e.on)return;
  const beats=e.returning?8:e.fans?2:0;
  while((e.shots||0)<beats && u>=(e.shots||0)/beats){
    const k=e.shots||0,at=railPoint(e,k/beats),after=railPoint(e,k/beats+.001),a=angleTo(at,after);
    const n=e.fans?e.fans/2:b.phase>=3?7:6;
    for(let i=0;i<n;i++){
      const dir=e.returning&&k%3===2?i*TAU/n:a+(i%2?1:-1)*Math.PI/2+(Math.floor(i/2)-(n/4-.5))*.24;
      patternShot(b,at,dir,210+(i%3)*52,5,i%2?'#ffd570':'#d0e7ff');
    }
    e.shots=k+1;
  }
  if(!e.ended&&t>=e.end){e.ended=true;spawnParticles(pos.x,pos.y,14,b.color,1.1);bossCue(b.state+'Beat',b);}
}
function fireArenaEvent(b,e){
  const k=e.round||0,q=e.origin;
  if(e.kind==='seedZones')seedZones(b,e);
  if(e.kind==='blockRound'){
    const p=targetForBeat(b,k);
    for(let i=0;i<e.count;i++){
      let q=stratifiedSpot(i,e.count);
      if(i%5===0){const v=polarPoint(p,i===0?0:110,i+k);q=boundedPoint(v.x,v.y,36);}
      cue(b,'block',e.start+.07*(i%4),.74,.25,{origin:q,r:30+4*(i%3)});
    }
  }
  if(e.kind==='dial'||e.kind==='faultZone'||e.kind==='block'){
    spawnParticles(q.x,q.y,6,b.color,.8);
    if(e.kind==='faultZone'&&e.index%2===0)ringShots(b,q,e.index%4?4:8,k*.19,215+k*27,null,{square:true});
  }
  if(e.kind==='copy'){
    const v=copyAt(e,e.on);spawnParticles(v.x,v.y,6,b.color,.65);
    if(e.index%3===1)ringShots(b,v,10,k*.22,275);
    else for(let i=-2;i<=2;i++)patternShot(b,v,angleTo(v,targetForBeat(b,e.index))+.19*i,265+12*Math.abs(i));
  }
  if(e.kind==='perimeter'){
    const a=state.arena,box={x:a.x+7,y:a.y+7,w:a.w-14,h:a.h-14},c=patternOrigin(),n=104;
    for(let i=0;i<n;i++){
      const f=i/n;if(zeroGate(f,k))continue;
      const v=perimeterPoint(box,f),d=Math.hypot(c.x-v.x,c.y-v.y),speed=275+32*(k%3);
      patternShot(b,v,angleTo(v,c),speed,4,b.color,{life:(d-60)/speed});
    }
    const perimeter=2*(box.w+box.h);
    for(const f of [0,box.w/perimeter,.5,.5+box.w/perimeter]){
      if(zeroGate(f,k))continue;
      const v=perimeterPoint(box,f);patternShot(b,v,angleTo(v,c),310,5,b.color,{life:(Math.hypot(c.x-v.x,c.y-v.y)-60)/310});
    }
    if(k>=10)ringShots(b,c,20,k*.16,215,i=>zeroGate(i/20,k));
  }
}
// A shared opening for overlapping beam banks travels below walking speed.
// Clipping the segments here makes the opening identical in Canvas and collision.
function beaconPassage(b,t){
  t=b.gateTime??t;const a=state.arena,c=patternOrigin(),rx=Math.min(a.w*.27,300),ry=Math.min(a.h*.22,150);
  return {x:c.x+rx*Math.sin(t*.48+b.id),y:c.y+ry*Math.cos(t*.56+b.id)};
}
function beamSegments(out,p,q,width,live,gate,radius){
  const dx=q.x-p.x,dy=q.y-p.y,length=Math.hypot(dx,dy);
  const add=(s,e)=>{if(e>s)out.push({kind:'line',x:p.x+s*dx,y:p.y+s*dy,xx:p.x+e*dx,yy:p.y+e*dy,width,live});};
  if(!gate||!length){add(0,1);return;}
  const along=((gate.x-p.x)*dx+(gate.y-p.y)*dy)/length;
  const perp=((gate.y-p.y)*dx-(gate.x-p.x)*dy)/length;
  const h2=(radius+width/2)**2-perp*perp;
  if(h2<=0){add(0,1);return;}
  const h=Math.sqrt(h2);add(0,clamp((along-h)/length,0,1));add(clamp((along+h)/length,0,1),1);
}
const PAIRINGS={
  clock:[['rewind','seconds'],['pendulum','seconds']],
  fractal:[['cuts','replicas']],crown:[['garden','dance']],
  twins:[['link','pulses']],heart:[['transmission','turret'],['leak','transmission']],
  beacon:[['sweep','emitters'],['curtain','fusion'],['curtain','emitters']],
  monolith:[['impact','avalanche'],['wall','avalanche']],
  boss:[['dash','bombs'],['balls','bombs']],singular:[['attract','solar'],['lunar','solar']]
};
function compatibleSeconds(b,m){return (PAIRINGS[b.kind]||[]).filter(pair=>pair.includes(m)).flatMap(pair=>pair.filter(x=>x!==m)).filter((x,i,arr)=>arr.indexOf(x)===i);}
function addPatternLayer(b,second){
  if(b.combo===second)return;
  const m=b.state;
  if(second==='replicas'){replicas(b,0,true);}
  else if(second==='seconds'){zoneRound(b,1.1,1,12,true);zoneRound(b,2.4,2,14,true);}
  else if(second==='emitters')emitterFan(b,.12);
  else if(second==='fusion')fusion(b,.42,.52);
  else if(second==='transmission'||second==='turret')moduleAttack(b,second,.24,true);
  else if(second==='dance'){b.overlap='dance';}
  else if(second==='pulses'){for(let k=0;k<3;k++)for(const q of activeParts(b))volley(b,1+k*.74,q,12,245,k*.19,{part:q.index,color:q.color,gaps:true});}
  else if(second==='avalanche'){for(let k=0;k<3;k++)cue(b,'blockRound',.35+k*1.1,0,.01,{round:k,count:7+k});}
  else if(second==='solar'){solarVolley(b.id);}
  else if(second==='bombs'){
    const timer=b.timer;startBossAttack('bombs',b);b.state=m;b.timer=timer;
  }
  b.combo=second;if(b.kind==='beacon')b.laserGate=true;
  bossCue(second+'Charge',b);
}
