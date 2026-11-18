'use strict';
let flight=[],motion=[], receivedAt=0, blendMs=50;
function prepareMotion(old,next,now){
  blendMs=receivedAt ? clamp(now-receivedAt,24,150) : 50;
  receivedAt=now; motion=[]; flight=[];
  function track(a,b){
    if(!a || !b || Math.hypot(a.x-b.x,a.y-b.y)>220)return;
    motion.push({body:b,x:a.x,y:a.y,toX:b.x,toY:b.y});
  }
  reconcilePlayer(old,next);
  track(old.boss,next.boss);
  for(const group of ['peers','enemies','bullets','enemyBullets','enemyDarts','drones','darts','shields','orbs','potions']){
    const before=old[group]||[],after=next[group]||[];
    const ids=new Map(before.filter(e=>e.netId!=null).map(e=>[e.netId,e]));
    after.forEach((e,i)=>{
      let a=e.netId!=null?ids.get(e.netId):before[i];
      if (!a && group==='bullets' && e.shooterId===next.selfId && e.volley)
        a=previewShots.find(shot=>shot.volley===e.volley && shot.lane===e.lane);
      if (group==='bullets' && e.volley && e.shooterId===next.selfId) {
        const lead=clamp(unconfirmedTime,0,.4);
        const x=e.x+lead*e.vx,y=e.y+lead*e.vy;
        if (!pointInWall(x,y,currentWalls)) { e.x=x; e.y=y; }
        const dx=a ? a.x-e.x : 0,dy=a ? a.y-e.y : 0;
        flight.push({body:e,x:e.x,y:e.y,dx,dy});
        return;
      }
      if(a && a.type===e.type && a.name===e.name && (e.netId!=null || before.length===after.length))track(a,e);
    });
  }
  previewLasers=previewLasers.filter(l=>l.commandId>(next.ack ?? 0));
  previewShots=previewShots.filter(b=>b.volley>(next.ack ?? next.player.volley ?? 0));
}
function animateMotion(now){
  const age=clamp((now-receivedAt)/1000,0,.15);
  for(const f of flight){
    const ease=Math.exp(-18*age), b=f.body;
    const x=f.x+b.vx*age+f.dx*ease,y=f.y+b.vy*age+f.dy*ease;
    if(!pointInWall(x,y,currentWalls)){b.x=x;b.y=y;}
  }
  const t=clamp((now-receivedAt)/blendMs,0,1);
  for(const m of motion){
    m.body.x=m.x+(m.toX-m.x)*t;
    m.body.y=m.y+(m.toY-m.y)*t;
  }
}

let inputHistory=[], correction={x:0,y:0}, previewShots=[], unconfirmedTime=0;
let previewLasers=[],localCharge=0;
let commandNumber=0, previewCooldown=0, pendingTap=false, previewTap=false;
function resetPresentation(){
  previewLasers=[];localCharge=0;flight=[];motion=[]; receivedAt=0; inputHistory=[]; correction={x:0,y:0};
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
  inputHistory.push([seq,dt,dir.x,dir.y,p.angle,fire]);
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
  for(const b of previewShots){
    advanceBullet(b,p,dt);
    const wall=currentWalls.find(w=>aabbOverlapCircle(b.x,b.y,b.r,w));
    if(wall){
      if(b.bounces || b.dupli){reflectBulletOffWall(b,wall);if(b.bounces)b.bounces--;}
      else b.life=0;
    }
  }
  previewShots=previewShots.filter(b=>b.life>0);
}
