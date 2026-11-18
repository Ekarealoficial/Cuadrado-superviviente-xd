'use strict';
let motion=[], receivedAt=0, blendMs=50;
function prepareMotion(old,next,now){
  blendMs=receivedAt ? clamp(now-receivedAt,24,150) : 50;
  receivedAt=now; motion=[];
  function track(a,b){
    if(!a || !b || Math.hypot(a.x-b.x,a.y-b.y)>220)return;
    motion.push({body:b,x:a.x,y:a.y,toX:b.x,toY:b.y});
  }
  reconcilePlayer(old,next,now);
  track(old.boss,next.boss);
  for(const group of ['peers','enemies','bullets','enemyBullets','enemyDarts','drones','darts','shields','orbs','potions']){
    const before=old[group]||[],after=next[group]||[];
    const ids=new Map(before.filter(e=>e.netId!=null).map(e=>[e.netId,e]));
    after.forEach((e,i)=>{
      let a=e.netId!=null?ids.get(e.netId):before[i];
      if (!a && group==='bullets' && e.shooterId===next.selfId && e.volley)
        a=previewShots.find(shot=>shot.volley===e.volley && shot.lane===e.lane);
      if (group==='bullets' && e.volley && e.shooterId===next.selfId) {
        const lead=clamp((now-(next.inputTime ?? now)+blendMs)/1000,0,.18);
        const x=e.x+lead*e.vx,y=e.y+lead*e.vy;
        if (!pointInWall(x,y,currentWalls)) { e.x=x; e.y=y; }
      }
      if(a && a.type===e.type && a.name===e.name && (e.netId!=null || before.length===after.length))track(a,e);
    });
  }
  previewShots=previewShots.filter(b=>b.volley>(next.player.volley||0));
}
function animateMotion(now){
  const t=clamp((now-receivedAt)/blendMs,0,1);
  for(const m of motion){
    m.body.x=m.x+(m.toX-m.x)*t;
    m.body.y=m.y+(m.toY-m.y)*t;
  }
}

let inputHistory=[], correction={x:0,y:0}, previewShots=[];
let previewVolley=0, previewCooldown=0, pendingTap=false, previewTap=false;
function resetPresentation(){
  motion=[]; receivedAt=0; inputHistory=[]; correction={x:0,y:0};
  previewShots=[]; previewVolley=0; previewCooldown=0; pendingTap=false; previewTap=false;
}
function clampToArena(p,arena){
  if(!arena)return;
  const h=p.size/2;
  p.x=clamp(p.x,arena.x+h,arena.x+arena.w-h);
  p.y=clamp(p.y,arena.y+h,arena.y+arena.h-h);
}
function reconcilePlayer(old,next,now){
  if (!previewShots.length) previewVolley=next.player.volley||0;
  else previewVolley=Math.max(previewVolley,next.player.volley||0);
  const p=next.player, previous=old.player;
  if(next.over || Math.hypot(previous.x-p.x,previous.y-p.y)>240){
    correction={x:0,y:0}; inputHistory=[]; previewShots=[];
    return;
  }
  // Replay movement after the server's last simulated input on the client's clock.
  const since=clamp(next.inputTime ?? now,now-750,now);
  const replay={...p};
  for(const frame of inputHistory){
    const dt=Math.min(frame.dt,(frame.end-since)/1000);
    if(dt<=0)continue;
    movePlayer(replay,dt,frame.x,frame.y,currentWalls);
    clampToArena(replay,next.arena);
  }
  correction={x:replay.x-previous.x,y:replay.y-previous.y};
  Object.assign(p,{x:previous.x,y:previous.y,vx:replay.vx,vy:replay.vy});
  next.cam.x=old.cam.x; next.cam.y=old.cam.y;
}
function previewFire(p){
  const volley=++previewVolley;
  function line(angle,speed,lane){
    if(previewShots.length>=MAX_BULLETS)return;
    const dx=Math.cos(angle),dy=Math.sin(angle),off=p.size/2+6;
    previewShots.push({x:p.x+dx*off,y:p.y+dy*off,vx:dx*speed,vy:dy*speed,
      r:4+p.sizeLevel*1.2,venom:p.venom,bounces:p.bounces,volley,lane,life:.75});
  }
  for(let i=p.laserCount?1:0;i<Math.min(p.shots,MAX_BULLETS);i++)
    line(p.angle+(i-(p.shots-1)/2)*.12,900,i);
  for(let i=0;i<Math.min(p.backShots,MAX_BULLETS);i++)
    line(p.angle+Math.PI+(i-(p.backShots-1)/2)*.12,810,-1-i);
  Sfx.play('shoot',30);
}
function predictLocalFrame(now,dt){
  if(state.over)return;
  const p=state.player,cam=state.cam,dir=movementDirection();
  inputHistory.push({...dir,end:now,dt});
  while(inputHistory.length && inputHistory[0].end<now-800)inputHistory.shift();
  const k=1-Math.exp(-12*dt);
  moveWithWalls(p,correction.x*k,correction.y*k,currentWalls);
  correction.x*=1-k; correction.y*=1-k;
  movePlayer(p,dt,dir.x,dir.y,currentWalls);
  clampToArena(p,state.arena);
  cam.x+=(p.x+p.vx*.16-cam.x)*Math.min(1,10*dt);
  cam.y+=(p.y+p.vy*.16-cam.y)*Math.min(1,10*dt);
  const aim=getWorldMouse();
  p.angle=Math.atan2(aim.y-p.y,aim.x-p.x);
  previewCooldown-=dt;
  if(!state.inventoryOpen && !state.cardChoices && (mouse.down || previewTap) &&
     (!p.laserCount || p.shots>1) && previewCooldown<=0){
    previewFire(p);
    previewCooldown=Math.ceil(p.fireCdBase*30)/30;
  }
  previewTap=false;
  for(const b of previewShots){
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt;
  }
  previewShots=previewShots.filter(b=>b.life>0 && !pointInWall(b.x,b.y,currentWalls));
}
