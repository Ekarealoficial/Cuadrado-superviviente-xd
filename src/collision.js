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
  if (state.boss) {
    const b = state.boss;
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
  if (!state.boss) return false;
  if (obj === state.boss) return true;
  return state.boss.balls.indexOf(obj) !== -1;
}

