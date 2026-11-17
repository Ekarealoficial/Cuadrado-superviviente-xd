'use strict';
/* =============== SLOTS =============== */
function useSlot(idx) {
  const cardId = state.slots[idx];
  if (!cardId) return;
  if (cardId === 'blink') {
    if (tryBlink()) Sfx.play('blink');
  } else if (cardId === 'dash') {
    if (tryDash()) Sfx.play('dashplayer');
  } else if (cardId === 'thunderRain') {
    if (tryThunderRain()) Sfx.play('thunderrain');
  }
}

function tryBlink() {
  const sc = state.specialCards.blink;
  if (sc.charges <= 0) return false;
  const target = getWorldMouse();
  let tx = target.x, ty = target.y;
  const radius = state.player.size / 2;
  const valid = (x, y) => {
    const a = state.arena;
    if (a && (x-radius<a.x || y-radius<a.y || x+radius>a.x+a.w || y+radius>a.y+a.h)) return false;
    const walls = [];
    for (let cy=Math.floor((y-radius)/CHUNK_SIZE); cy<=Math.floor((y+radius)/CHUNK_SIZE); cy++)
      for (let cx=Math.floor((x-radius)/CHUNK_SIZE); cx<=Math.floor((x+radius)/CHUNK_SIZE); cx++) walls.push(...getChunk(cx,cy).walls);
    return !walls.some(w => aabbOverlapBox(x,y,state.player.size,w));
  };
  if (state.arena) {
    tx = clamp(tx, state.arena.x+radius, state.arena.x+state.arena.w-radius);
    ty = clamp(ty, state.arena.y+radius, state.arena.y+state.arena.h-radius);
  }
  if (!valid(tx, ty)) {
    let found = false;
    for (let r = 20; r <= 300 && !found; r += 20) {
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * TAU;
        const nx = tx + Math.cos(ang) * r;
        const ny = ty + Math.sin(ang) * r;
        if (valid(nx, ny)) {
          tx = nx; ty = ny; found = true; break;
        }
      }
    }
    if (!found) return false;
  }
  if (state.arena) {
    tx = clamp(tx, state.arena.x + state.player.size/2, state.arena.x + state.arena.w - state.player.size/2);
    ty = clamp(ty, state.arena.y + state.player.size/2, state.arena.y + state.arena.h - state.player.size/2);
  }

  const oldX = state.player.x, oldY = state.player.y;

  // Afterimage trail (línea de partículas)
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ix = oldX + (tx - oldX) * t;
    const iy = oldY + (ty - oldY) * t;
    spawnParticles(ix, iy, 1, '#a855f7', 0.8);
    state.particles.push({
      x: ix, y: iy,
      vx: 0, vy: 0,
      life: 0.5, maxLife: 0.5,
      size: 6, color: '#c4b5fd'
    });
  }

  // Shockwave en origen
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    state.particles.push({
      x: oldX, y: oldY,
      vx: Math.cos(a) * 350,
      vy: Math.sin(a) * 350,
      life: 0.6, maxLife: 0.6,
      size: 5, color: '#a855f7'
    });
  }
  // Shockwave en destino
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU + 0.2;
    state.particles.push({
      x: tx, y: ty,
      vx: Math.cos(a) * 350,
      vy: Math.sin(a) * 350,
      life: 0.6, maxLife: 0.6,
      size: 5, color: '#e9d5ff'
    });
  }
  // Anillos de distorsión (partículas grandes que se expanden)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    state.particles.push({
      x: oldX, y: oldY,
      vx: Math.cos(a) * 200,
      vy: Math.sin(a) * 200,
      life: 0.7, maxLife: 0.7,
      size: 10, color: '#a855f7'
    });
    state.particles.push({
      x: tx, y: ty,
      vx: Math.cos(a) * 200,
      vy: Math.sin(a) * 200,
      life: 0.7, maxLife: 0.7,
      size: 10, color: '#e9d5ff'
    });
  }

  // Mover
  state.player.x = tx;
  state.player.y = ty;
  state.cam.x = tx;
  state.cam.y = ty;
  state.cam.zoom = Math.min(state.cam.zoom, 0.85);
  state.flash = 0.45;
  state.flashRGB = '168,85,247';
  state.shake = Math.max(state.shake, 12);

  sc.charges--;
  if (sc.cooldown <= 0) sc.cooldown = sc.cooldownMax;
  return true;
}

function tryDash() {
  const sc = state.specialCards.dash;
  const p = state.player;

  if (p.dashTimer > 0) {
    // Encadenar
    if (p.pendingDashes < sc.charges && sc.charges > 0) {
      p.pendingDashes++;
      return true;
    }
    return false;
  }

  if (sc.charges <= 0) return false;
  const target = getWorldMouse();
  p.dashAngle = Math.atan2(target.y - p.y, target.x - p.x);
  p.dashTimer = 0.25;
  p.invuln = Math.max(p.invuln, 0.3);
  sc.charges--;
  if (sc.cooldown <= 0) sc.cooldown = sc.cooldownMax;
  // Efecto de inicio
  spawnParticles(p.x, p.y, 12, '#22d3ee', 1);
  return true;
}

function tryThunderRain() {
  const sc = state.specialCards.thunderRain;
  if (sc.charges <= 0) return false;
  sc.charges--;
  if (sc.cooldown <= 0) sc.cooldown = sc.cooldownMax;
  const level = sc.totalCards;
  state.thunderRain.active = true;
  state.thunderRain.timer = 3 + (level - 1) * 2;
  state.thunderRain.strikeTimer = 0;
  state.flash = 0.3;
  state.flashRGB = '253,224,71';
  return true;
}

function isOnScreen(x, y) {
  const halfW = W / state.cam.zoom / 2;
  const halfH = H / state.cam.zoom / 2;
  return Math.abs(x - state.cam.x) < halfW + 120 && Math.abs(y - state.cam.y) < halfH + 120;
}

