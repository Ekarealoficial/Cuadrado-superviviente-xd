'use strict';
let motion=[],patternClocks=[],receivedAt=0,netPingMs=null;
let lastPositions=new Map();
function viewLead(now){
  if(!receivedAt)return 0;
  return clamp(((netPingMs||0)*.5+now-receivedAt)/1000,0,.10);
}
function prepareMotion(old,next,now){
  const confirmedShots=reconcileContacts(next,now);
  for(const preview of previewShots){
    const authoritative=confirmedShots.get(shotKey(preview,next.selfId));
    if(authoritative&&!preview.occluded&&!authoritative.blendFrom){authoritative.blendFrom=point(preview);authoritative.blendAt=now;}
  }
  reconcilePlayer(old,next);
  motion=[];patternClocks=[];receivedAt=now;
  const positions=new Map();
  function track(group,e,index){
    if(next.stopUntil>next.time && group!=='peers')return;
    const id=group+':'+(e.netId??index);
    const prior=lastPositions.get(id);
    positions.set(id,{x:e.x,y:e.y,time:next.time});
    const dt=prior ? next.time-prior.time : 0;
    const dx=prior?e.x-prior.x:0,dy=prior?e.y-prior.y:0;
    if(dt<0 || dt>.45 || (group!=='bullets' && Math.hypot(dx,dy)>Math.max(80,1800*dt)))return;
    let vx=e.vx,vy=e.vy;
    if(group==='enemies'&&dt>0){vx=dx/dt;vy=dy/dt;}
    if(group==='bullets' && !e.blendFrom && prior?.shot?.blendAt+100>now){e.blendFrom=prior.shot.blendFrom;e.blendAt=prior.shot.blendAt;}
    if(group==='bullets'&&prior?.shot?.rejectedUntil>now){e.rejectedUntil=prior.shot.rejectedUntil;e.blendFrom=prior.shot.blendFrom;e.blendAt=prior.shot.blendAt;}
    if(group==='bullets')positions.get(id).shot=e;
    if(group.endsWith('ball') && e.state!=='flying'){vx=undefined;vy=undefined;}
    if(!Number.isFinite(vx)||!Number.isFinite(vy)){
      if(dt<=0)return;
      vx=dx/dt;vy=dy/dt;
    }
    motion.push({e,x:e.x,y:e.y,vx,vy,shot:group==='bullets'});
  }
  for(const group of ['peers','enemies','bullets','enemyBullets','enemyDarts','orbs','potions']){
    (next[group]||[]).forEach((e,i)=>track(group,e,i));
  }
  for(const b of [next.boss,...(next.extraBosses||[])].filter(Boolean)){
    const key='boss'+b.id;
    if(next.stopUntil<=next.time&&PATTERN_BOSSES[b.kind]&&!b.waitFinal){
      patternClocks.push({b,clock:b.clock,age:b.age});
      for(const l of b.layers||[])patternClocks.push({b:l,clock:b.clock,age:l.age,secondary:true});
    }
    for(const part of b.parts||[])track(key+'component',part,part.index);
    for(const piece of b.pieces||[])for(const seg of piece.parts)track(key+'segment',seg,seg.segmentId);
    track(key,b,0);b.balls.forEach((e,i)=>track(key+'ball',e,i));
    for(const [i,q] of (b.planets||[]).entries())track(key+'planet',q,i);
  }
  lastPositions=positions;
  previewLasers=previewLasers.filter(l=>l.commandId>(next.ack ?? 0));
  previewShots=previewShots.filter(b=>!confirmedShots.has(shotKey(b,next.selfId))&&b.volley>(next.ack??next.player.volley??0));
}
function animateMotion(now){
  const dt=viewLead(now);
  for(const {e,x,y,vx,vy,shot} of motion){
    const tx=x+vx*dt,ty=y+vy*dt;
    if(!pointInWall(tx,ty,currentWalls)){
      if(shot&&e.shooterId===state.selfId&&!e.occluded)predictContact(e,tx,ty,now);
      const blend=e.blendFrom?clamp((now-e.blendAt)/100,0,1):1;
      e.x=blend===1?tx:e.blendFrom.x+(tx-e.blendFrom.x)*blend;
      e.y=blend===1?ty:e.blendFrom.y+(ty-e.blendFrom.y)*blend;
    }
  }
  for(const {b,age,clock,secondary} of patternClocks){
    b.age=age+dt;b.clock=clock+dt;if(secondary)continue;
    for(const e of b.events||[])if(b.age>=e.on&&b.age<=e.end){
      const u=clamp((b.age-e.on)/(e.end-e.on),0,1);
      if(e.kind==='rail')Object.assign(b,railPoint(e,u));
      if(e.kind==='dash'){const body=e.index<0?b:b.parts[e.index];Object.assign(body,mixPoint(e.origin,e.to,u));}
    }
  }
}

let inputHistory=[], correction={x:0,y:0}, previewShots=[], unconfirmedTime=0;
let previewLasers=[],localCharge=0;
let commandNumber=0, previewCooldown=0, pendingTap=false, previewTap=false;
function resetPresentation(){
  earlyContacts.clear();confirmedDamage.length=0;lastProvisional.clear();visualFrame=-1;pendingContacts.clear();impactLights.length=0;seenImpact=0;
  previewLasers=[];localCharge=0;netPingMs=null;lastPositions.clear();motion=[];patternClocks=[]; receivedAt=0; inputHistory=[]; correction={x:0,y:0};
  previewShots=[]; commandNumber=0; previewCooldown=0; pendingTap=false; previewTap=false;
  unconfirmedTime=0;
}
function clampToArena(p,arena){
  fitPlayerInArena(p,arena);
}
function reconcilePlayer(old,next){
  const p=next.player, previous=old.player;
  inputHistory=inputHistory.filter(c=>c[0]>(next.ack ?? 0));
  unconfirmedTime=inputHistory.reduce((sum,c)=>sum+c[1],0);
  if(next.over){correction={x:0,y:0};previewShots=[];return;}
  // The server processed these exact frame durations. Replay only what it hasn't consumed.
  const replay={...p};
  let cd=p.fireCd;
  localCharge=next.laserChargeTime;
  for(const c of inputHistory){
    movePlayer(replay,c[1],c[2],c[3],currentWalls);
    clampToArena(replay,next.arena);
    advancePredictedDash(replay,c[1]);
    localCharge=p.laserCount && c[5] ? localCharge+c[1] : 0;
    cd-=c[1];
    if(c[5] && cd<=0 && (!p.laserCount || p.shots>1)) cd=p.fireCdBase;
  }
  previewCooldown=cd;
  p.dashTimer=replay.dashTimer;
  if(Math.hypot(previous.x-replay.x,previous.y-replay.y)>180){
    Object.assign(p,{x:replay.x,y:replay.y,vx:replay.vx,vy:replay.vy});
    correction={x:0,y:0};return;
  }
  correction={x:replay.x-previous.x,y:replay.y-previous.y};
  Object.assign(p,{x:previous.x,y:previous.y,vx:replay.vx,vy:replay.vy});
  next.cam.x=old.cam.x; next.cam.y=old.cam.y;
}
function advancePredictedDash(p,dt){
  if(p.dashTimer>0 && (p.dashTimer-=dt)<=0){p.dashTimer=0;p.vx=0;p.vy=0;}
}
function predictLocalFrame(now,dt){
  if(state.over || dt<=0)return;
  const p=state.player,cam=state.cam,dir=movementDirection();

  const k=1-Math.exp(-12*dt);
  moveWithWalls(p,correction.x*k,correction.y*k,currentWalls);
  correction.x*=1-k; correction.y*=1-k;
  movePlayer(p,dt,dir.x,dir.y,currentWalls);
  advancePredictedDash(p,dt);
  clampToArena(p,state.arena);
  cam.x+=(chaseCamera(p)-cam.x)*Math.min(1,10*dt);
  cam.y+=(p.y+p.vy*.16-cam.y)*Math.min(1,10*dt);
  const aim=getWorldMouse();
  p.angle=Math.atan2(aim.y-p.y,aim.x-p.x);
  const fire=!!(!state.inventoryOpen && !state.cardChoices && (mouse.down || previewTap));
  const seq=++commandNumber;
  inputHistory.push([seq,dt,dir.x,dir.y,p.angle,fire,state.time+viewLead(now)]);
  if(inputHistory.length>240)inputHistory.shift();
  if(p.laserCount && fire)localCharge+=dt;
  else {
    if(localCharge>=.15)fireLasers(localCharge,seq,previewLasers);
    localCharge=0;
  }
  state.laserCharging=localCharge>0;
  state.laserChargeTime=localCharge;
  for(const l of previewLasers)l.sweep+=l.sweepSpeed*dt;
  previewLasers=previewLasers.filter(l=>l.sweep<TAU);
  previewCooldown-=dt;
  if(fire && (!p.laserCount || p.shots>1) && previewCooldown<=0){
    shoot(p.shots-(p.laserCount?1:0),seq,previewShots);
    previewCooldown=p.fireCdBase;
  }
  previewTap=false;
  if(state.stopUntil>state.time)return;

  for(const b of previewShots){
    advanceBullet(b,p,dt);
    const wall=currentWalls.find(w=>aabbOverlapCircle(b.x,b.y,b.r,w));
    if(!wall&&!b.occluded){
      const end=point(b);b.x=b.prevX;b.y=b.prevY;predictContact(b,end.x,end.y,now);Object.assign(b,end);
    }
    if(wall){
      if(b.bounces || b.dupli){reflectBulletOffWall(b,wall);if(b.bounces)b.bounces--;}
      else b.life=0;
    }
  }
  previewShots=previewShots.filter(b=>b.life>0);
}
