'use strict';
// Choreographies use simulation seconds. Only the server (or solo simulation)
// chooses paths. Clients draw the same coordinates and intervals from snapshots.
const ENCOUNTER_SPECS={
  beacon:{size:180,color:'#ff487d',limits:[.75,.45,.2],moves:[['tracking','curtain','sweep'],['refraction','emitters'],['fusion'],['overload']]},
  twins:{size:95,color:'#ffac57',limits:[.4,0],moves:[['link','exchange','pulses','pincer'],['binary'],['positiveStorm','negativeStorm']]},
  heart:{size:170,color:'#ff665f',limits:[.60,.25],moves:[['pistons','turret','transmission','discharge','shock'],['rebuild','machineCycle'],['leak']]},
  monolith:{size:230,color:'#83e4eb',limits:[],moves:[['stomp','wall','avalanche','impact','rhythm']]}
};
Object.assign(PATTERN_BOSSES,ENCOUNTER_SPECS);
const MOVE_NAMES={tracking:'Láser de seguimiento',curtain:'Cortina de láseres',sweep:'Barrido orbital',refraction:'Láser refractado',emitters:'Emisores secundarios',fusion:'Rayo de fusión',overload:'Sobrecarga total',
 link:'Enlace peligroso',exchange:'Intercambio cruzado',pulses:'Pulsos alternos',pincer:'Pinza',binary:'Doble núcleo',positiveStorm:'Polaridad positiva',negativeStorm:'Polaridad negativa',
 pistons:'Pistones',turret:'Torreta rotatoria',transmission:'Transmisión de energía',discharge:'Descarga del núcleo',shock:'Generador de ondas',rebuild:'Reensamblaje',machineCycle:'Sobrecarga mecánica',leak:'Fuga de energía',
 stomp:'Pisotón sísmico',wall:'Muralla en avance',avalanche:'Alud de bloques',impact:'Barrido de impacto',rhythm:'Ritmo de destrucción',
 cuts:'Corte cartesiano',lunge:'Embestida fractal',fault:'Falla',replicas:'Réplicas',prison:'Prisión',collapse:'Colapso fractal',hands:'Agujas',seconds:'Segundos perdidos',pendulum:'Péndulo',ticks:'Tiempo fragmentado',rewind:'Rebobinado',zero:'Hora cero',chime:'Campanadas',garden:'Jardín de proyectiles',petals:'Pétalos descendentes',dance:'Danza',stars:'Constelación',inverse:'Órbita inversa',rain:'Lluvia infinita',flower:'Flor final'};
for(const m of ['curtain','sweep','refraction','overload','fusion','link','binary','machineCycle','wall','rhythm','stomp','landing','leak','final'])HEAVY_MOVES.add(m);
const POLAR=['#ffa54d','#58e9ff'];
const ROLES=['turret','transmission','pistons','shock'];
const FINAL_TIME={fractal:4.9,clock:6.9,crown:6.1,beacon:5.5,twins:4.2,heart:5.4,monolith:6.2};
const point=(q)=>({x:q.x,y:q.y});
function polarPoint(q,r,a){return {x:q.x+r*Math.cos(a),y:q.y+r*Math.sin(a)};}
function mixPoint(a,b,t){return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}
function angleTo(a,b){return Math.atan2(b.y-a.y,b.x-a.x);}
function makeComponents(b){
  if(b.kind!=='twins'&&b.kind!=='heart')return;
  const twins=b.kind==='twins',n=twins?2:4;
  b.parts=Array.from({length:n},(_,i)=>{
    const hp=b.maxHp*(twins?.5:.19),q=polarPoint(b,twins?145:126+12*i,i*TAU/n);
    return {...boundedPoint(q.x,q.y,50),component:true,index:i,size:twins?95:46,balls:[],hp,maxHp:hp,color:twins?POLAR[i]:['#ffc071','#9eeaff','#ea8b85','#c8b7ff'][i],role:twins?['Positivo','Negativo'][i]:ROLES[i]};
  });
  b.repairs=1;
}
function activeParts(b){return (b.parts||[]).filter(q=>q.hp>0);}
function availablePatterns(b){
  if(b.kind==='twins'&&b.phase===3)return [activeParts(b)[0]?.index===0?'positiveStorm':'negativeStorm'];
  const moves=PATTERN_BOSSES[b.kind].moves.slice(0,b.phase).flat();
  if(b.kind!=='heart')return moves;
  return moves.filter(m=>(!ROLES.includes(m)||b.parts.some(q=>q.role===m&&q.hp>0))&&(m!=='rebuild'||b.repairs>0&&activeParts(b).length<4));
}
function partDefeated(q){
  if(q._dying)return;
  const b=livingBosses().find(o=>o.parts?.includes(q));
  if(!b||b.state==='final')return;
  q._dying=true;q.hp=0;spawnParticles(q.x,q.y,20,q.color,1);bossCue(b.kind+'Phase',q);
  if(b.kind==='heart')return;
  b.hp=activeParts(b).reduce((sum,v)=>sum+v.hp,0);
  if(!b.hp){b.lastTwin=q.index;b.x=q.x;b.y=q.y;killBoss(b);return;}
  b.fallen={...point(q),color:q.color};
  b.phase=3;b.deck=[];beginEncounterMove(b,'absorb');
}
// Damage from every weapon, including damage over time, uses the same core plating.
function hurtTarget(q,amount){
  if(q._dying||q.state==='final')return;
  if(q.kind==='heart')amount/=1+.13*activeParts(q).length;
  q.hp-=amount;
}
function reflectedPath(origin,angle,count){
  const a=state.arena,points=[point(origin)];let q=point(origin),dx=Math.cos(angle),dy=Math.sin(angle);
  for(let i=0;i<=count;i++){
    const tx=Math.abs(dx)<1e-8?Infinity:((dx>0?a.x+a.w:a.x)-q.x)/dx;
    const ty=Math.abs(dy)<1e-8?Infinity:((dy>0?a.y+a.h:a.y)-q.y)/dy;
    const d=Math.max(0,Math.min(tx,ty));q={x:q.x+dx*d,y:q.y+dy*d};points.push(q);
    if(tx<=ty+1e-7)dx=-dx;if(ty<=tx+1e-7)dy=-dy;
  }
  return points;
}
function makeScore(b){
  b.events=[];b.tracks=[];b.beat=0;b.age=0;b.timer=0;b.lastBeat=-2;b.lastCueAge=-1;
}
function cue(b,kind,start,warn,duration,data={}){
  b.events.push({kind,start,on:start+warn,end:start+warn+duration,...data});
  b.timer=Math.max(b.timer,start+warn+duration+.25);
}
function travel(b,index,from,to,start,duration){
  b.tracks.push({index,from:point(from),to:point(to),start,duration});
}
function ray(b,start,warn,duration,origin,angle,width,extra={}){
  cue(b,'ray',start,warn,duration,{origin:point(origin),angle,width,...extra});
}
function wave(b,start,origin,square,index,extra={}){
  cue(b,'wave',start,.48,1.75,{origin:point(origin),square,angle:index*Math.PI/2,width:11,speed:310,...extra});
}
function volley(b,start,origin,count,speed,turn,extra={}){
  cue(b,'volley',start,.18,.1,{origin:point(origin),count,speed,turn,...extra});
}
function emitterPoint(b,i,spread=0){
  const angle=i*Math.PI/2+b.clock*.55;
  return polarPoint(b,115+spread,angle);
}
function emitterFan(b,start,final=false){
  const c=patternOrigin(),a=state.arena;
  b.postStart=start;b.postEnd=start+3.14;
  b.posts=Array.from({length:4},(_,i)=>({x:c.x+Math.cos(i*Math.PI/2)*a.w*.32,y:c.y+Math.sin(i*Math.PI/2)*a.h*.32}));
  for(const [i,q] of b.posts.entries())ray(b,start+i*.53,.9,.32,q,final?angleTo(q,c)+i*.13:angleTo(q,bossPrey(b)),23,{post:i});
}
function sweep(b,start,turn=1){ray(b,start,b.phase>2?.88:1,b.phase>2?1.88:2,b,b.angle,33,{opposed:true,spin:turn*(2*Math.PI/3)/(b.phase>2?1.88:2)});}
function fusion(b,start,duration=1){ray(b,start,1.4,duration,b,b.angle,90,{impact:16});}
function scheduleBeacon(b,m){
  if(m==='tracking'){
    const n=3+Math.floor(gameRandom()*3);
    for(let i=0;i<n;i++)ray(b,i*2.06,1.3,.6,b,b.angle,49,{track:1});
  }else if(m==='curtain'){
    b.vertical=!b.vertical;const a=state.arena,n=7;
    for(let k=0;k<3;k++)for(let i=k%2;i<n;i+=k===2?4:2){
      const f=(i+.5)/n,q={x:a.x+(b.vertical?f*a.w:0),y:a.y+(b.vertical?0:f*a.h)};
      ray(b,(b.phase>2?.52:.6)*k,1,.38,q,b.vertical?Math.PI/2:0,32);
    }
  }else if(m==='sweep')sweep(b,0);
  else if(m==='refraction')cue(b,'path',0,1.1,.7,{points:reflectedPath(b,b.angle,2+Math.floor(gameRandom()*2)),width:30});
  else if(m==='emitters')emitterFan(b,0);
  else if(m==='fusion')fusion(b,0);
  else {sweep(b,0);sweep(b,3.2,-1);emitterFan(b,6.4);fusion(b,9.6,.55);}
}
function scheduleTwins(b,m){
  const c=patternOrigin(),a=state.arena,p=bossPrey(b),[pos,neg]=b.parts;
  if(m==='link'||m==='binary'){
    cue(b,'orbit',0,1, m==='link'?3.6:3,{radius:m==='link'?210:85,center:c});
    if(m==='link')cue(b,'link',0,1,3.6,{width:21});
    else{
      for(let k=0;k<12;k++)for(const q of b.parts)volley(b,.9+k*.25,q,6,200,k*.18+q.index*.28,{part:q.index,color:q.color,square:!q.index});
      for(const q of b.parts)wave(b,4.15,q,!q.index,q.index,{part:q.index});
    }
  }else if(m==='exchange'||m==='pincer'){
    const n=m==='exchange'?3+Math.floor(gameRandom()*3):1;
    let pair=b.parts.map(point);
    if(m==='pincer'){pair=[{x:a.x+80,y:c.y-80},{x:a.x+a.w-80,y:c.y+80}];b.parts.forEach((q,i)=>travel(b,i,q,pair[i],0,.42));}
    for(let k=0;k<n;k++){
      const start=(m==='pincer'?.46:0)+k*1.43;
      const ends=m==='exchange'?[pair[1],pair[0]]:pair.map(q=>{const v=polarPoint(q,Math.hypot(q.x-p.x,q.y-p.y)+130,angleTo(q,p));return boundedPoint(v.x,v.y,50);});
      pair.forEach((q,i)=>{
        cue(b,'dash',start,.8,.35,{origin:q,to:ends[i],width:74,index:i});
        travel(b,i,q,ends[i],start+.8,.35);
        if(m==='pincer')wave(b,start+1.15,ends[i],!i,i);
      });
      if(m==='exchange')volley(b,start+.82,mixPoint(...pair,.5),10,210,k*.27,{gaps:true});
      pair=ends;
    }
  }else if(m==='pulses'){
    for(let k=0;k<3;k++){const q=k%2?neg:pos,v=k%2?pos:neg;wave(b,k*1.05,q,!q.index,k);volley(b,.46+k*1.05,v,18,200,k*.15,{gaps:true,color:v.color});}
  }else if(m==='absorb'){wave(b,0,b.fallen,false,0,{color:b.fallen.color});}
  else{
    const q=activeParts(b)[0];if(!q)return;
    for(let k=0;k<6;k++){
      if(m==='positiveStorm'&&k%2===0)ray(b,k*.55,.68,.28,q,angleTo(q,p)+(k-2)*.19,26);
      else volley(b,k*.55,q,m==='positiveStorm'?12:21,220,k*.19,{square:!q.index,color:q.color,gaps:true});
    }
    wave(b,3,q,!q.index,1);
  }
}
function moduleAttack(b,role,start,short=false){
  const q=b.parts.find(v=>v.role===role);if(!q||q.hp<=0)return;
  const data={part:q.index},p=bossPrey(b);
  if(role==='pistons'){
    let from=point(q);
    for(let i=0;i<(short?1:3);i++){
      const dest=polarPoint(from,400,angleTo(from,p)+i*.25),to=boundedPoint(dest.x,dest.y,30),s=start+i*1.25;
      cue(b,'dash',s,.67,.35,{origin:from,to,width:44,index:q.index,...data});travel(b,q.index,from,to,s+.67,.35);from=to;
    }
    travel(b,q.index,from,q,start+(short?1:3)*1.25,.36);b.timer+=.4;
  }else if(role==='transmission'){
    for(const [i,other] of activeParts(b).filter(o=>o!==q).concat([b]).entries()){
      cue(b,'wire',start+.38*i,.75,.47,{...data,targetIndex:other===b?-1:other.index,width:19});
    }
  }else if(role==='turret'){
    cue(b,'turretOrbit',start,.35,short?1:2.7,{...data,angle:angleTo(b,q)});
    for(let i=0;i<(short?4:10);i++)volley(b,start+.3+i*.25,q,9,220,i*.22,{...data,color:q.color});
  }else for(let i=0;i<(short?1:2);i++)wave(b,start+i*.9,q,false,i,data);
}
function scheduleHeart(b,m){
  if(ROLES.includes(m))moduleAttack(b,m,0);
  else if(m==='rebuild'){
    const q=b.parts.find(v=>v.hp<=0);
    if(q&&b.repairs>0){b.repairs--;b.repairHP=b.hp;cue(b,'repair',0,2,.2,{index:q.index});}
  }else if(m==='machineCycle')['turret','transmission','shock','pistons'].forEach((role,i)=>moduleAttack(b,role,i*1.1,true));
  else{
    for(let i=0;i<(m==='leak'?7:4);i++){
      volley(b,.75+i*.51,b,20,195+12*(i%3),i*.18,{gaps:true});
      if(m==='leak'&&i%2===0)ray(b,i*.51,.8,.26,b,b.angle+i*.6,19);
    }
    if(m==='leak')cue(b,'burnout',3.6,.52,.1);
  }
}
function debris(b,start,n){
  for(let i=0;i<n;i++){
    const origin=i===0?point(bossPrey(b)):arenaSpot(60);
    cue(b,'block',start+i*.24,.84,.22,{origin,r:36});
  }
}
function scheduleMonolith(b,m){
  const a=state.arena,c=patternOrigin();
  if(m==='stomp'||m==='rhythm'){
    let s=m==='stomp'?.52:.32;
    for(let i=0;i<(m==='stomp'?3:6);i++){wave(b,s,b,m==='stomp'||i%2===0,i);s+=m==='stomp'?.87:1.12-i*.105;}
  }else if(m==='wall'){
    for(let k=0;k<2;k++)cue(b,'wall',2.75*k,.95,2.4,{horizontal:!k,reverse:gameRandom()<.5,door:gameRand(.3,.7)});
  }else if(m==='avalanche')debris(b,0,12);
  else{
    const q={x:a.x+122,y:clamp(bossPrey(b).y,a.y+120,a.y+a.h-120)},to={x:a.x+a.w-122,y:q.y};
    travel(b,-1,b,q,0,.7);cue(b,'dash',.7,1.05,.52,{origin:q,to,width:205,index:-1});
    travel(b,-1,q,to,1.75,.52);wave(b,2.27,to,true,2);b.timer+=.6;
  }
}
function beginEncounterMove(b,m){
  makeScore(b);b.state=m;b.posts=null;b.angle=angleTo(b,bossPrey(b));b.charging=false;
  if(b.kind==='beacon')scheduleBeacon(b,m);
  if(b.kind==='twins')scheduleTwins(b,m);
  if(b.kind==='heart')scheduleHeart(b,m);
  if(b.kind==='monolith')scheduleMonolith(b,m);
  b.timer=Math.max(.45,b.timer);bossCue((m==='absorb'?'pulses':m)+'Charge',b);
}
function finalNode(b,i,n){
  const k=b.kind,t=b.age;
  let r=k==='fractal'?145:k==='crown'?124:105;
  if(k==='twins')return polarPoint(b,125*Math.sin(Math.PI*clamp(t/3.8,0,1)),i*Math.PI+t*2.25);
  const release=k==='fractal'?3.5:k==='clock'?3.6:4.4;
  r*=clamp((t-.35)/.7,0,1)*(1-clamp((t-release)/1,0,1));
  const q=polarPoint(b,r,i*TAU/n+(k==='clock'?-.34*t:k==='crown'?.21*t:Math.PI/4));
  return boundedPoint(q.x,q.y,25);
}
function scheduleFinal(b){
  makeScore(b);b.state='final';const k=b.kind;
  if(k==='fractal'){
    for(let j=0;j<3;j++)for(let i=0;i<4;i++)volley(b,1+j*.76,b,8,175+40*j,j*.19,{node:i,nodes:4,square:true});
  }else if(k==='clock'){
    for(let i=0;i<12;i++)if(i%4!==0)volley(b,.66,b,1,210,i*TAU/12,{node:i,nodes:12});
    for(const offset of [0,2.55])ray(b,1.1,.68,2,b,b.angle+offset,18,{spin:-.91});
    for(let i=0;i<3;i++)wave(b,3.48+i*.54,b,false,i,{speed:355});
  }else if(k==='crown'){
    for(let j=0;j<3;j++)for(let i=0;i<12;i++){
      if(i%4===j%4)continue;
      for(let layer=0;layer<=j;layer++)for(const spread of [-.105,.105]){
        volley(b,.62+j*1.35,b,1,145+layer*40+j*12,i*TAU/12+spread+.09*layer,{node:i,nodes:12,color:layer%2?'#fff0ff':b.color,curve:(layer%2?-1:1)*.15});
      }
    }
  }else if(k==='beacon'){emitterFan(b,.44,true);}
  else if(k==='twins'){
    for(let j=0;j<2;j++)volley(b,1.08+j*.96,b,24,205+j*34,j*.22,{node:j,nodes:2,color:POLAR[j],square:!j,gaps:true});
  }else if(k==='heart'){
    for(let j=0;j<4;j++)volley(b,.95+j*.83,b,32,218+j*10,j*.17,{gaps:true});
  }else{
    for(let j=0;j<3;j++)wave(b,.57+j*1.1,b,true,j);
    debris(b,.8,8);
  }
  b.timer=FINAL_TIME[k];b.finalLength=b.timer;
}
function eventOrigin(b,e){
  if(e.node!==undefined)return finalNode(b,e.node,e.nodes);
  if(e.part!==undefined)return b.parts[e.part];
  return e.origin||b;
}
function tickScore(b,dt){
  const t=b.age;
  for(const tr of b.tracks||[]){
    if(t<tr.start||t-dt>tr.start+tr.duration)continue;
    const body=tr.index<0?b:b.parts[tr.index];
    if(body.hp>0)Object.assign(body,mixPoint(tr.from,tr.to,clamp((t-tr.start)/tr.duration,0,1)));
  }
  for(const e of b.events||[]){
    if(t<e.start||t>e.end+dt||e.part!==undefined&&b.parts[e.part].hp<=0)continue;
    if(e.track&&t<=e.start+e.track)e.angle=angleTo(e.origin,bossPrey(b));
    if(e.kind==='orbit'){
      e.from??=b.parts.map(point);
      const turn=Math.max(0,t-e.on)*(b.state==='binary'?2.3:.53);
      b.parts.forEach((q,i)=>{const dest=polarPoint(e.center,e.radius,i*Math.PI+turn);
        Object.assign(q,mixPoint(e.from[i],dest,clamp((t-e.start)/.85,0,1)));});
    }
    if(e.kind==='turretOrbit')Object.assign(b.parts[e.part],polarPoint(b,140,e.angle+Math.max(0,t-e.on)*1.55));
    if(t<e.on||e.fired)continue;
    e.fired=true;b.lastBeat=b.clock;
    const q=eventOrigin(b,e);
    if(e.kind==='volley'){
      for(let i=0;i<e.count;i++){
        if(e.gaps&&i%Math.max(4,Math.floor(e.count/3))<2)continue;
        patternShot(b,q,e.turn+i*TAU/e.count,e.speed,5,e.color||b.color,{square:e.square??b.kind==='fractal',curve:e.curve});
      }
    }
    if(e.kind==='repair'&&b.hp>b.repairHP-b.maxHp*.055){
      const part=b.parts[e.index];part.hp=part.maxHp*.48;part._dying=false;
    }
    if(e.kind==='burnout'){const part=activeParts(b).at(-1);if(part)partDefeated(part);}
    if(e.kind==='wave'||e.kind==='dash'||e.impact)state.shake=Math.max(state.shake,e.impact||7);
    // Simultaneous petals are one chord, not dozens of Web Audio voices.
    if(b.lastCueAge!==t){
      b.lastCueAge=t;
      const tone=e.post!==undefined?'emitter'+e.post:b.state==='final'?b.kind+'FinalBeat':b.state+'Beat';
      bossCue(tone,q);
    }
  }
}
function scoreShapes(b){
  const out=[],t=b.age,a=state.arena;
  if(!a)return out;
  function line(p,q,width,live){out.push({kind:'line',...point(p),xx:q.x,yy:q.y,width,live});}
  for(const e of b.events||[]){
    if(t<e.start||t>e.end||e.part!==undefined&&b.parts[e.part].hp<=0)continue;
    const live=t>=e.on,u=Math.max(0,t-e.on),q=eventOrigin(b,e);
    if(e.kind==='ray'){
      const angle=e.angle+u*(e.spin||0),len=Math.hypot(a.w,a.h)*1.1;
      line(e.opposed?polarPoint(q,-len,angle):q,polarPoint(q,len,angle),e.width,live);
    }else if(e.kind==='path')for(let i=1;i<e.points.length;i++)line(e.points[i-1],e.points[i],e.width,live);
    else if(e.kind==='wire'){
      const p=e.targetIndex<0?b:b.parts[e.targetIndex];if(p.hp<=0)continue;
      line(q,mixPoint(q,p,.32),e.width,live);line(mixPoint(q,p,.68),p,e.width,live);
    }else if(e.kind==='link')line(b.parts[0],b.parts[1],e.width,live);
    else if(e.kind==='dash'){
      if(!live)line(e.origin,e.to,e.width,false);
      else {const body=e.index<0?b:b.parts[e.index];out.push({kind:'disk',...point(body),r:e.width/2,live:true,index:0});}
    }else if(e.kind==='block')out.push({kind:'box',...point(q),r:e.r,live});
    else if(e.kind==='wave'){
      const r=46+u*e.speed,gap=Math.max(92,(b.safeSize||30)+55);
      if(!e.square)out.push({kind:'arc',...point(q),r,angle:e.angle,gap:Math.max(.53,Math.min(1.3,gap/(2*r))),width:11,live});
      else{
        const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>({x:q.x+r*x,y:q.y+r*y}));
        for(let i=0;i<4;i++){
          const p=corners[i],v=corners[(i+1)%4],door=(Math.round(e.angle/(Math.PI/2))+4)%4;
          if(i===door||i===(door+2)%4){
            const h=Math.min(.49,gap/(4*r));line(p,mixPoint(p,v,.5-h),11,live);line(mixPoint(p,v,.5+h),v,11,live);
          }else line(p,v,11,live);
        }
      }
    }else if(e.kind==='wall'){
      const n=e.horizontal?11:17,span=e.horizontal?a.h:a.w;
      const progress=clamp(u/(e.end-e.on),0,1),d=e.reverse?1-progress:progress;
      for(let i=0;i<n;i++){
        const f=(i+.5)/n;if(Math.abs(f-e.door)*span<Math.max(80,(b.safeSize||30)*.7+35))continue;
        out.push({kind:'box',x:a.x+a.w*(e.horizontal?d:f),y:a.y+a.h*(e.horizontal?f:d),r:span/n*.49,live});
      }
    }
  }
  return out;
}
