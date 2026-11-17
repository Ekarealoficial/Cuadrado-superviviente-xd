'use strict';
/* =============== BALAS =============== */
function spawnBullet(x, y, angle, speed, opts) {
  opts = opts || {};
  if (state.bullets.length >= MAX_BULLETS) return;
  state.bullets.push({
    x, y,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    r: opts.radius !== undefined ? opts.radius : 4,
    life: 1.6,
    drone: !!opts.drone,
    bounces: opts.bounces || 0,
    homing: !!opts.homing,
    dupli: opts.dupli || 0,
    damage: opts.damage !== undefined ? opts.damage : 1
  });
}

function shoot(n) {
  const p = state.player;
  const speed = 900;
  const off = p.size / 2 + 6;
  const baseRadius = 4 + p.sizeLevel * 1.2;
  const baseDamage = 1 + Math.floor(p.sizeLevel * 0.75);
  const spread = 0.12;
  const fullSpread = (p.shots - 1) * spread;
  const skipOriginal = (n < p.shots);
  const startIdx = skipOriginal ? 1 : 0;
  for (let k = 0; k < n; k++) {
    const i = startIdx + k;
    const offset = -fullSpread / 2 + i * spread;
    const a = p.angle + offset + (gameRandom() - 0.5) * 0.03;
    const isHoming = gameRandom() < p.homingChance;
    const isDupli = gameRandom() < p.dupliChance;
    spawnBullet(p.x + Math.cos(a) * off, p.y + Math.sin(a) * off, a, speed, {
      bounces: p.bounces, homing: isHoming,
      dupli: isDupli ? p.dupliCount : 0,
      damage: baseDamage, radius: baseRadius
    });
    spawnParticles(p.x + Math.cos(a) * off, p.y + Math.sin(a) * off, 2, '#9ef7ff', 0.5);
  }
  const bn = p.backShots;
  if (bn > 0) {
    const bAngle = p.angle + Math.PI, bSpread = 0.12;
    const bTotal = (bn - 1) * bSpread;
    for (let i = 0; i < bn; i++) {
      const offset = -bTotal / 2 + i * bSpread;
      const a = bAngle + offset + (gameRandom() - 0.5) * 0.03;
      const isHoming = gameRandom() < p.homingChance;
      const isDupli = gameRandom() < p.dupliChance;
      spawnBullet(p.x + Math.cos(a) * off, p.y + Math.sin(a) * off, a, speed * 0.9, {
        bounces: p.bounces, homing: isHoming,
        dupli: isDupli ? p.dupliCount : 0,
        damage: baseDamage, radius: baseRadius
      });
      spawnParticles(p.x + Math.cos(a) * off, p.y + Math.sin(a) * off, 2, '#c77dff', 0.5);
    }
  }
  state.shake = Math.min(state.shake + 0.6, 4);
  Sfx.play('shoot', 30);
}

function damagePlayer(amount) {
  amount = amount || 1;
  const p = state.player;
  if (p.invuln > 0) return;
  state.halfHearts -= amount;
  p.invuln = 1.0;
  state.shake = 20 + amount * 5;
  state.flash = 0.4;
  state.flashRGB = '255,60,100';
  state.damageTimer = 0;
  spawnParticles(p.x, p.y, 24, '#ff3b6b');
  Sfx.play('damage', 100);
  addFloat(p.x, p.y - 30, '-' + (amount * 0.5) + ' ❤', '#ff3b6b');
  for (const e of state.enemies) {
    const dx = e.x - p.x, dy = e.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 220) { e.x += (dx/d) * 55; e.y += (dy/d) * 55; }
  }
  if (state.halfHearts <= 0) {
    state.halfHearts = 0;
    state.over = true;
    state.overTimer = 0;
    state.shake = 30;
    state.cam.zoom = 0.85;
    state.lasersFiring = [];
    spawnParticles(p.x, p.y, 60, '#4df3ff', 1.4);
  }
}

function gainXp(amount) {
  state.xp += amount * rules.xp;
  state.score += Math.round(amount * 2);
  let leveled = false;
  while (state.xp >= state.xpNeeded) {
    state.xp -= state.xpNeeded;
    state.level++;
    state.pendingLevelUps++;
    state.xpNeeded = Math.floor(state.xpNeeded * 1.35) + 4;
    leveled = true;
  }
  if (leveled) {
    state.levelTimer = 0;
    addFloat(state.player.x, state.player.y - 55, '¡NIVEL ' + state.level + '!', '#ffd54a');
    spawnParticles(state.player.x, state.player.y, 22, '#ffd54a', 1.1);
    state.cam.zoom = Math.min(1.18, state.cam.zoom + 0.08);
    Sfx.play('levelup');
    if (!state.cardChoices) openCardSelection();
  }
}

