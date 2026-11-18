'use strict';
let motion=[],receivedAt=0,netPingMs=null;
let lastPositions=new Map();
function viewLead(now){
  if(!receivedAt)return 0;
  return clamp(((netPingMs||0)*.5+now-receivedAt)/1000,0,.10);
}
function prepareMotion(old,next,now){
  reconcilePlayer(old,next);
  motion=[]; receivedAt=now;
  const positions=new Map();
  function track(group,e,index){
    const id=group+':'+(e.netId??index);
    const prior=lastPositions.get(id);
    positions.set(id,{x:e.x,y:e.y,time:next.time});
    const dt=prior ? next.time-prior.time : 0;
    const dx=prior?e.x-prior.x:0,dy=prior?e.y-prior.y:0;
    if(dt<0 || dt>.2 || Math.hypot(dx,dy)>80)return;
    let vx=e.vx,vy=e.vy;
    if(group==='ball' && e.state!=='flying'){vx=undefined;vy=undefined;}
    if(!Number.isFinite(vx)||!Number.isFinite(vy)){
      if(dt<=0)return;
      vx=dx/dt;vy=dy/dt;
    }
    motion.push({e,x:e.x,y:e.y,vx,vy});
  }
  for(const group of ['peers','enemies','bullets','enemyBullets','enemyDarts','orbs','potions']){
    (next[group]||[]).forEach((e,i)=>track(group,e,i));
  }
  if(next.boss){
    track('boss',next.boss,0);
    next.boss.balls.forEach((e,i)=>track('ball',e,i));
  }
  lastPositions=positions;
  previewLasers=previewLasers.filter(l=>l.commandId>(next.ack ?? 0));
  previewShots=previewShots.filter(b=>b.volley>(next.ack ?? next.player.volley ?? 0));
}
function animateMotion(now){
  const dt=viewLead(now);
  for(const {e,x,y,vx,vy} of motion){
    const tx=x+vx*dt,ty=y+vy*dt;
    if(!pointInWall(tx,ty,currentWalls)){e.x=tx;e.y=ty;}
  }
}

let inputHistory=[], correction={x:0,y:0}, previewShots=[], unconfirmedTime=0;
let previewLasers=[],localCharge=0;
let commandNumber=0, previewCooldown=0, pendingTap=false, previewTap=false;
function resetPresentation(){
  previewLasers=[];localCharge=0;netPingMs=null;lastPositions.clear();motion=[]; receivedAt=0; inputHistory=[]; correction={x:0,y:0};
  previewShots=[]; commandNumber=0; previewCooldown=0; pendingTap=false; previewTap=false;
  unconfirmedTime=0;
}
function clampToArena(p,arena){
  if(!arena)return;
  const h=p.size/2;
  p.x=clamp(p.x,arena.x+h,arena.x+arena.w-h);
  p.y=clamp(p.y,arena.y+h,arena.y+arena.h-h);
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
  cam.x+=(p.x+p.vx*.16-cam.x)*Math.min(1,10*dt);
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
  if(previewShots.length)enemyGrid.rebuild(state.enemies);
  for(const b of previewShots){
    advanceBullet(b,p,dt);
    const wall=currentWalls.find(w=>aabbOverlapCircle(b.x,b.y,b.r,w));
    if(!wall && !b.dupli && !b.bounces){
      const travel=Math.hypot(b.x-b.prevX,b.y-b.prevY);
      const targets=enemyGrid.query(b.x,b.y,45+b.r+travel);
      if(state.boss){
        targets.push(state.boss,...state.boss.balls.filter(ball=>ball.state!=='attached'));
      }
      if(targets.some(e=>bulletEntry(b,e,(e.size?e.size/2:e.r)+b.r)!==Infinity))b.life=0;
    }
    if(wall){
      if(b.bounces || b.dupli){reflectBulletOffWall(b,wall);if(b.bounces)b.bounces--;}
      else b.life=0;
    }
  }
  previewShots=previewShots.filter(b=>b.life>0);
}
