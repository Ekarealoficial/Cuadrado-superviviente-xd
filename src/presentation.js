'use strict';
let motion=[], receivedAt=0, blendMs=50;
function prepareMotion(old,next,now){
  blendMs=receivedAt ? clamp(now-receivedAt,24,150) : 50;
  receivedAt=now; motion=[];
  function track(a,b){
    if(!a || !b || Math.hypot(a.x-b.x,a.y-b.y)>220)return;
    motion.push({body:b,x:a.x,y:a.y,toX:b.x,toY:b.y});
  }
  track(old.player,next.player);track(old.cam,next.cam);track(old.boss,next.boss);
  for(const group of ['peers','enemies','bullets','enemyBullets','enemyDarts','drones','darts','shields','orbs','potions']){
    const before=old[group]||[],after=next[group]||[];
    const ids=new Map(before.filter(e=>e.netId!=null).map(e=>[e.netId,e]));
    after.forEach((e,i)=>{
      const a=e.netId!=null?ids.get(e.netId):before[i];
      if(a && a.type===e.type && a.name===e.name && (e.netId!=null || before.length===after.length))track(a,e);
    });
  }
}
function animateMotion(now){
  const t=clamp((now-receivedAt)/blendMs,0,1);
  for(const m of motion){
    m.body.x=m.x+(m.toX-m.x)*t;
    m.body.y=m.y+(m.toY-m.y)*t;
  }
}
