'use strict';
/* =============== BOSS =============== */
function spawnBoss() {
  state.bossEncounters = (state.bossEncounters || 0) + 1;
  const bossHp = Math.round(BALANCE.bossHp * Math.pow(BALANCE.bossGrowth, state.bossEncounters - 1) * state.enemyHpMult);
  state.bossActive = true;
  state.bossWarningShown = false;
  const p = state.player;
  const aw = W / state.cam.zoom * 0.95;
  const ah = H / state.cam.zoom * 0.95;
  const ax = p.x - aw / 2, ay = p.y - ah / 2;
  state.arena = {
    x: ax, y: ay, w: aw, h: ah,
    walls: [
      { x: ax - 60, y: ay - 60, w: aw + 120, h: 60, isArena: true },
      { x: ax - 60, y: ay + ah, w: aw + 120, h: 60, isArena: true },
      { x: ax - 60, y: ay - 60, w: 60, h: ah + 120, isArena: true },
      { x: ax + aw, y: ay - 60, w: 60, h: ah + 120, isArena: true }
    ]
  };
  state.boss = {
    x: p.x, y: ay + 200,
    size: 180,
    hp: bossHp, maxHp: bossHp,
    color: '#ff2255', hitFlash: 0,
    state: 'idle', timer: 3, dashAngle: 0, phase: 1,
    balls: [
      { side: 'left',   x: 0, y: 0, r: 36, state: 'attached', vx: 0, vy: 0, life: 0 },
      { side: 'right',  x: 0, y: 0, r: 36, state: 'attached', vx: 0, vy: 0, life: 0 }
    ]
  };
  state.enemies = [];
  state.enemyDarts = [];
  state.enemyBullets = [];
  state.potions = [];
  state.bossBombs = [];
  state.bossLasers = [];
  state.bossLaserActive = false;
  state.bossLaserTimer = 0;
  addFloat(p.x, p.y - 100, '¡JEFE!', '#ff2255');
  state.shake = 25;
  state.flash = 0.5;
  state.flashRGB = '255,60,100';
  Sfx.play('bossroar');
}

function killBoss() {
  if (!state.boss) return;
  const b = state.boss;
  spawnParticles(b.x, b.y, 80, '#ff2255', 2);
  spawnParticles(b.x, b.y, 40, '#ffffff', 1.5);
  state.shake = 40;
  state.flash = 0.6;
  state.flashRGB = '255,60,100';
  state.score += 5000;
  recordKill(b);
  addFloat(b.x, b.y - 60, '¡JEFE DERROTADO!', '#ffd54a');
  Sfx.play('bossdie');
  for (let i = 0; i < 25; i++) spawnOrbs(b.x + gameRand(-150, 150), b.y + gameRand(-150, 150), 6);
  for (let i = 0; i < 3; i++) {
    state.potions.push({ x: b.x + gameRand(-100, 100), y: b.y + gameRand(-100, 100), type: 'large', value: 2, life: 60, maxLife: 60, bob: gameRandom() * TAU });
  }
  state.boss = null;
  state.bossActive = false;
  state.arena = null;
  state.bossBombs = [];
  state.bossLasers = [];
  state.bossLaserActive = false;
  state.bossSpawnTimer = 180;
}

function explodeBossBomb(bomb) {
  if (bomb.exploded) return;
  bomb.exploded = true;
  bomb.fadeTimer = 0;
  const radius = 100;
  spawnParticles(bomb.x, bomb.y, 30, '#ff8c42', 1.5);
  spawnParticles(bomb.x, bomb.y, 15, '#fbbf24', 1.0);
  state.shake = Math.max(state.shake, 14);
  Sfx.play('explode', 60);
  const p = state.player;
  if (p.invuln <= 0) {
    const dx = p.x - bomb.x, dy = p.y - bomb.y;
    if (dx*dx + dy*dy < radius*radius) damagePlayer(1);
  }
  for (const b2 of state.bossBombs) {
    if (b2 === bomb || b2.exploded) continue;
    const dx = b2.x - bomb.x, dy = b2.y - bomb.y;
    if (dx*dx + dy*dy < 130*130) b2.timer = Math.min(b2.timer, 0.35);
  }
}

function startBossAttack(type) {
  const b = state.boss;
  const p = state.player;
  if (type === 'dash') {
    b.state = 'dash_windup';
    b.timer = 0.7;
    b.dashAngle = Math.atan2(p.y - b.y, p.x - b.x);
  } else if (type === 'bombs') {
    b.state = 'attack';
    b.timer = 1.2;
    for (let i = 0; i < 6; i++) {
      let bx, by, tries = 0;
      do {
        bx = state.arena.x + 60 + gameRandom() * (state.arena.w - 120);
        by = state.arena.y + 60 + gameRandom() * (state.arena.h - 120);
        tries++;
        if (tries > 25) break;
      } while (Math.hypot(bx - p.x, by - p.y) < 140);
      state.bossBombs.push({ x: bx, y: by, r: 18, timer: 2.5 + i * 0.35, exploded: false, triggerTime: 0, fadeTimer: 0 });
    }
  } else if (type === 'balls') {
    b.state = 'attack';
    b.timer = 0.6;
    const ballSpeed = b.phase >= 2 ? 900 : 700;
    for (const ball of b.balls) {
      if (ball.state !== 'attached') continue;
      const a = Math.atan2(p.y - ball.y, p.x - ball.x);
      ball.state = 'flying';
      ball.vx = Math.cos(a) * ballSpeed;
      ball.vy = Math.sin(a) * ballSpeed;
      ball.life = 4;
    }
  } else if (type === 'laser') {
    b.state = 'attack';
    b.timer = 0.4;
    state.bossLaserTimer = 1.2;
  }
}
function getBossIdleTime() {
  if (state.boss.phase >= 3) return 0.9;
  if (state.boss.phase >= 2) return 1.3;
  return 1.9;
}

function updateBoss(dt) {
  const b = state.boss;
  if (!b) return;
  const p = state.player;

  if (b.hp < b.maxHp * 0.5 && b.phase < 2) {
    b.phase = 2;
    b.balls.push({ side: 'top', x: b.x, y: b.y, r: 36, state: 'attached', vx: 0, vy: 0, life: 0 });
    b.balls.push({ side: 'bottom', x: b.x, y: b.y, r: 36, state: 'attached', vx: 0, vy: 0, life: 0 });
    addFloat(b.x, b.y - 100, '¡FASE 2!', '#ff7700');
    state.shake = 18;
    Sfx.play('bossroar', 200);
  }
  if (b.hp < b.maxHp * 0.33 && b.phase < 3) {
    b.phase = 3;
    state.bossLaserActive = true;
    state.bossLaserTimer = 1.5;
    addFloat(b.x, b.y - 100, '¡FASE 3!', '#ff0000');
    state.shake = 25; state.flash = 0.4; state.flashRGB = '255,60,100';
    Sfx.play('bossroar', 200);
  }

  const toPx = p.x - b.x, toPy = p.y - b.y;
  const dist = Math.hypot(toPx, toPy) || 1;

  if (b.state === 'idle') {
    b.x += (toPx / dist) * 60 * moveTime(b,dt);
    b.y += (toPy / dist) * 60 * moveTime(b,dt);
    b.timer -= dt;
    if (b.timer <= 0) {
      const attacks = ['dash', 'bombs', 'balls'];
      if (b.phase >= 3) attacks.push('laser');
      startBossAttack(attacks[Math.floor(gameRandom() * attacks.length)]);
    }
  } else if (b.state === 'dash_windup') {
    b.timer -= dt;
    if (b.timer <= 0) { b.state = 'dash'; b.timer = 0.55; Sfx.play('dash', 100); }
  } else if (b.state === 'dash') {
    b.timer -= dt;
    b.x += Math.cos(b.dashAngle) * 1600 * moveTime(b,dt);
    b.y += Math.sin(b.dashAngle) * 1600 * moveTime(b,dt);
    if (p.invuln <= 0) {
      const rr = (b.size/2 + p.size/2);
      if (visibleContact(b,p,rr)) damagePlayer(2);
    }
    if (b.timer <= 0) { b.state = 'idle'; b.timer = getBossIdleTime(); }
  } else if (b.state === 'attack') {
    b.timer -= dt;
    if (b.timer <= 0) { b.state = 'idle'; b.timer = getBossIdleTime(); }
  }

  b.x = clamp(b.x, state.arena.x + b.size/2, state.arena.x + state.arena.w - b.size/2);
  b.y = clamp(b.y, state.arena.y + b.size/2, state.arena.y + state.arena.h - b.size/2);

  for (const ball of b.balls) {
    if (ball.state === 'attached') {
      if (ball.side === 'left') { ball.x = b.x - b.size/2 - ball.r; ball.y = b.y; }
      else if (ball.side === 'right') { ball.x = b.x + b.size/2 + ball.r; ball.y = b.y; }
      else if (ball.side === 'top') { ball.x = b.x; ball.y = b.y - b.size/2 - ball.r; }
      else if (ball.side === 'bottom') { ball.x = b.x; ball.y = b.y + b.size/2 + ball.r; }
    } else if (ball.state === 'flying') {
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      ball.life -= dt;
      if (ball.x - ball.r < state.arena.x) { ball.x = state.arena.x + ball.r; ball.vx = Math.abs(ball.vx); }
      if (ball.x + ball.r > state.arena.x + state.arena.w) { ball.x = state.arena.x + state.arena.w - ball.r; ball.vx = -Math.abs(ball.vx); }
      if (ball.y - ball.r < state.arena.y) { ball.y = state.arena.y + ball.r; ball.vy = Math.abs(ball.vy); }
      if (ball.y + ball.r > state.arena.y + state.arena.h) { ball.y = state.arena.y + state.arena.h - ball.r; ball.vy = -Math.abs(ball.vy); }
      if (p.invuln <= 0) {
        const rr = ball.r + p.size/2;
        if (visibleContact(ball,p,rr)) damagePlayer(1);
      }
      if (ball.life <= 0) ball.state = 'returning';
    } else if (ball.state === 'returning') {
      const dx = b.x - ball.x, dy = b.y - ball.y;
      const d = Math.hypot(dx, dy) || 1;
      ball.x += (dx/d) * 550 * dt;
      ball.y += (dy/d) * 550 * dt;
      if (d < 30) ball.state = 'attached';
    }
  }

  for (let i = state.bossBombs.length - 1; i >= 0; i--) {
    const bomb = state.bossBombs[i];
    if (bomb.exploded) {
      bomb.fadeTimer += dt;
      if (bomb.fadeTimer > 0.6) state.bossBombs.splice(i, 1);
      continue;
    }
    bomb.timer -= dt;
    const dx = p.x - bomb.x, dy = p.y - bomb.y;
    const triggerR = p.size/2 + bomb.r;
    if (dx*dx + dy*dy < triggerR*triggerR) bomb.timer = 0;
    if (bomb.timer <= 0) explodeBossBomb(bomb);
  }

  if (state.bossLaserActive) {
    state.bossLaserTimer -= dt;
    if (state.bossLaserTimer <= 0) {
      state.bossLaserTimer = 2.0;
      const edges = ['top', 'bottom', 'left', 'right'];
      const edge = edges[Math.floor(gameRandom() * 4)];
      let lx, ly, la;
      if (edge === 'top') { lx = state.arena.x + gameRandom() * state.arena.w; ly = state.arena.y; la = Math.PI/2 + gameRand(-0.6, 0.6); }
      else if (edge === 'bottom') { lx = state.arena.x + gameRandom() * state.arena.w; ly = state.arena.y + state.arena.h; la = -Math.PI/2 + gameRand(-0.6, 0.6); }
      else if (edge === 'left') { lx = state.arena.x; ly = state.arena.y + gameRandom() * state.arena.h; la = gameRand(-0.6, 0.6); }
      else { lx = state.arena.x + state.arena.w; ly = state.arena.y + gameRandom() * state.arena.h; la = Math.PI + gameRand(-0.6, 0.6); }
      state.bossLasers.push({ x: lx, y: ly, angle: la, warmup: 1.0, active: 1.6, width: 70, state: 'warmup' });
    }
  }
  for (let i = state.bossLasers.length - 1; i >= 0; i--) {
    const ls = state.bossLasers[i];
    if (ls.state === 'warmup') {
      ls.warmup -= dt;
      if (ls.warmup <= 0) ls.state = 'active';
    } else {
      ls.active -= dt;
      if (ls.active <= 0) { state.bossLasers.splice(i, 1); continue; }
      if (p.invuln <= 0) {
        const dx = p.x - ls.x, dy = p.y - ls.y;
        const proj = dx * Math.cos(ls.angle) + dy * Math.sin(ls.angle);
        const perp = -dx * Math.sin(ls.angle) + dy * Math.cos(ls.angle);
        if (proj > 0 && Math.abs(perp) < ls.width/2 + p.size/2) damagePlayer(1);
      }
    }
  }
}

