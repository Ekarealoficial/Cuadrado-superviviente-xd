'use strict';
function emitBurst(b,e){
  for(let i=0;i<e.count;i++){
    const spread=e.fan?((i+.5)/e.count-.5)*e.fan:i*TAU/e.count;
    if(e.gaps&&Math.cos(4*(spread-e.angle*.24))>.74)continue;
    const extra={square:!!e.square};
    for(const f of ['curve','split','bounce','shatter','seek','sway','swayRate','streak'])if(e[f])extra[f]=e[f];
    patternShot(b,e.origin,e.angle+spread,e.speed,e.radius||5,e.ink||b.color,extra);
  }
}
function openPortal(b,e,i){
  const role=e.role,major=!['soldier','gunner','rebel'].includes(role),hp=major?14:3;
  const q=polarPoint(e.origin,10+i%3*6,i*2.4);
  const soldier=createEnemy('normal',q.x,q.y,{master:b.id,role,rank:i+(e.origin.x|0),born:state.time,
    expires:state.time+(role==='rebel'?2:major?12:7),size:major?41:22,color:major?'#ffa6f6':'#b781ff',hp,maxHp:hp,xp:0,shootCd:.7+i*.08});
  state.enemies.push(soldier);
}
function updateRetainer(e,p,dt,travel){
  const q=livingBosses().find(b=>b.id===e.master);
  const left=e.expires-state.time;
  if(left<=0||(!q&&e.master!==-1)){
    if(q&&e.role==='rebel')ringShots(q,e,8,e.rank,240);
    state.enemies.splice(state.enemies.indexOf(e),1);return;
  }
  const role=e.role,aim=angleTo(e,p),rank=e.rank,age=state.time-e.born;
  const speed=(q?.phase===3?1.28:1)*(role==='charger'?154:105);
  const target=polarPoint(p,role==='gunner'||role==='radial'?260:role==='soldier'?75:155,rank*.7+age*.38);
  e.wob+=dt*3;e.hitFlash=Math.max(0,e.hitFlash-dt);e.shootCd-=dt;
  let dir=angleTo(e,target),rate=speed;
  if(e.command==='obedience'&&q&&e.until>state.time){
    const slot=polarPoint(q,220+rank%3*26,rank*.83+age*1.5);dir=angleTo(e,slot);rate=285;
  }else if(e.until>state.time&&e.command==='huntOrder'){dir=e.aim;rate=state.time<e.until-.38?0:620;}
  if(role==='rebel'){dir=rank+age*.4;rate=380;}
  moveWithWalls(e,Math.cos(dir)*rate*travel,Math.sin(dir)*rate*travel,currentWalls);
  if(!q||e.shootCd>0)return;
  e.shootCd=role==='caller'?2.2:q.phase===3?1.24:1.82;
  if(role==='charger'){e.command='huntOrder';e.aim=aim;e.until=state.time+.86;}
  else if(role==='caller')openPortal(q,{role:'soldier',origin:e},rank%7);
  else if(role==='miner'){
    queueFreeEvent(q,'dial',point(p),{r:37,index:0},.66,.24);
  }else if(role==='radial')ringShots(q,e,14,age*.5,245);
  else patternShot(q,e,e.command==='obedience'&&e.until>state.time?angleTo(e,q)+(rank%2?Math.PI:0):aim,240,5);
}
function commandArmy(b,e){
  const troops=state.enemies.filter(v=>v.master===b.id);
  if(e.order==='sacrifice'||e.order==='lastSacrifice'){
    const chosen=troops.filter((v,i)=>e.order==='lastSacrifice'||i%2===0);
    for(const [i,v] of chosen.entries()){
      cue(b,'offering',b.age,0,.62,{origin:point(v),to:point(b),r:v.size*.5});
      burst(b,b.age+.46,b,1,345+i%4*38,angleTo(b,targetForBeat(b,i))+(i%5-2)*.09,{radius:13+i%4,ink:'#ef94ff'});
      v.expires=state.time;
    }
  }else for(const v of troops){
    v.command=e.order;v.aim=angleTo(v,e.origin);v.until=state.time+(e.order==='obedience'?4.1:.89);
  }
}
function advanceEncoreShot(s,dt){
  if(s.seek){const p=targetForBeat({id:s.source||1},0),a=Math.atan2(s.vy,s.vx),d=angleTo(s,p)-a;
    const turn=clamp(Math.atan2(Math.sin(d),Math.cos(d)),-dt*s.seek,dt*s.seek),v=Math.hypot(s.vx,s.vy);s.vx=Math.cos(a+turn)*v;s.vy=Math.sin(a+turn)*v;}
  if(s.sway){s.baseX??=s.vx;s.baseY??=s.vy;s.clock=(s.clock||0)+dt;const v=Math.hypot(s.baseX,s.baseY)||1,w=s.sway*Math.sin(s.clock*s.swayRate);
    s.vx=s.baseX-w*s.baseY/v;s.vy=s.baseY+w*s.baseX/v;}
  let scatter=false;
  if(s.split){s.split-=dt;if(s.split<=0){s.split=0;scatter=true;}}
  const a=state.arena;
  if(s.bounce&&a){
    const x=s.x+s.vx*dt,y=s.y+s.vy*dt,r=s.r+1;
    const bx=(x<a.x+r&&s.vx<0)||(x>a.x+a.w-r&&s.vx>0),by=(y<a.y+r&&s.vy<0)||(y>a.y+a.h-r&&s.vy>0);
    if(bx||by){if(bx)s.vx*=-1;if(by)s.vy*=-1;s.bounce--;scatter||=s.shatter;}
  }
  if(scatter){const b={id:s.source,color:s.tint};for(let j=-2;j<=2;j++)patternShot(b,s,Math.atan2(s.vy,s.vx)+j*.33,265,4,s.tint,{square:s.square});}
}
function tickEncoreEvent(b,e){
  if(e.kind!=='portal'||b.age<e.on)return;
  const total=Math.min(e.count,1+Math.floor((b.age-e.on)*e.count/Math.max(.01,e.end-e.on)));
  while((e.emitted||0)<total){openPortal(b,e,e.emitted||0);e.emitted=(e.emitted||0)+1;}
}
function fireEncoreEvent(b,e){
  if(e.kind==='burst')emitBurst(b,e);
  if(e.kind==='command')commandArmy(b,e);
  if(e.kind==='teleport'){spawnParticles(b.x,b.y,12,b.color);Object.assign(b,e.origin);spawnParticles(b.x,b.y,18,b.color);}
  if(e.kind==='chaseBeat')chaseBeat(b,e.mode,e.round);
  if(e.kind==='classicRing'||e.kind==='halo'){
    const classic=e.kind==='classicRing',n=classic?Math.max(60,12*Math.ceil(e.r/98)):84;
    for(let i=0;i<(classic?e.angles.length:n);i++){
      const ang=classic?e.angles[i]:i*TAU/n+e.round*.22;
      if(!classic&&Math.cos(3*ang-e.round*.55)>.67)continue;
      const q=polarPoint(e.origin,e.r,ang);
      patternShot(b,q,ang+(classic?Math.PI:0),e.speed,5,b.color,{entersArena:classic,life:classic?e.r/e.speed:4,streak:classic,curve:classic?0:.085*(e.round%2?-1:1)});
    }
  }
}
function eventPosition(e,t){
  const u=clamp((t-e.on)/(e.end-e.on),0,1);
  return mixPoint(e.origin,e.to,u);
}
function appendEncoreShape(out,b,e,t,line){
  const live=t>=e.on,u=clamp((t-e.on)/(e.end-e.on),0,1),q=e.origin;
  if(e.kind==='stroke'){
    if(e.moving&&live)line(mixPoint(q,e.to,Math.max(0,u-(b.step||.033)/(e.end-e.on))),eventPosition(e,t),e.width,true);
    else line(q,e.to,e.width,live);
    if(e.ink)out.slice(-1).forEach(s=>s.ink=e.ink);
  }
  if(e.kind==='panel'){
    const pos=eventPosition(e,t);out.push({kind:'rect',...pos,rx:e.rx,ry:e.ry,live,ad:e.ad,censor:e.censor,soldier:e.soldier,jaw:e.jaw});
  }
  if(e.kind==='cage'){
    const r=182-143*u,gap=Math.max(83,b.safeSize+38);
    for(let i=0;i<4;i++){
      const side=[{x:q.x-r,y:q.y-r},{x:q.x+r,y:q.y-r},{x:q.x+r,y:q.y+r},{x:q.x-r,y:q.y+r}];
      const p=side[i],v=side[(i+1)%4];if(i!==e.side)line(p,v,12,live);
      else{const h=Math.min(.5,gap/(4*r));if(h<.5){line(p,mixPoint(p,v,.5-h),12,live);line(mixPoint(p,v,.5+h),v,12,live);}}
    }
  }
  if(e.kind==='recording'){
    if(!live)for(let i=1;i<e.path.length;i++)line(e.path[i-1],e.path[i],7,false);
    else for(let k=0;k<7;k++){const f=u*1.36-k*.06;if(f>=0&&f<=1)out.push({kind:'disk',...railPoint(e,f),r:e.r,live:true,index:k});}
  }
}
function queueFreeEvent(b,kind,q,extra,warn,run){
  const l={state:'support',age:0,timer:0,events:[],tracks:[]};
  cue(l,kind,0,warn,run,{origin:q,...extra});(b.layers||=[]).push(l);
}
function layerView(b,l){return Object.assign(Object.create(b),l,{id:b.id,parts:b.parts,step:b.step,clock:b.clock,gateTime:b.gateTime??b.age});}
function tickLayers(b,dt){
  if(!b.layers?.length)return;
  for(const l of b.layers){
    l.age+=dt;l.timer-=dt;const v=layerView(b,l);tickScore(v,dt);
    l.timer=v.timer;l.lastCueAge=v.lastCueAge;
  }
  b.layers=b.layers.filter(l=>l.timer>0);
}
function sideScore(b,m,delay=.18){
  if(b.combo===m&&b.events?.some(e=>e.kind==='copy'||e.kind==='seedZones')||b.layers?.some(l=>l.state===m&&l.timer>.4))return;
  const layer={state:m,age:0,timer:0,events:[],tracks:[],x:b.x,y:b.y,safeSize:b.safeSize||state.player.size};
  const v=layerView(b,layer);
  if(ENCORE[b.kind])scoreSignature(v,m);
  else if(b.kind==='beacon'){
    if(m==='curtain')laserCurtain(v,0,b.vertical,3+b.phase);
    else if(m==='tracking')ray(v,0,.75,.47,b,b.angle,21,{track:.38});
    else scheduleBeacon(v,m);
    b.gateTime=b.clock;layer.posts=v.posts;layer.postStart=v.postStart;layer.postEnd=v.postEnd;b.laserGate=true;
  }else if(b.kind==='heart'){
    if(ROLES.includes(m))moduleAttack(v,m,0,true);else scheduleHeart(v,m);
  }else if(m==='edgeTicks'){for(let i=0;i<4;i++)curtainShots(v,i*.57,i%2,14,i);}
  else if(m==='seconds')for(let i=0;i<3;i++)zoneRound(v,.6+i*.91,i,12,true);
  else if(m==='replicas')replicas(v,0,true);
  else if(m==='dance')volleys(v,6,b,.2,.41,18);
  else if(m==='avalanche')for(let i=0;i<3;i++)cue(v,'blockRound',i*.77,0,.1,{round:i,count:7+i});
  else if(m==='pulses')scheduleTwins(v,m);
  if(!v.events.length&&!v.tracks.length)return;
  // Secondary movements leave echoes. Only the lead track drives the main body.
  layer.tracks=layer.tracks.filter(tr=>tr.index>=0);
  layer.timer=v.timer+delay;layer.age=-delay;layer.angle=v.angle;
  (b.layers||=[]).push(layer);b.combo=m;bossCue(m+'Charge',b);
}
function naturalLayers(b,m){
  const ph=b.phase,table=PAIRINGS[b.kind]||[];
  if(b.kind==='frontier'&&b.phase===2&&b.hp/b.maxHp<.2&&m!=='terminal')sideScore(b,'terminal',.55);
  const unlocked=ENCORE[b.kind]?.moves.slice(0,ph).flat();
  const eligible=s=>s!==m&&(!unlocked||unlocked.includes(s))&&
    (b.kind!=='heart'||!ROLES.includes(s)||b.parts.some(q=>q.role===s&&q.hp>0));
  let pool=table.filter(p=>p.includes(m)&&p.some(eligible));
  if(!pool.length&&b.kind==='beacon')pool=[[m,'emitters','tracking']];
  if(!pool.length&&b.kind==='heart')pool=[['discharge',...activeParts(b).map(q=>q.role)]];
  if(!pool.length)return;
  const group=pool[Math.floor(gameRandom()*pool.length)],busy=livingBosses().some(q=>q!==b&&!['idle','drift','recover','transition'].includes(q.state));
  const max=busy?1:ph===1?1:Math.min(3,ph>=3||b.kind==='prism'&&b.hp/b.maxHp<.2?3:2);
  const choices=group.filter(eligible);
  if(ph>=3&&['dawn','general'].includes(b.kind)&&choices.length<3){
    const accent=b.kind==='dawn'?'halos':'bombard';if(accent!==m&&!choices.includes(accent))choices.push(accent);
  }
  for(const [i,s] of choices.slice(0,max).entries()){
    if(s==='terminal'&&b.hp/b.maxHp>.2)continue;
    if(busy&&BIG_PATTERNS.includes(s)&&!canCoverArena(b,s))continue;
    if(ROLES.includes(s)&&b.kind==='heart'&&!b.parts.some(q=>q.role===s&&q.hp>0))continue;
    if(!ENCORE[b.kind]&&!['beacon','heart'].includes(b.kind)&&!['edgeTicks','seconds','replicas','dance','avalanche','pulses'].includes(s))continue;
    sideScore(b,s,.16+i*.36);
  }
}

function wormSupport(b,move='zigzag'){
  if(b.layers?.length)return;
  const layer={state:move,age:0,timer:0,events:[],tracks:[]};
  const h=b.pieces[0].parts[0],p=bossPrey(b);
  const v=layerView(b,layer);
  let last=point(h);
  for(let i=0;i<(move==='rush'?1:4);i++){
    const next=boundedPoint(p.x+(i%2?145:-145),p.y+(i-1)*72,30);
    crossing(v,i*.27,last,next,32,.61,.24,{moving:true,echo:true});last=next;
  }
  layer.timer=v.timer;b.layers=[layer];
}
