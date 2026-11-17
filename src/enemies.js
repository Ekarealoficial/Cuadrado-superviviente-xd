'use strict';
/* =============== ENEMIGOS =============== */
const ENEMY_TYPES = {
  normal:     { size: 28, hp: 2, speed: 95,  color: '#ff5a6e', xp: 3 },
  fast:       { size: 18, hp: 1, speed: 195, color: '#ffc857', xp: 2 },
  tank:       { size: 52, hp: 7, speed: 62,  color: '#b06bff', xp: 8 },
  shooter:    { size: 26, hp: 3, speed: 145, color: '#ff8c42', xp: 6 },
  invoker:    { size: 34, hp: 5, speed: 70,  color: '#8b5cf6', xp: 12 },
  teleporter: { size: 24, hp: 2, speed: 110, color: '#06b6d4', xp: 7 },
  kamikaze:   { size: 22, hp: 2, speed: 250, color: '#ef4444', xp: 4 },
  dardante:   { size: 32, hp: 4, speed: 110, color: '#fbbf24', xp: 8 },
  juggernaut: { size: 90, hp: 80, speed: 0,  color: '#9f1239', xp: 50 }
};

function chooseEnemyType(t) {
  const r = gameRandom();
  if (t < 20) return r < 0.85 ? 'normal' : 'fast';
  if (t < 40) return r < 0.50 ? 'normal' : (r < 0.85 ? 'fast' : 'tank');
  if (t < 55) {
    if (r < 0.40) return 'normal';
    if (r < 0.64) return 'fast';
    if (r < 0.80) return 'tank';
    if (r < 0.92) return 'shooter';
    return 'kamikaze';
  }
  if (t < 75) {
    if (r < 0.30) return 'normal';
    if (r < 0.50) return 'fast';
    if (r < 0.66) return 'tank';
    if (r < 0.80) return 'shooter';
    if (r < 0.90) return 'kamikaze';
    return 'invoker';
  }
  if (t < 100) {
    if (r < 0.24) return 'normal';
    if (r < 0.42) return 'fast';
    if (r < 0.54) return 'tank';
    if (r < 0.66) return 'shooter';
    if (r < 0.78) return 'kamikaze';
    if (r < 0.88) return 'invoker';
    if (r < 0.96) return 'teleporter';
    return 'dardante';
  }
  if (r < 0.14) return 'normal';
  if (r < 0.26) return 'fast';
  if (r < 0.38) return 'tank';
  if (r < 0.50) return 'shooter';
  if (r < 0.62) return 'kamikaze';
  if (r < 0.74) return 'invoker';
  if (r < 0.84) return 'teleporter';
  if (r < 0.92) return 'dardante';
  return 'juggernaut';
}

function createEnemy(type, x, y, extra) {
  const base = ENEMY_TYPES[type];
  const bonus = Math.min(state.time * 0.35, 40);
  const spd = base.speed + bonus * (type === 'tank' ? 0.35 : (type === 'juggernaut' ? 0 : (type === 'shooter' || type === 'invoker' || type === 'teleporter' || type === 'dardante' ? 0.4 : 1)));
  const hp = Math.round(base.hp * state.enemyHpMult);
  const e = Object.assign(createBody({ activeDarts: 0 }), {
    type, x, y,
    size: base.size,
    hp, maxHp: hp,
    speed: spd,
    color: base.color,
    hitFlash: 0,
    wob: gameRandom() * TAU,
    xp: base.xp,
    shootCd: 1 + gameRandom() * 1.2
  }, extra || {});
  if (type === 'juggernaut') {
    e.jState = 'idle'; e.jTimer = 3 + gameRandom() * 2;
    e.jAngle = 0; e.jHit = false; e.vx = 0; e.vy = 0;
  }
  return e;
}

function spawnEnemy() {
  if (state.enemies.length > 90) return;
  const type = chooseEnemyType(state.time);
  const p = state.player;
  const minDist = Math.max(W, H) * 0.6 / state.cam.zoom + 100;
  const dist = minDist + gameRandom() * 300;
  const angle = gameRandom() * TAU;
  state.enemies.push(createEnemy(type, p.x + Math.cos(angle) * dist, p.y + Math.sin(angle) * dist));
}
function spawnOrbs(x, y, totalXp) {
  const n = clamp(Math.round(totalXp / 2), 1, 5);
  for (let i = 0; i < n; i++) {
    const a = gameRandom() * TAU, s = 60 + gameRandom() * 140;
    state.orbs.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, r: 5, value: totalXp/n, life: 25, pulse: gameRandom()*TAU });
  }
}
function spawnPotion(walls) {
  const p = state.player;
  for (let attempt = 0; attempt < 12; attempt++) {
    const angle = gameRandom() * TAU;
    const dist = 280 + gameRandom() * 450;
    const x = p.x + Math.cos(angle) * dist, y = p.y + Math.sin(angle) * dist;
    let blocked = false;
    for (const w of walls) {
      if (x > w.x - 20 && x < w.x + w.w + 20 && y > w.y - 20 && y < w.y + w.h + 20) { blocked = true; break; }
    }
    if (blocked) continue;
    const isLarge = gameRandom() < 0.35;
    state.potions.push({ x, y, type: isLarge ? 'large' : 'small', value: isLarge ? 2 : 1, life: 45, maxLife: 45, bob: gameRandom()*TAU });
    if (state.potions.length > 6) state.potions.shift();
    return;
  }
}
