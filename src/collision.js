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
  if(entity.training)return {blockedX:!!dx,blockedY:!!dy};
  const h=entity.size/2,x=entity.x,y=entity.y;
  let endX=x+dx,endY=y+dy;
  for(const w of walls){
    if(y+h<=w.y||y-h>=w.y+w.h)continue;
    if(dx>0 && x<=w.x-h && endX>w.x-h)endX=w.x-h;
    else if(dx<0 && x>=w.x+w.w+h && endX<w.x+w.w+h)endX=w.x+w.w+h;
  }
  for(const w of walls){
    if(endX+h<=w.x||endX-h>=w.x+w.w)continue;
    if(dy>0 && y<=w.y-h && endY>w.y-h)endY=w.y-h;
    else if(dy<0 && y>=w.y+w.h+h && endY<w.y+w.h+h)endY=w.y+w.h+h;
  }
  entity.x=endX;entity.y=endY;
  const blockedX=endX!==x+dx,blockedY=endY!==y+dy;
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
function getNearestTarget(x, y, bosses=bossTargets()) {
  let nearest = null, nearestD2 = Infinity;
  for (const e of state.enemies) {
    const dd = (e.x - x)**2 + (e.y - y)**2;
    if (dd < nearestD2) { nearestD2 = dd; nearest = e; }
  }
  for (const b of bosses) {
    const dd = (b.x - x)**2 + (b.y - y)**2;
    if (dd < nearestD2) { nearestD2 = dd; nearest = b; }
    for (const ball of b.balls||[]) {
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
// Move into the target's frame of reference for this simulation step.
function sweptTargetEntry(shot,start,end,radius){
  if(start===end || Math.hypot(end.x-start.x,end.y-start.y)>80)return bulletEntry(shot,end,radius);
  return bulletEntry({prevX:(shot.prevX??shot.x)+end.x-start.x,prevY:(shot.prevY??shot.y)+end.y-start.y,x:shot.x,y:shot.y},end,radius);
}
const combatHistory=new WeakMap();
function rememberPosition(e,time){
  const points=combatHistory.get(e)||[];
  points.push({x:e.x,y:e.y,time});
  if(points.length>14)points.shift();
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
    if(Math.hypot(end.x-start.x,end.y-start.y)>80)return e;
    if(start.time<=time){
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

function settleResizedPlayer(p){
  if(state.arena || p.size>Math.max(W,H))return;
  const h=p.size/2,walls=getVisibleChunks(state.cam);
  // Try the nearest face first. A second wall can rule out a candidate.
  if(!walls.some(w=>aabbOverlapBox(p.x,p.y,p.size,w)))return;
  const candidates=[];
  for(const w of walls){
    candidates.push({x:w.x-h,y:p.y},{x:w.x+w.w+h,y:p.y},{x:p.x,y:w.y-h},{x:p.x,y:w.y+w.h+h});
  }
  candidates.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));
  const clear=candidates.find(q=>!walls.some(w=>aabbOverlapBox(q.x,q.y,p.size,w)));
  if(clear)Object.assign(p,clear);
}
