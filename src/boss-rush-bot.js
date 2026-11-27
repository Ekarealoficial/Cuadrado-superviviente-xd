'use strict';
// Plan in world coordinates. Every action goes through applyControl, useSlot or pickCard.
const BOT_LOOK=[.07,.15,.24,.34,.45,.57,.70,.84,.99];
const BOT_DIRECTIONS=Array.from({length:16},(_,i)=>({x:Math.cos(i*TAU/16),y:Math.sin(i*TAU/16)}));
const botDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function botPriority(id){
  const p=state.player,missing=state.maxHalfHearts-state.halfHearts;
  const value={
    nullArc:state.enemyBullets.length>24?17:11,omega:16,starTide:14,resNet:state.groupSize>1?17:12,
    dashPulse:state.specialCards.dash.totalCards?13:5,survival:missing?12:8,
    refract:p.bounces?13:5,saturation:state.groupSize>1?13:8,returnShot:9+p.shots*.2,capacitor:12,compression:10,
    activeHeal:16+missing,kame:16,reverse:15,frames:14,dash:12,blink:10,timeBreak:12,
    plasma:13,army:11,crush:12,anchor:9,needles:10,thunderRain:11,
    health:7+missing*2,regen:p.regenLevel?5:12,armor:12,mini:11,
    drone3:15,drone2:13,drone1:11,fire:10+p.shots*.55,multi:14/(1+.12*(p.shots-1)),
    size:p.sizeLevel===0?10:13,venom:12,critical:10,shield:10,lightning:12,
    speed:p.speed<390?13:6,explosive:11,rayolaser:p.shots>1?11:4
  };
  const owned=state.specialCards[id]?.totalCards||0;
  return (value[id]??6)-Math.min(5,owned*1.3);
}
function botEquip(){
  const owned=SPECIAL_CARDS.filter(c=>state.specialCards[c.id].totalCards);
  const priority=c=>c.id==='dash'&&state.arena?.chase?100:botPriority(c.id);
  owned.sort((a,b)=>priority(b)-priority(a));
  for(let i=0;i<state.slots.length;i++)state.slots[i]=owned[i]?.id||null;
}
function botPickUpgrade(){
  const choices=state.cardChoices;
  if(!choices?.length)return;
  const best=choices.reduce((a,b)=>botPriority(b.id)>botPriority(a.id)?b:a);
  pickCard(best);botEquip();
}
function botTarget(){
  const p=state.player;
  let best=null,score=Infinity;
  for(const q of [...bossTargets(),...state.enemies]){
    if(q.hp<=0||q._dying||q.state==='final'||q.state==='transition')continue;
    const d=botDistance(q,p);
    const cost=d+(q.master && d>200?320:0)-(q.component?150:0)+80*q.hp/(q.maxHp||1);
    if(cost<score){score=cost;best=q;}
  }
  return best;
}
function botForecast(t,bosses){
  const out=[],p=state.player;
  const line=(q,x,y,width,live)=>out.push({kind:'line',x:q.x,y:q.y,xx:x,yy:y,width,live});
  const disk=(q,r,live)=>out.push({kind:'disk',x:q.x,y:q.y,r,live});
  for(const b of bosses){
    const future={...b,age:b.age+t,layers:(b.layers||[]).map(l=>({...l,age:l.age+t}))};
    if(PATTERN_BOSSES[b.kind])out.push(...patternShapes(future));
    else for(const layer of future.layers)out.push(...scoreShapes(layerView(future,layer)));
    if(b.state==='lunge'){
      const run=lungeDuration(b),age=b.age+t;
      if(age<.7)line(b.origin,b.end.x,b.end.y,b.size,false);
      else if(age<=.7+run+.07){
        const from=motionPoint(b,(age-.77)/run),to=motionPoint(b,(age-.7)/run);
        line(from,to.x,to.y,b.size,true);
      }
    }
    if(b.state==='dash_windup'||b.state==='dash'){
      line(b,b.x+880*(b.difficulty?.movement||1)*Math.cos(b.dashAngle),b.y+880*(b.difficulty?.movement||1)*Math.sin(b.dashAngle),b.size,b.state==='dash'||b.timer<t);
    }
    for(const piece of b.pieces||[])if(piece.mode==='laneAim'||piece.mode==='pass'){
      const a=state.arena,lane=piece.lanes[piece.lane],live=piece.mode==='pass'||t>=piece.timer;
      if(piece.horizontal)line({x:a.x,y:lane},a.x+a.w,lane,piece.laneWidth,live);
      else line({x:lane,y:a.y},lane,a.y+a.h,piece.laneWidth,live);
    }
    for(const piece of b.pieces||[])if(piece.mode==='windup'){
      const head=piece.parts[0],length=(b.phase===2?433:696)*(b.difficulty?.movement||1);
      line(head,head.x+length*Math.cos(piece.heading),head.y+length*Math.sin(piece.heading),head.size,piece.timer<t);
    }
    for(const q of b.planets||[])disk(q,q.r+10,true);
  }
  for(const q of state.bossLasers)line(q,q.x+bossLaserReach()*Math.cos(q.angle),q.y+bossLaserReach()*Math.sin(q.angle),q.width,q.state==='active'||t>=q.warmup);
  for(const q of state.bossBombs)if(!q.exploded)disk(q,q.timer<=t+.15?100:q.r+12,true);
  for(const q of state.iceZones)disk(q,45,q.age+t>=ICE_FALL);
  for(const q of state.cosmicZones){
    if(q.age+t>(q.off||q.duration))continue;
    const live=q.age+t>=q.windup;
    if(q.type==='beam'){for(let i=1;i<q.points.length;i++)line(q.points[i-1],q.points[i].x,q.points[i].y,q.width,live);}
    else disk(q,q.type==='well'?q.r*.65:SOLAR_RADIUS,live);
  }
  // Distance culling once per horizon, before testing alternative routes.
  const reach=p.speed*(p.frameTime>0?4:1)+330+p.size/2;
  return out.filter(s=>s.kind==='line'?segmentDistance(p,s,{x:s.xx,y:s.yy})<reach+s.width/2:
    botDistance(s,p)<reach+(s.r||Math.hypot(s.rx||0,s.ry||0)));
}
function botScene(){
  const p=state.player,bosses=livingBosses(),moving=[];
  function add(q,r,vx=0,vy=0,reflect=false){
    if(botDistance(q,p)>450+p.speed*(p.frameTime>0?4:1)*.7+Math.hypot(vx,vy)*1.02+r)return;
    const a=state.arena;
    function mirror(v,lo,hi){
      const w=hi-lo,t=((v-lo)%(2*w)+2*w)%(2*w);
      return lo+Math.min(t,2*w-t);
    }
    const path=[q,...BOT_LOOK.map(t=>{
      const x=q.x+vx*t,y=q.y+vy*t;
      return reflect&&a?{x:mirror(x,a.x+r,a.x+a.w-r),y:mirror(y,a.y+r,a.y+a.h-r)}:{x,y};
    })];
    moving.push({path,r});
  }
  for(const q of [...state.enemyBullets,...state.enemyDarts])add(q,q.r||9,q.vx||0,q.vy||0);
  for(const b of bosses){
    for(const q of b.balls)if(q.state==='flying')add(q,q.r,q.vx,q.vy,true);
    for(const q of b.pieces?b.pieces.flatMap(s=>s.parts):b.parts?[b,...activeParts(b)]:[b])add(q,q.size/2);
  }
  for(const q of state.enemies){
    const d=botDistance(p,q)||1,v=q.speed||0;
    add(q,q.size/2,(p.x-q.x)*v/d,(p.y-q.y)*v/d);
  }
  return {moving,shapes:BOT_LOOK.map(t=>botForecast(t,bosses))};
}
// Select the opening on the side the player can reach before the expanding front.
function botWaveGate(){
  const p=state.player,a=state.arena;
  let best,time=1.9;
  for(const b of livingBosses())for(const layer of [b,...(b.layers||[])]){
    for(const e of layer.events||[]){
      if(e.kind!=='wave'||layer.age<e.start||layer.age>e.end)continue;
      const o=eventOrigin(b,e),dx=p.x-o.x,dy=p.y-o.y;
      const distance=e.square?Math.max(Math.abs(dx),Math.abs(dy)):Math.hypot(dx,dy);
      const arrival=e.on+(distance-34)/e.speed-layer.age;
      if(arrival<-.09||arrival>=time)continue;
      time=arrival;
      if(!e.square){
        const angle=e.angle+Math.round((Math.atan2(dy,dx)-e.angle)/(Math.PI/2))*Math.PI/2;
        best=polarPoint(o,distance,angle);
      }else{
        const vertical=Math.abs(dx)>Math.abs(dy),base=vertical?o.y:o.x;
        const lo=Math.max(base-distance,vertical?a.y:a.x),hi=Math.min(base+distance,vertical?a.y+a.h:a.x+a.w);
        const mid=(lo+hi)/2+e.offset*Math.min(580,hi-lo);
        best=vertical?{x:p.x,y:mid}:{x:mid,y:p.y};
      }
    }
  }
  return best;
}
// The two panels of a corridor gate share a start time and horizontal path.
function botChaseGoal(){
  const p=state.player,a=state.arena,wall=a.x+58,lead=p.x-wall;
  const pace=p.speed*.68+clamp((lead-350)*.48,0,p.speed*.7);
  let y=a.y+a.h/2,soonest=2.2;
  for(const b of livingBosses().filter(body=>body.chasing)){
    for(const layer of [b,...(b.layers||[])]){
      const events=layer.events||[];
      for(let i=0;i+1<events.length;i++){
        const top=events[i],bottom=events[i+1];
        if(!top.jaw||!bottom.jaw||top.start!==bottom.start||top.origin.x!==bottom.origin.x||
          top.origin.y>=bottom.origin.y||layer.age<top.start||layer.age>=top.end)continue;
        const start=Math.max(0,top.on-layer.age),end=top.end-layer.age;
        const startX=eventPosition(top,layer.age+start).x;
        const gateSpeed=(top.to.x-top.origin.x)/(top.end-top.on);
        const approach=pace-gateSpeed;
        if(Math.abs(approach)<1)continue;
        const t=start+(startX-p.x-pace*start)/approach;
        if(t<start-.16||t>end+.16||t>=soonest)continue;
        soonest=t;
        const age=layer.age+Math.max(0,t);
        y=(eventPosition(top,age).y+top.ry+eventPosition(bottom,age).y-bottom.ry)/2;
      }
    }
  }
  // Keep the pursuer in range while making room for the next marked opening.
  return {x:wall+410+pace*.8,y};
}
function botGoal(target){
  const p=state.player,a=state.arena;
  if(a?.chase)return botChaseGoal();
  const opening=botWaveGate();if(opening)return opening;
  let loot=state.halfHearts<state.maxHalfHearts?state.potions:[],label='RECOGIENDO VIDA';
  if(!loot.length){loot=state.cardRelics;label='RECOGIENDO RELIQUIAS';}
  if(!loot.length && !target){loot=state.orbs;label='RECOGIENDO XP';}
  if(loot.length){
    const q=loot.reduce((a,b)=>botDistance(a,p)<botDistance(b,p)?a:b);
    return {...q,label};
  }
  if(!target)return {x:p.x,y:p.y};
  const d=botDistance(target,p)||1;
  // Maintain firing range, with space behind the player to evade new patterns.
  const distance=p.frameTime>0?0:Math.min(420,a?a.h*.46:420);
  const base=Math.atan2(p.y-target.y,p.x-target.x);
  if(!a)return polarPoint(target,distance,base);
  const options=[-.68,.68].map(turn=>polarPoint(target,distance,base+turn));
  const margin=q=>Math.min(q.x-a.x,a.x+a.w-q.x,q.y-a.y,a.y+a.h-q.y);
  const forward=q=>(q.x-p.x)*p.vx+(q.y-p.y)*p.vy;
  const score=q=>Math.min(130,margin(q))+.0007*forward(q);
  return score(options[0])>score(options[1])?options[0]:options[1];
}
function botRoute(dir,scene,goal,burst=0,turn=null){
  const p=state.player,a=state.arena,speed=p.speed*(p.frameTime>0?4:1);
  let risk=0,imminent=0,edge=0,progress=0,prev=p;
  for(let i=0;i<BOT_LOOK.length;i++){
    const t=BOT_LOOK[i],lag=(1-Math.exp(-16*t))/16;
    const travel=burst?burst*Math.min(1,t/.18)+speed*Math.max(0,t-.18):speed*(t-lag);
    const q={x:p.x+dir.x*travel+(burst?0:p.vx*lag),y:p.y+dir.y*travel+(burst?0:p.vy*lag),size:p.size+8};
    if(turn && t>.34){
      const elapsed=t-.34,delta=speed*(elapsed-(1-Math.exp(-16*elapsed))/16);
      q.x+=(turn.x-dir.x)*delta;q.y+=(turn.y-dir.y)*delta;
    }
    if(a){
      const margin=Math.min(q.x-a.x,a.x+a.w-q.x,q.y-a.y,a.y+a.h-q.y)-p.size/2;
      edge+=Math.max(0,75-margin)*.13;
      if(margin<0)risk+=90;
      if(a.chase && q.x<a.x+105+p.speed*t*.75)risk+=180;
    }else if(currentWalls.some(w=>aabbOverlapBox(q.x,q.y,p.size,w)))risk+=100;
    const urgency=(1/(1+t*2.7))*(p.invuln>t || burst && t<.28?.025:1);
    for(const s of scene.shapes[i])if(patternTouches(s,q))risk+=urgency*(s.live?110:39);
    for(const s of scene.moving){
      // Closest relative approach along this time slice also catches fast bullets.
      const from=s.path[i],to=s.path[i+1],x=prev.x-from.x,y=prev.y-from.y;
      const dx=q.x-prev.x-(to.x-from.x),dy=q.y-prev.y-(to.y-from.y);
      const near=s.r+q.size/2+24;
      if(Math.min(x,x+dx)>near || Math.max(x,x+dx)<-near ||
         Math.min(y,y+dy)>near || Math.max(y,y+dy)<-near)continue;
      const u=clamp(-(x*dx+y*dy)/(dx*dx+dy*dy||1),0,1);
      const clearance=Math.hypot(x+dx*u,y+dy*u)-s.r-q.size/2;
      risk+=urgency*(clearance<0?75+Math.min(30,-clearance):Math.max(0,24-clearance)*.7);
    }
    if(t<=.34)imminent=risk;
    progress+=botDistance(goal,q)/(1+t);prev=q;
  }
  const continuity=state.rush.intent;
  return {dir,turn,end:point(prev),risk,imminent,cost:risk+edge+progress*.041-
    (continuity?3*(continuity.x*dir.x+continuity.y*dir.y):0)};
}
function bestBotRoute(scene,goal,burst){
  let best;
  const p=state.player,d=botDistance(goal,p)||1;
  const speed=p.speed*(p.frameTime>0?4:1);
  const scale=burst?d:Math.max(d,speed*.58);
  const candidates=[{x:(goal.x-p.x)/scale,y:(goal.y-p.y)/scale},...BOT_DIRECTIONS];
  if(!burst){
    candidates.push({x:0,y:0});
    for(let i=0;i<BOT_DIRECTIONS.length;i+=2)candidates.push({x:BOT_DIRECTIONS[i].x*.45,y:BOT_DIRECTIONS[i].y*.45});
  }
  const routes=[];
  for(const dir of candidates){
    const route=botRoute(dir,scene,goal,burst);routes.push(route);
    if(!best||route.cost<best.cost)best=route;
  }
  const skill=rules.botSkill||'Normal';
  if(!burst&&skill!=='Normal'){
    const finalists=routes.sort((a,b)=>a.cost-b.cost).slice(0,skill==='Experto'?5:2);
    for(const first of finalists)for(const angle of (skill==='Experto'?[-1.8,-.9,.9,1.8]:[-1.2,1.2])){
      const a=Math.atan2(first.dir.y,first.dir.x)+angle;
      const route=botRoute(first.dir,scene,goal,0,{x:Math.cos(a),y:Math.sin(a)});
      routes.push(route);if(route.cost<best.cost)best=route;
    }
  }
  if(rules.botVision&&!burst)state.rush.routes=routes.sort((a,b)=>a.cost-b.cost).slice(0,4);
  return best;
}
function botUse(id,aim){
  const r=state.rush,i=state.slots.indexOf(id);
  if(i<0||!state.specialCards[id].charges)return false;
  const old=r.intent.aim;r.intent.aim=aim;useSlot(i);r.intent.aim=old;
  r.nextSpecial=state.time+.25;
  return true;
}
function rushBotControl(){
  const r=state.rush,p=state.player;
  if(r.intent && state.time<r.nextPlan)return r.intent;
  r.nextPlan=state.time+({Normal:.075,Avanzado:.065,Experto:.05}[rules.botSkill]||.065);
  const target=botTarget(),scene=botScene(),goal=botGoal(target);
  const route=bestBotRoute(scene,goal,0);
  const aim=target?{x:target.x,y:target.y}:{x:p.x+1,y:p.y};
  if(target){
    const prev=r.tracked,elapsed=state.time-(prev?.time??state.time);
    if(prev?.target===target && elapsed>0){
      const lead=Math.min(.65,botDistance(p,target)/900);
      aim.x+=clamp((target.x-prev.x)/elapsed,-450,450)*lead;
      aim.y+=clamp((target.y-prev.y)/elapsed,-450,450)*lead;
    }
    r.tracked={target,x:target.x,y:target.y,time:state.time};
  }
  r.intent={...route.dir,aim,fire:!!target && (!p.laserCount||state.laserChargeTime<.85)};
  // At high speed the stick magnitude matters: brush the target while moving.
  if(target && p.frameTime>1 && !state.arena?.chase){
    const strike=polarPoint(target,target.size*.24,state.time*5);
    const dx=strike.x-p.x,dy=strike.y-p.y,k=Math.max(75,Math.hypot(dx,dy));
    r.intent.x=dx/k;r.intent.y=dy/k;
  }
  const still=botRoute({x:0,y:0},scene,goal,0);
  r.action=state.arena?.chase?'CRUZANDO EL CORREDOR':still.risk>45?'ESQUIVANDO':goal.label||(target?'ATACANDO':'PREPARANDO');
  if(state.time<r.nextSpecial || state.stopUntil>state.time)return r.intent;
  if(state.arena?.chase&&!state.slots.includes('dash')&&state.specialCards.dash.totalCards)botEquip();
  if(state.halfHearts<state.maxHalfHearts || (state.bossActive && !state.blueHealth)){
    if(botUse('activeHeal',p))return r.intent;
  }
  const wallClose=state.arena?.chase && p.x-state.arena.x<245;
  if(p.invuln<.12 && !(p.plasma?.end>state.time+.2) && p.dashTimer<=0 && (route.imminent>33 || wallClose)){
    const escape=bestBotRoute(scene,goal,295),dest={x:p.x+escape.dir.x*295,y:p.y+escape.dir.y*295};
    if((wallClose&&escape.dir.x>.5 || escape.risk<route.risk*.8) &&
      (botUse('dash',dest)||botUse('blink',dest))){r.action='EVADIENDO';return r.intent;}
    for(const id of ['timeBreak','frames','plasma','anchor'])if(botUse(id,p))return r.intent;
  }
  if(target && scene.moving.length>=8 && still.risk>25 && (botUse('reverse',aim)||botUse('nullArc',aim)))return r.intent;
  if(target && botDistance(target,p)<1100)for(const id of ['omega','resNet','starTide','kame','crush','army','needles','thunderRain']){
    if(botUse(id,aim))break;
  }
  return r.intent;
}
