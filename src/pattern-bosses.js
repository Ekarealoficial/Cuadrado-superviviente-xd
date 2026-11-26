'use strict';
const PATTERN_BOSSES={
  fractal:{size:160,color:'#ff66cd',limits:[.65,.30],moves:[['cuts','lunge','fault'],['replicas','prison'],['collapse']]},
  clock:{size:170,color:'#ffcf66',limits:[.65,.30],moves:[['hands','seconds','pendulum'],['ticks','rewind'],['zero','chime']]},
  crown:{size:190,color:'#ce9fff',limits:[.60,.25],moves:[['garden','petals','dance'],['stars','inverse'],['rain','flower']]}
};
const MOVE_LENGTH={cuts:2.4,lunge:1.35,prison:4.4,hands:3.8,ticks:3.5,garden:4,petals:3.4,dance:3.3,stars:4.3,inverse:3.8,rain:7,flower:4.2};
const HEAVY_MOVES=new Set(['cuts','prison','collapse','hands','zero','chime','petals','rain','flower']);
function createPatternBoss(kind,pos,hp){
  const spec=PATTERN_BOSSES[kind];
  return {kind,...pos,size:spec.size,color:spec.color,hp,maxHp:hp,balls:[],phase:1,state:'recover',timer:1.25,
    age:0,clock:0,deck:[],trail:[],marks:[],hitFlash:0};
}
function patternOrigin(){const a=state.arena;return {x:a.x+a.w/2,y:a.y+a.h/2};}
function phaseOf(b){
  if(ENCORE[b.kind])return 1+ENCORE[b.kind].limits.filter(limit=>b.hp<=b.maxHp*limit).length;
  if(b.kind==='twins'){
    const live=b.parts.filter(q=>q.hp>0);
    return live.length<2?3:live.some(q=>q.hp<q.maxHp*.4)?2:1;
  }
  return 1+PATTERN_BOSSES[b.kind].limits.filter(limit=>b.hp<b.maxHp*limit).length;
}
function boundedPoint(x,y,pad){const a=state.arena;return {x:clamp(x,a.x+pad,a.x+a.w-pad),y:clamp(y,a.y+pad,a.y+a.h-pad)};}
function beginPattern(b,move,repeat=false){
  b.lastAttack=move;
  b.safeSize=Math.max(state.player.size,...roomTargets.map(p=>p.size));
  b.combo=null;b.events=[];b.tracks=[];
  if(ENCOUNTER_SPECS[b.kind]||SCORED_MOVES.has(move)){beginEncounterMove(b,move);return;}
  const arena=state.arena,center=patternOrigin(),p=bossPrey(b);
  b.charging=b.fired=b.splitShot=false;b.bend=0;
  b.state=move;b.age=0;b.timer=MOVE_LENGTH[move];b.beat=0;b.next=0;b.marks=[];b.origin={x:b.x,y:b.y};b.angle=Math.atan2(p.y-b.y,p.x-b.x);b.overlap='';
  if(!repeat)b.repeats=move==='lunge'?3+Math.floor(gameRandom()*3):1;
  if(['rain','flower'].includes(move))Object.assign(b,center);
  if(move==='petals')Object.assign(b,{x:center.x,y:arena.y+110});
  if(move==='lunge'&&repeat&&b.repeats<=2)b.angle+=(b.repeats%2?1:-1)*.46;
  if(move==='lunge')b.end=boundedPoint(b.x+620*Math.cos(b.angle),b.y+620*Math.sin(b.angle),82);
  if(move==='prison'){b.trap=boundedPoint(p.x,p.y,190);b.gap=Math.floor(gameRandom()*4);}
  if(move==='cuts'){b.vertical=gameRandom()<.5;b.offset=gameRand(70,125);}
  if(move==='stars')b.marks=Array.from({length:12},(_,i)=>({x:arena.x+arena.w*(.13+.245*(i%4)),y:arena.y+arena.h*(.2+.3*Math.floor(i/4))}));
  if(move==='inverse')b.inverseOrigin={x:b.x,y:b.y};
  if(b.phase===3 && move==='lunge'){b.overlap='replicas';b.marks=[arenaSpot(95),arenaSpot(95)];}
  if(b.phase===3&&move==='cuts')addPatternLayer(b,'replicas');
  if(b.phase===3 && move==='garden')b.overlap='dance';
  bossCue(move+'Charge',b);
}
function lungeDuration(b){return (b.repeats<=2?.204:.23)/(b.difficulty?.movement||1);}
function motionPoint(b,u){
  u=clamp(u,0,1);
  return {x:b.origin.x+(b.end.x-b.origin.x)*u,y:b.origin.y+(b.end.y-b.origin.y)*u+(b.bend||0)*Math.sin(Math.PI*u)};
}
function orbitNode(b,i,n,t){
  const a=i*TAU/n+t*(b.phase===3?1.4:1);
  const extend=b.state==='dance'?Math.sin(Math.PI*clamp(b.age/3.3,0,1))*108:0;
  const r=b.size/2+12+extend;
  return {x:b.x+r*Math.cos(a),y:b.y+r*Math.sin(a),a};
}
function replicaPoint(b,i){
  const mark=b.marks[i],replay=b.replay;
  if(!replay?.length || b.overlap)return mark;
  const k=Math.floor(clamp((b.age-.18*i)/2.8,0,1)*(replay.length-1)),pt=replay[k];
  return boundedPoint(mark.x+(pt.x-replay[0].x)*.7,mark.y+(pt.y-replay[0].y)*.7,45);
}
function patternShot(b,pos,a,v,r=6,tint=b.color,extra={}){
  v*=b.difficulty?.shot||1;
  state.enemyBullets.push({x:pos.x,y:pos.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r,tint,damage:1,life:7,source:b.id,shotScale:b.difficulty?.shot||1,square:b.kind==='fractal',...extra});
}
function ringShots(b,pos,n,turn,speed,skip,extra){
  for(let i=0;i<n;i++){
    if(skip?.(i))continue;
    const a=turn+i*TAU/n;
    const velocity=typeof speed==='function'?speed(i):speed;
    patternShot(b,pos,a,velocity,5,i%3?b.color:'#fff3ef',extra);
    const density=b.state==='final'?1:b.difficulty?.density||1;
    if(Math.floor((i+1)*(density-1))>Math.floor(i*(density-1))&&!skip?.((i+1)%n))
      patternShot(b,pos,a+Math.PI/n,velocity,5,b.color,extra);
  }
}
function patternBeat(b,k){
  const a=state.arena,move=b.state;
  if(move==='ticks')ringShots(b,b,28,k*.13,k%2?270:200,i=>i%2===1 && k%2===0);
  if(move==='garden'||move==='rain'||move==='flower'){
    const n=move==='garden'?(28+6*(b.phase-1)):move==='rain'?(b.age>5?68:60):76,layers=move==='flower'?4:1;
    for(let layer=0;layer<layers;layer++)ringShots(b,b,n,(layer%2?-1:1)*k*.095+layer*.047,
      i=>135+38*Math.cos(i*TAU/n*8)+layer*44+(move==='rain'&&k%2?54:0),
      i=>move!=='garden' && Math.cos(4*(i*TAU/n+(layer%2?-1:1)*k*.095+layer*.047-.12*k))>.68);
  }
  if(move==='petals'){
    const gap=.5+.25*Math.sin(k*.85);
    for(let i=1;i<36;i++)if(Math.abs(i/36-gap)>.092)patternShot(b,{x:a.x+a.w*i/36,y:a.y+26},Math.PI/2,k===3?465:190,7);
  }
  if(move==='dance'||b.overlap==='dance'){
    const n=b.phase===1?8:12;
    for(let i=0;i<n;i++){const q=orbitNode(b,i,n,b.clock);patternShot(b,q,q.a,245);}
  }
  if(move==='stars')for(let i=0;i<b.marks.length;i++)ringShots(b,b.marks[i],4,k*.17*(i%2?1:-1),152);
  if(move==='inverse')ringShots(b,b,16,k*.19,178,null,{orbitX:b.x,orbitY:b.y,born:state.time,release:state.time+2.9-b.age});
  b.lastBeat=b.clock;bossCue(move+'Beat',b);
}
const BEATS={
  cuts:[.8,.4,4],ticks:[.45,.34,9],
  garden:[.25,.31,12],petals:[.35,.88,4],
  dance:[.35,.28,10],stars:[1,.36,8],inverse:[.12,.18,6],rain:[.45,.23,29],flower:[1.5,.85,3]
};
function updatePatternBoss(b,dt){
  if(b._dying)return;
  if(b.waitFinal){
    if(!canCoverArena(b))return;
    b.waitFinal=false;bossCue(b.kind+'Death',b);
  }
  b.step=dt;b.clock+=dt;if(b.gateTime!==undefined)b.gateTime=b.clock;b.hitFlash=Math.max(0,b.hitFlash-dt);b.age+=dt;b.timer-=dt;
  if(ENCORE[b.kind])tickSignature(b,dt);
  tickLayers(b,dt);
  if(b.state==='final'){
    tickScore(b,dt);
    if(b.timer<=0){const active=state;state=finalCredit.get(b)||active;killBoss(b,true);state=active;}return;
  }
  if(b.kind==='twins')b.hp=activeParts(b).reduce((sum,q)=>sum+q.hp,0);
  const phase=phaseOf(b);
  if(phase>b.phase){if(b.kind==='general'){b.words=1;encounterVoice(b,GENERAL_LINES[phase-1][0]);}
    b.charging=false;b.overlap='';b.combo=null;b.laserGate=false;b.phase=phase;b.state='transition';b.events=[];b.tracks=[];b.posts=null;b.timer=b.kind==='frontier'?1.45:b.kind==='fractal'?1.5:1;b.age=0;b.deck=[];bossCue(b.kind+'Phase',b);return;}
  if(b.state==='recover' && !(b.entry && b.clock<1.12))b.timer-=dt*(1/(b.difficulty?.recovery||1)-1);
  if(b.state==='recover'||b.state==='transition'){
    if(b.state==='recover'&&!b.chasing&&!(b.entry&&b.clock<1.12)){
      const p=bossPrey(b),ang=Math.atan2(p.y-b.y,p.x-b.x)+Math.sin(b.clock)*.9;
      Object.assign(b,boundedPoint(b.x+Math.cos(ang)*dt*(45+15*b.phase)*(b.difficulty?.movement||1),b.y+Math.sin(ang)*dt*(45+15*b.phase)*(b.difficulty?.movement||1),b.size/2));
    }
    if(b.parts){
      for(const q of activeParts(b)){
        const dest=polarPoint(b,b.kind==='twins'?150:128+q.index*12,b.clock*.32+q.index*TAU/b.parts.length);
        const safe=boundedPoint(dest.x,dest.y,q.size/2);
        Object.assign(q,mixPoint(q,safe,Math.min(1,dt*2.5)));
      }
    }
    if(b.timer<=0){
      if(b.kind==='frontier'&&b.phase>=2&&!b.chasing)enterChase(b);
      if(!b.deck.length)b.deck=availablePatterns(b);
      b.deck=b.deck.filter(m=>availablePatterns(b).includes(m));
      const others=livingBosses().filter(o=>o!==b);
      if(others.length>=3 && others.filter(o=>o.pieces?o.pieces.some(q=>['exit','laneAim','pass'].includes(q.mode)):!['recover','idle','transition','drift'].includes(o.state)&&!o.waitFinal).length>=3){
        b.timer=.28;return;
      }
      const ready=b.deck.filter(m=>!HEAVY_MOVES.has(m)||!livingBosses().some(q=>q.waitFinal)&&canCoverArena(b,m));
      if(!ready.length){b.timer=.25;return;}
      const m=ready[Math.floor(gameRandom()*ready.length)];b.deck.splice(b.deck.indexOf(m),1);beginPattern(b,m);naturalLayers(b,m);
    }return;
  }
  if(ENCOUNTER_SPECS[b.kind]||SCORED_MOVES.has(b.state)){
    tickScore(b,dt);
    if(b.timer<=0){
      if(b.kind==='general'&&b.phase>=2&&state.damageTimer>b.age&&b.age>2)encounterVoice(b,'AÚN RECUERDAS CÓMO ESQUIVAR...');
      bossCue(b.state+'End',b);b.state='recover';b.age=0;
      b.timer=b.kind==='beacon'?Math.max(.19,.55-.09*b.phase):b.kind==='heart'?.76-.09*(4-activeParts(b).length)-.08*(b.phase-1):Math.max(.29,.78-.15*(b.phase-1));
      b.combo=null;b.laserGate=false;
      b.events=[];b.tracks=[];b.posts=null;
    }
    return;
  }
  const m=b.state,t=b.age;
  if(b.combo&&b.events?.length)tickScore(b,dt);
  if(m==='lunge'){
    const start=.7,run=lungeDuration(b);
    const u=clamp((t-start)/run,0,1);Object.assign(b,motionPoint(b,u));b.charging=t>=start && u<1;
    if(b.charging && !b.fired){bossCue(m+'Beat',b);b.fired=true;}
    if(b.overlap==='replicas' && t>=1 && !b.splitShot){for(const q of b.marks)ringShots(b,q,8,0,190);b.splitShot=true;}
  }
  const score=BEATS[m];
  const pace=b.kind==='crown'&&m!=='inverse'?1+.16*(b.phase-1):1;
  if(score && b.beat<Math.ceil(score[2]*pace) && t>=score[0]+b.beat*score[1]/pace)patternBeat(b,b.beat++);

  if(m==='inverse' && t>=2.45 && !b.fired){bossCue('inverseBeat',b);b.fired=true;}

  if(!b.trail.length||b.clock-b.trail.at(-1).t>.09){b.trail.push({x:b.x,y:b.y,t:b.clock});if(b.trail.length>32)b.trail.shift();}
  if(b.timer<=0){
    b.charging=b.fired=b.splitShot=false;
    if(--b.repeats>0){beginPattern(b,m,true);return;}
    bossCue(m+'End',b);b.state='recover';b.timer=m==='flower'?1.65:b.phase>=3?.46:.98;b.age=0;b.overlap='';b.combo=null;b.events=[];
  }
}
function canCoverArena(b,move){
  // Keep intersecting walls, moving beams and finales exclusive. A gapped
  // bullet pattern may share a late encounter with one local laser battery.
  if(livingBosses().some(o=>o!==b&&o.layers?.some(l=>BIG_PATTERNS.includes(l.state)&&l.timer>0)))return false;
  if(move&&b.phase>=2&&!state.bossLasers.length){
    const busy=livingBosses().filter(o=>o!==b&&(HEAVY_MOVES.has(o.state)||o.state==='blink'||o.pieces?.some(p=>['exit','laneAim','pass'].includes(p.mode))));
    if(busy.length===1&&!busy[0].waitFinal){
      const pair=[move,busy[0].state];
      if(pair.some(s=>['garden','petals','rain'].includes(s))&&pair.some(s=>['refraction','fusion','curtain'].includes(s)))return true;
    }
  }
  return !livingBosses().some(o=>o!==b && !o.waitFinal && (HEAVY_MOVES.has(o.state)||o.state==='blink'||o.state==='compress'||o.pieces?.some(p=>['laneAim','pass','exit'].includes(p.mode)))) && !state.bossLasers.length;
}
function curveEnemyShot(s,dt){
  if(s.curve){
    const turn=s.curve*dt,x=s.vx,y=s.vy;
    s.vx=x*Math.cos(turn)-y*Math.sin(turn);s.vy=x*Math.sin(turn)+y*Math.cos(turn);
  }
  if(s.release===undefined)return;
  const age=state.time-s.born;
  if(state.time>=s.release){
    const a=Math.atan2(s.y-s.orbitY,s.x-s.orbitX);s.vx=330*(s.shotScale||1)*(s.labSpeed||1)*Math.cos(a);s.vy=330*(s.shotScale||1)*(s.labSpeed||1)*Math.sin(a);delete s.release;
  }else if(age>=1){
    const dx=s.x-s.orbitX,dy=s.y-s.orbitY,a=dt*1.65;
    s.vx=(dx*(Math.cos(a)-1)-dy*Math.sin(a))/dt;s.vy=(dx*Math.sin(a)+dy*(Math.cos(a)-1))/dt;
  }
}
// Both the warning and the damaging frame use these exact primitives.
function patternShapes(b){
  const shapes=primaryShapes(b);
  if(!b.waitFinal)for(const l of b.layers||[])shapes.push(...scoreShapes(layerView(b,l)));
  return shapes;
}
function primaryShapes(b){
  const shapes=[],t=b.age,a=state.arena,m=b.state;
  if(!a||b.waitFinal)return shapes;
  if(m==='final'||ENCOUNTER_SPECS[b.kind]||SCORED_MOVES.has(m))return scoreShapes(b);
  function line(x,y,xx,yy,width,live){shapes.push({kind:'line',x,y,xx,yy,width,live});}
  function diskZone(q,r,live,index){shapes.push({kind:'disk',...q,r,live,index});}
  function square(q,r,gapSide,gap,live){
    const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
    for(let i=0;i<4;i++){
      const [ux,uy]=corners[i],[vx,vy]=corners[(i+1)%4],x=q.x+ux*r,y=q.y+uy*r,dx=(vx-ux)*r,dy=(vy-uy)*r;
      if(gapSide===i || gapSide===-2){
        const h=Math.min(.49,gap/(4*r));line(x,y,x+dx*(.5-h),y+dy*(.5-h),9,live);
        line(x+dx*(.5+h),y+dy*(.5+h),x+dx,y+dy,9,live);
      }else line(x,y,x+dx,y+dy,9,live);
    }
  }
  if(m==='cuts'){
    for(let i=0,pos=b.offset;pos<(b.vertical?a.w:a.h);pos+=Math.max(114,44+(b.safeSize||30)*1.3),i++){
      const start=.8+.4*(i%4);if(t>start+.35)continue;
      if(b.vertical)line(a.x+pos,a.y,a.x+pos,a.y+a.h,34,t>=start);
      else line(a.x,a.y+pos,a.x+a.w,a.y+pos,34,t>=start);
    }
  }else if(m==='hands'){
    const u=Math.max(0,t-.8);
    for(const [i,r] of [460,335].entries()){
      const angle=b.angle+i*1.8+u*(i?-.82:.9)*(1+.075*(b.phase-1));
      line(b.x,b.y,b.x+r*Math.cos(angle),b.y+r*Math.sin(angle),18,t>=.8);
    }
  }else if(m==='prison')square(b.trap,185-135*clamp((t-1)/3.4,0,1),b.gap,98,t>=1);
  return b.combo&&b.events?.length?shapes.concat(scoreShapes(b)):shapes;
}
function patternTouches(shape,p){
  const h=p.size/2;
  if(shape.kind==='line')return segmentDistance(p,shape,{x:shape.xx,y:shape.yy})<=h+shape.width/2;
  const dx=p.x-shape.x,dy=p.y-shape.y,d=Math.hypot(dx,dy);
  if(shape.kind==='rect')return Math.abs(dx)<=shape.rx+h && Math.abs(dy)<=shape.ry+h;
  if(shape.kind==='box')return Math.max(Math.abs(dx),Math.abs(dy))<=shape.r+h;
  if(shape.kind==='disk')return d<=shape.r+h;
  if(shape.kind==='sector'){
    const angle=((Math.atan2(dy,dx)-shape.from)%TAU+TAU)%TAU;
    if(angle<=shape.to-shape.from)return Math.abs(d-shape.r)<=h+shape.width/2;
    return [shape.from,shape.to].some(a=>Math.hypot(dx-shape.r*Math.cos(a),dy-shape.r*Math.sin(a))<=h+shape.width/2);
  }
  const diff=Math.atan2(Math.sin(Math.atan2(dy,dx)-shape.angle),Math.cos(Math.atan2(dy,dx)-shape.angle));
  return Math.abs(d-shape.r)<=shape.width/2+h && Math.abs(diff)+Math.asin(Math.min(1,h/(d||1)))>=shape.gap;
}
function patternContact(b,p){
  if(p.invuln>0||b.waitFinal)return;
  if(b.chasing && p.x-p.size/2<=b.x+27){damagePlayer(2);return;}
  if(patternShapes(b).some(s=>s.live && patternTouches(s,p)))damagePlayer(2);
  else if(b.charging && visibleContact(b,p,(b.size+p.size)/2))damagePlayer(2);
}
function startPatternFinal(b){
  if(b.state==='final')return;
  b.waitFinal=!canCoverArena(b);
  b.angle=angleTo(b,bossPrey(b));b.hp=0;b.charging=false;b.overlap='';
  if(b.parts)for(const q of b.parts)q._dying=true;
  b.layers=[];scheduleFinal(b);
  state.enemyBullets=state.enemyBullets.filter(s=>s.source!==b.id);
  finalCredit.set(b,state);if(!b.waitFinal)bossCue(b.kind+'Death',b);
}
