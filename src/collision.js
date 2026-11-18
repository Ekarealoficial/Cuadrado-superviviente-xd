'use strict';
/* =============== COLISIONES =============== */
function aabbOverlapCircle(x, y, r, w) {
  const nx = clamp(x, w.x, w.x + w.w), ny = clamp(y, w.y, w.y + w.h);
  const dx = x - nx, dy = y - ny;
  return dx*dx + dy*dy < r*r;
}
function aabbOverlapBox(x, y, size, w) {
  return x - size/2 < w.x + w.w && x + size/2 > w.x && y - size/2 < w.y + w.h && y + size/2 > w.y;
}
function pointInWall(x, y, walls) {
  for (const w of walls) if (x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h) return true;
  return false;
}
function moveWithWalls(entity, dx, dy, walls) {
  let blockedX = false, blockedY = false;
  entity.x += dx;
  for (const w of walls) {
    if (aabbOverlapBox(entity.x, entity.y, entity.size, w)) {
      if (dx > 0) entity.x = w.x - entity.size/2;
      else if (dx < 0) entity.x = w.x + w.w + entity.size/2;
      blockedX = true;
    }
  }
  entity.y += dy;
  for (const w of walls) {
    if (aabbOverlapBox(entity.x, entity.y, entity.size, w)) {
      if (dy > 0) entity.y = w.y - entity.size/2;
      else if (dy < 0) entity.y = w.y + w.h + entity.size/2;
      blockedY = true;
    }
  }
  return { blockedX, blockedY };
}
function laserHits(x, y, radius, lx, ly, angle, width, range) {
  const dx = x - lx, dy = y - ly;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const proj = dx * cos + dy * sin;
  if (proj < 0 || proj > range) return false;
  const perp = -dx * sin + dy * cos;
  return Math.abs(perp) < width / 2 + radius;
}
function getNearestTarget(x, y) {
  let nearest = null, nearestD2 = Infinity;
  for (const e of state.enemies) {
    const dd = (e.x - x)**2 + (e.y - y)**2;
    if (dd < nearestD2) { nearestD2 = dd; nearest = e; }
  }
  for (const b of livingBosses()) {
    const dd = (b.x - x)**2 + (b.y - y)**2;
    if (dd < nearestD2) { nearestD2 = dd; nearest = b; }
    for (const ball of b.balls) {
      if (ball.state === 'attached') continue;
      const dd2 = (ball.x - x)**2 + (ball.y - y)**2;
      if (dd2 < nearestD2) { nearestD2 = dd2; nearest = ball; }
    }
  }
  return nearest;
}
function isBossOrBall(obj) {
  return Boolean(bossFor(obj));
}


// Fraction of the projectile step at first contact. Checking only the endpoint
// misses grazing hits and targets narrower than a 30 Hz projectile step.
function bulletEntry(b,target,radius){
  const x=b.prevX??b.x,y=b.prevY??b.y,dx=b.x-x,dy=b.y-y;
  const ox=x-target.x,oy=y-target.y,length2=dx*dx+dy*dy;
  const c=ox*ox+oy*oy-radius*radius;
  if(c<=0)return 0;
  if(!length2)return Infinity;
  const dot=ox*dx+oy*dy,disc=dot*dot-length2*c;
  if(dot>=0 || disc<0)return Infinity;
  const t=(-dot-Math.sqrt(disc))/length2;
  return t<=1?t:Infinity;
}
const combatHistory=new WeakMap();
function rememberPosition(e,time){
  const points=combatHistory.get(e)||[];
  points.push({x:e.x,y:e.y,time});
  if(points.length>8)points.shift();
  combatHistory.set(e,points);
}
function combatPosition(e,delay){
  if(!delay)return e;
  const points=combatHistory.get(e);
  if(!points?.length)return e;
  const time=state.time-delay;
  let end=e,endTime=state.time;
  for(let i=points.length-1;i>=0;i--){
    const start=points[i];
    if(start.time<=time){
      if(Math.hypot(end.x-start.x,end.y-start.y)>80)return e;
      const t=clamp((time-start.time)/(endTime-start.time||1),0,1);
      return {x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t};
    }
    end=start;endTime=start.time;
  }
  return end;
}

function visibleContact(entity,p,radius){
  const pos=combatPosition(entity,state.viewDelay);
  return (p.x-pos.x)**2+(p.y-pos.y)**2<radius*radius;
}
