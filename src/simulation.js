'use strict';
/* =============== UPDATE =============== */
function update(dt, worldStep = true) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const pt = state.particles[i];
    pt.life -= dt;
    if (pt.life <= 0) { state.particles.splice(i, 1); continue; }
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    const damp = Math.max(0, 1 - 5 * dt);
    pt.vx *= damp; pt.vy *= damp;
  }
  for (let i = state.floats.length - 1; i >= 0; i--) {
    const f = state.floats[i];
    f.life -= dt; f.y += f.vy * dt; f.vy *= 0.92;
    if (f.life <= 0) state.floats.splice(i, 1);
  }
  for (let i = state.lightningStrikes.length - 1; i >= 0; i--) {
    const ls = state.lightningStrikes[i];
    ls.timer -= dt;
    if (ls.timer <= 0) state.lightningStrikes.splice(i, 1);
  }
  if (state.shake > 0) state.shake = Math.max(0, state.shake - 45 * dt);
  if (state.flash > 0) state.flash = Math.max(0, state.flash - 2 * dt);

  const p = state.player;
  if (!state.over) {
    const targetCamX = p.x + p.vx * 0.16;
    const targetCamY = p.y + p.vy * 0.16;
    state.cam.x += (targetCamX - state.cam.x) * Math.min(1, 10 * dt);
    state.cam.y += (targetCamY - state.cam.y) * Math.min(1, 10 * dt);
  }
  state.cam.zoom += (1 - state.cam.zoom) * Math.min(1, 4.5 * dt);
  currentWalls = getVisibleChunks(state.cam);
  if (state.bossActive && state.arena) currentWalls = currentWalls.concat(state.arena.walls);

  if (state.over) { state.overTimer += dt; return; }
  if (state.cardChoices) return;
  if (state.inventoryOpen) return;

  if (worldStep) state.time += dt;
  state.levelTimer += dt;
  state.damageTimer += dt;

  update_regeneration(dt);
  update_abilityCooldowns(dt);
  update_stormAndBossSchedule(dt, worldStep);
  update_movementAndWeapons(dt, worldStep);
  update_shieldPositions(dt);
  update_playerProjectiles(dt);
  if (worldStep) update_enemyProjectiles(dt);
  update_projectileCancellation(dt);
  update_shieldBlocking(dt);
  update_shieldPush(dt);
  update_enemyProjectileHits(dt);
  if (worldStep) {
    update_spawning(dt);
    update_enemyAI(dt);
    update_enemySeparation(dt);
  }
  update_projectileHits(dt);
  update_bossHits(dt);
  update_enemyDarts(worldStep ? dt : 0);
  update_experience(worldStep ? dt : 0);
  update_potions(worldStep ? dt : 0);
  update_contactDamage(dt);
  update_drones(dt);
  update_darts(dt);
}

function reflectBulletOffWall(b, w) {
  const distLeft   = Math.abs(b.x - w.x);
  const distRight  = Math.abs(b.x - (w.x + w.w));
  const distTop    = Math.abs(b.y - w.y);
  const distBottom = Math.abs(b.y - (w.y + w.h));
  const minD = Math.min(distLeft, distRight, distTop, distBottom);
  if (minD === distLeft) { b.x = w.x - b.r - 1; b.vx = -Math.abs(b.vx); }
  else if (minD === distRight) { b.x = w.x + w.w + b.r + 1; b.vx = Math.abs(b.vx); }
  else if (minD === distTop) { b.y = w.y - b.r - 1; b.vy = -Math.abs(b.vy); }
  else { b.y = w.y + w.h + b.r + 1; b.vy = Math.abs(b.vy); }
}


function update_regeneration(dt) {
  const p=state.player;
  // Regeneración
  if (p.regenLevel > 0 && state.halfHearts < state.maxHalfHearts) {
    p.regenTimer -= dt;
    if (p.regenTimer <= 0) {
      state.halfHearts = Math.min(state.maxHalfHearts, state.halfHearts + p.regenAmount);
      p.regenTimer = p.regenInterval;
      addFloat(p.x, p.y - 40, '+' + (p.regenAmount * 0.5) + ' ❤', '#4ade80');
      spawnParticles(p.x, p.y, 15, '#4ade80', 0.8);
      Sfx.play('regen', 200);
    }
  } else if (p.regenLevel > 0) {
    p.regenTimer = p.regenInterval;
  }


}

function update_abilityCooldowns(dt) {
  const p=state.player;
  // Cooldowns de cartas especiales (genérico)
  for (const cid in state.specialCards) {
    const sc = state.specialCards[cid];
    if (sc.maxCharges > 0 && sc.charges < sc.maxCharges) {
      sc.cooldown -= dt;
      if (sc.cooldown <= 0) {
        sc.charges++;
        sc.cooldown = sc.cooldownMax;
      }
    }
  }


}

function update_stormAndBossSchedule(dt, worldStep = true) {
  const p=state.player;
  // Thunder rain activa
  if (state.thunderRain.active) {
    state.thunderRain.timer -= dt;
    state.thunderRain.strikeTimer -= dt;
    if (state.thunderRain.strikeTimer <= 0) {
      state.thunderRain.strikeTimer = 0.35;
      let anyHit = false;
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const e = state.enemies[i];
        if (isOnScreen(e.x, e.y)) {
          state.lightningStrikes.push({ x: e.x, y: e.y, timer: 0.3, maxTimer: 0.3 });
          e.hp -= 3 * state.playerDamageMult;
          e.hitFlash = 0.15;
          anyHit = true;
          if (e.hp <= 0) killEnemy(i);
        }
      }
      if (state.boss && isOnScreen(state.boss.x, state.boss.y)) {
        state.lightningStrikes.push({ x: state.boss.x, y: state.boss.y, timer: 0.3, maxTimer: 0.3 });
        state.boss.hp -= 3 * state.playerDamageMult;
        state.boss.hitFlash = 0.15;
        anyHit = true;
        if (state.boss.hp <= 0) killBoss();
      }
      if (anyHit) Sfx.play('lightning', 120);
    }
    if (state.thunderRain.timer <= 0) state.thunderRain.active = false;
  }

  if (!worldStep) return;
  if (!state.bossActive && !rules.disabled.includes('boss')) {
    if (state.bossSpawnTimer > 0 && state.bossSpawnTimer < 5 && !state.bossWarningShown) {
      state.bossWarningShown = true;
      addFloat(p.x, p.y - 100, '¡JEFE EN CAMINO!', '#ff2255');
      state.shake = 10;
    }
    state.bossSpawnTimer -= dt * rules.difficulty;
    if (state.bossSpawnTimer <= 0) spawnBoss();
  }
  checkAdaptive(dt * rules.difficulty);


}

function update_movementAndWeapons(dt, worldStep = true) {
  const p=state.player;
  // Movimiento (con dash)
  if (p.dashTimer > 0) {
    p.vx = Math.cos(p.dashAngle) * 1800;
    p.vy = Math.sin(p.dashAngle) * 1800;
    p.invuln = Math.max(p.invuln, 0.05);
    spawnParticles(p.x, p.y, 1, '#22d3ee', 0.7);
  } else {
    let dx = 0, dy = 0;
    if (keys['a'] || keys['arrowleft'])  dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
    if (keys['w'] || keys['arrowup'])    dy -= 1;
    if (keys['s'] || keys['arrowdown'])  dy += 1;
    const moving = (dx !== 0 || dy !== 0);
    if (moving) { const l = Math.hypot(dx, dy); dx /= l; dy /= l; }
    const response = moving ? 16 : 11;
    const k = 1 - Math.exp(-response * dt);
    p.vx += (dx * p.speed - p.vx) * k;
    p.vy += (dy * p.speed - p.vy) * k;
  }
  const res = moveWithWalls(p, p.vx * dt, p.vy * dt, currentWalls);
  if (res.blockedX) p.vx = 0;
  if (res.blockedY) p.vy = 0;

  // Fin del dash
  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    if (p.dashTimer <= 0) {
      p.vx = 0; p.vy = 0;
      if (p.pendingDashes > 0 && state.specialCards.dash.charges > 0) {
        p.pendingDashes--;
        const target = getWorldMouse();
        p.dashAngle = Math.atan2(target.y - p.y, target.x - p.x);
        p.dashTimer = 0.25;
        p.invuln = Math.max(p.invuln, 0.3);
        state.specialCards.dash.charges--;
        if (state.specialCards.dash.cooldown <= 0) state.specialCards.dash.cooldown = state.specialCards.dash.cooldownMax;
        spawnParticles(p.x, p.y, 12, '#22d3ee', 1);
      } else {
        p.pendingDashes = 0;
      }
    }
  }

  const wm = getWorldMouse();
  p.angle = Math.atan2(wm.y - p.y, wm.x - p.x);
  if (p.invuln > 0) p.invuln -= dt;
  p.fireCd -= dt;

  // Disparo / carga láser
  if (mouse.down) {
    if (p.laserCount > 0) {
      state.laserCharging = true;
      state.laserChargeTime += dt;
      if (p.fireCd <= 0 && p.shots > 1) {
        shoot(p.shots - 1);
        p.fireCd = p.fireCdBase;
      }
    } else {
      if (p.fireCd <= 0) {
        shoot(p.shots);
        p.fireCd = p.fireCdBase;
      }
    }
  } else {
    if (state.laserCharging) {
      fireLasers(state.laserChargeTime);
      state.laserCharging = false;
      state.laserChargeTime = 0;
    }
  }
  updateLasersFiring(dt);

  updateLightning(dt);
  if (state.bossActive && worldStep) updateBoss(dt);


}

function update_shieldPositions(dt) {
  const p=state.player;
  // Escudos
  const nShields = state.shields.length;
  for (let i = 0; i < nShields; i++) {
    const sh = state.shields[i];
    const baseAngle = (i / nShields) * TAU + state.time * 2.4;
    sh.angle = baseAngle;
    sh.x = p.x + Math.cos(baseAngle) * 50;
    sh.y = p.y + Math.sin(baseAngle) * 50;
  }


}

function update_playerProjectiles(dt) {
  const p=state.player;
  // Balas jugador
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    if (b.homing) {
      const nearest = getNearestTarget(b.x, b.y);
      if (nearest) {
        const targetAngle = Math.atan2(nearest.y - b.y, nearest.x - b.x);
        const currentAngle = Math.atan2(b.vy, b.vx);
        let diff = targetAngle - currentAngle;
        while (diff > Math.PI) diff -= TAU;
        while (diff < -Math.PI) diff += TAU;
        const newAngle = currentAngle + clamp(diff, -7.5*dt, 7.5*dt);
        const spd = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(newAngle) * spd; b.vy = Math.sin(newAngle) * spd;
      }
    }
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0) { state.bullets.splice(i, 1); continue; }
    let removed = false;
    for (const w of currentWalls) {
      if (aabbOverlapCircle(b.x, b.y, b.r, w)) {
        if (b.dupli > 0) {
          reflectBulletOffWall(b, w);
          const newDupli = b.dupli - 1;
          b.dupli = newDupli;
          const spd = Math.hypot(b.vx, b.vy);
          const origAngle = Math.atan2(b.vy, b.vx);
          const copyAngle = origAngle + (gameRandom() < 0.5 ? 0.4 : -0.4);
          spawnBullet(b.x, b.y, copyAngle, spd, {
            drone: b.drone, bounces: b.bounces, homing: b.homing,
            dupli: newDupli, damage: b.damage, radius: b.r
          });
          spawnParticles(b.x, b.y, 4, '#ff4dd2', 0.7);
        } else if (b.bounces > 0) {
          b.bounces--;
          reflectBulletOffWall(b, w);
          spawnParticles(b.x, b.y, 4, '#fbbf24', 0.6);
        } else {
          spawnParticles(b.x, b.y, 4, b.drone ? '#4dff88' : '#9ef7ff', 0.5);
          state.bullets.splice(i, 1);
          removed = true;
        }
        break;
      }
    }
    if (removed) continue;
  }


}

function update_enemyProjectiles(dt) {
  const p=state.player;
  // Balas enemigas
  for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
    const b = state.enemyBullets[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0) { state.enemyBullets.splice(i, 1); continue; }
    let hitWall = false;
    for (const w of currentWalls) if (aabbOverlapCircle(b.x, b.y, b.r, w)) { hitWall = true; break; }
    if (hitWall) {
      spawnParticles(b.x, b.y, 4, '#ff8c42', 0.5);
      state.enemyBullets.splice(i, 1);
    }
  }


}

function update_projectileCancellation(dt) {
  const p=state.player;
  // Cancelación
  for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
    const eb = state.enemyBullets[i];
    let cancelled = false;
    for (let j = state.bullets.length - 1; j >= 0; j--) {
      const pb = state.bullets[j];
      const ddx = eb.x - pb.x, ddy = eb.y - pb.y;
      const rr = eb.r + pb.r + 1;
      if (ddx*ddx + ddy*ddy < rr*rr) {
        spawnParticles((eb.x + pb.x)/2, (eb.y + pb.y)/2, 6, '#ffffff', 0.8);
        state.bullets.splice(j, 1);
        cancelled = true;
        break;
      }
    }
    if (cancelled) state.enemyBullets.splice(i, 1);
  }


}

function update_shieldBlocking(dt) {
  const p=state.player;
  // Escudos bloquean
  for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
    const eb = state.enemyBullets[i];
    let blocked = false;
    for (let j = state.shields.length - 1; j >= 0; j--) {
      const sh = state.shields[j];
      const ddx = eb.x - sh.x, ddy = eb.y - sh.y;
      const rr = 14 + eb.r;
      if (ddx*ddx + ddy*ddy < rr*rr) {
        sh.hp -= 1; blocked = true;
        spawnParticles(eb.x, eb.y, 6, '#4df3ff', 0.7);
        Sfx.play('shieldblock', 40);
        if (sh.hp <= 0) {
          spawnParticles(sh.x, sh.y, 18, '#4df3ff', 1.2);
          Sfx.play('shieldbreak', 80);
          state.shields.splice(j, 1);
        }
        break;
      }
    }
    if (blocked) state.enemyBullets.splice(i, 1);
  }


}

function update_shieldPush(dt) {
  const p=state.player;
  // Escudos empujan
  for (const e of state.enemies) {
    if (e.type === 'juggernaut') continue;
    for (const sh of state.shields) {
      const ddx = e.x - sh.x, ddy = e.y - sh.y;
      const rr = 14 + e.size/2;
      const d2 = ddx*ddx + ddy*ddy;
      if (d2 < rr*rr) {
        const d = Math.sqrt(d2) || 1;
        e.x = sh.x + (ddx/d) * rr;
        e.y = sh.y + (ddy/d) * rr;
      }
    }
  }


}

function update_enemyProjectileHits(dt) {
  const p=state.player;
  // Bala enemiga vs jugador
  for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
    const b = state.enemyBullets[i];
    if (p.invuln <= 0) {
      const ddx = p.x - b.x, ddy = p.y - b.y;
      const rr = p.size/2 + b.r;
      if (ddx*ddx + ddy*ddy < rr*rr) {
        damagePlayer(1);
        state.enemyBullets.splice(i, 1);
      }
    }
  }


}

function update_spawning(dt) {
  const p=state.player;
  // Spawn
  if (!state.bossActive) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnEnemy();
      const interval = Math.max(0.55, 1.7 - state.time * rules.difficulty * 0.009) * state.spawnRateMult;
      state.spawnTimer = interval * gameRand(0.80, 1.25);
    }
    state.potionTimer -= dt;
    if (state.potionTimer <= 0) {
      spawnPotion(currentWalls);
      state.potionTimer = 12 + gameRandom() * 12;
    }
  }


}

function update_enemyAI(dt) {
  const p=state.player;
  // IA enemigos
  refreshSpatialIndexes();
  const despawnDist = Math.max(W, H) * 1.0 + 900;
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    const toPx = p.x - e.x, toPy = p.y - e.y;
    const distToPlayer = Math.hypot(toPx, toPy) || 1;

    if (e.type === 'shooter') {
      const dirX = toPx / distToPlayer, dirY = toPy / distToPlayer;
      const desired = 340;
      let mvx = 0, mvy = 0;
      if (distToPlayer > desired + 40) { mvx += dirX; mvy += dirY; }
      else if (distToPlayer < desired - 40) { mvx -= dirX; mvy -= dirY; }
      else { mvx += -dirY * 0.7; mvy += dirX * 0.7; }
      for (const b of bulletGrid.query(e.x,e.y,180)) {
        const bdx = e.x - b.x, bdy = e.y - b.y;
        const bd2 = bdx*bdx + bdy*bdy;
        if (bd2 < 180*180) {
          const vlen = Math.hypot(b.vx, b.vy) || 1;
          const perpX = -b.vy / vlen, perpY = b.vx / vlen;
          const dot = bdx * perpX + bdy * perpY;
          const sign = dot > 0 ? 1 : -1;
          const strength = (1 - Math.sqrt(bd2)/180) * 1.8;
          mvx += perpX * sign * strength;
          mvy += perpY * sign * strength;
        }
      }
      const mlen = Math.hypot(mvx, mvy);
      if (mlen > 0.001) { mvx /= mlen; mvy /= mlen; }
      e.wob += dt * 3.2;
      moveWithWalls(e, mvx * e.speed * dt, mvy * e.speed * dt, currentWalls);
      e.shootCd -= dt;
      if (e.shootCd <= 0 && distToPlayer < 560) {
        let hasLos = true;
        for (let s = 1; s < 10; s++) {
          if (pointInWall(e.x + toPx * (s/10), e.y + toPy * (s/10), currentWalls)) { hasLos = false; break; }
        }
        if (hasLos) {
          const a = Math.atan2(toPy, toPx);
          state.enemyBullets.push({ x: e.x + Math.cos(a)*20, y: e.y + Math.sin(a)*20, vx: Math.cos(a)*400, vy: Math.sin(a)*400, r: 6, life: 3 });
          e.shootCd = 1.4 + gameRandom() * 0.7;
          Sfx.play('enemyshoot', 80);
        }
      }
    } else if (e.type === 'invoker') {
      const dirX = toPx / distToPlayer, dirY = toPy / distToPlayer;
      const desired = 320;
      let mvx = 0, mvy = 0;
      if (distToPlayer < desired - 30) { mvx -= dirX; mvy -= dirY; }
      else if (distToPlayer > desired + 30) { mvx += dirX; mvy += dirY; }
      e.wob += dt * 2;
      mvx += -dirY * Math.sin(e.wob) * 0.4;
      mvy += dirX * Math.sin(e.wob) * 0.4;
      const ml = Math.hypot(mvx, mvy) || 1;
      moveWithWalls(e, (mvx/ml) * e.speed * dt, (mvy/ml) * e.speed * dt, currentWalls);
      e.shootCd -= dt;
      if (e.shootCd <= 0) { summonEnemies(e); e.shootCd = 5 + gameRandom() * 2; Sfx.play('teleport', 150); }
    } else if (e.type === 'teleporter') {
      const dirX = toPx / distToPlayer, dirY = toPy / distToPlayer;
      e.wob += dt * 4;
      moveWithWalls(e, dirX * e.speed * dt, dirY * e.speed * dt, currentWalls);
      e.shootCd -= dt;
      if (e.shootCd <= 0) {
        for (let attempt = 0; attempt < 8; attempt++) {
          const a = gameRandom() * TAU;
          const dist = 280 + gameRandom() * 160;
          const nx = p.x + Math.cos(a) * dist, ny = p.y + Math.sin(a) * dist;
          if (!pointInWall(nx, ny, currentWalls)) {
            spawnParticles(e.x, e.y, 15, '#06b6d4', 1);
            e.x = nx; e.y = ny;
            spawnParticles(e.x, e.y, 15, '#06b6d4', 1);
            Sfx.play('teleport', 60);
            break;
          }
        }
        e.shootCd = 3 + gameRandom() * 2;
      }
    } else if (e.type === 'kamikaze') {
      const dirX = toPx / distToPlayer, dirY = toPy / distToPlayer;
      moveWithWalls(e, dirX * e.speed * dt, dirY * e.speed * dt, currentWalls);
      if (distToPlayer < 55) { killEnemy(i); continue; }
    } else if (e.type === 'dardante') {
      const dirX = toPx / distToPlayer, dirY = toPy / distToPlayer;
      const desired = 250;
      let mvx = 0, mvy = 0;
      if (distToPlayer < desired - 30) { mvx -= dirX; mvy -= dirY; }
      else if (distToPlayer > desired + 30) { mvx += dirX; mvy += dirY; }
      e.wob += dt * 2;
      mvx += -dirY * Math.sin(e.wob) * 0.5;
      mvy += dirX * Math.sin(e.wob) * 0.5;
      const ml = Math.hypot(mvx, mvy) || 1;
      moveWithWalls(e, (mvx/ml) * e.speed * dt, (mvy/ml) * e.speed * dt, currentWalls);
      e.shootCd -= dt;
      const activeCount = e.activeDarts || 0;
      if (e.shootCd <= 0 && activeCount < 4 && distToPlayer < 500) {
        const a = Math.atan2(toPy, toPx);
        state.enemyDarts.push({
          x: e.x + Math.cos(a) * (e.size/2 + 8),
          y: e.y + Math.sin(a) * (e.size/2 + 8),
          vx: Math.cos(a) * 220, vy: Math.sin(a) * 220,
          angle: a, owner: e
        });
        e.activeDarts++;
        e.shootCd = 1.6 + gameRandom() * 0.4;
        Sfx.play('enemyshoot', 80);
      }
    } else if (e.type === 'juggernaut') {
      if (e.jState === 'idle') {
        e.jTimer -= dt;
        if (e.jTimer <= 0 && distToPlayer < 900) {
          e.jState = 'charging';
          e.jTimer = 0.75;
          e.jAngle = Math.atan2(toPy, toPx);
          e.jHit = false;
          Sfx.play('dash', 200);
        }
      } else if (e.jState === 'charging') {
        e.jTimer -= dt;
        e.jAngle = Math.atan2(toPy, toPx);
        if (e.jTimer <= 0) { e.jState = 'dashing'; e.jTimer = 0.6; Sfx.play('dash', 100); }
      } else if (e.jState === 'dashing') {
        e.jTimer -= dt;
        const res2 = moveWithWalls(e, Math.cos(e.jAngle) * 1800 * dt, Math.sin(e.jAngle) * 1800 * dt, currentWalls);
        if (!e.jHit && p.invuln <= 0) {
          const ddx = p.x - e.x, ddy = p.y - e.y;
          const rr = (e.size + p.size) * 0.5;
          if (ddx*ddx + ddy*ddy < rr*rr) { damagePlayer(2); e.jHit = true; }
        }
        if (e.jTimer <= 0 || res2.blockedX || res2.blockedY) { e.jState = 'recover'; e.jTimer = 1.0; }
      } else if (e.jState === 'recover') {
        e.jTimer -= dt;
        if (e.jTimer <= 0) { e.jState = 'idle'; e.jTimer = 3.2 + gameRandom() * 1.5; }
      }
    } else {
      let ax = toPx / distToPlayer, ay = toPy / distToPlayer;
      e.wob += dt * 3.2;
      const perp = Math.sin(e.wob) * 0.25;
      let nx = ax - ay * perp, ny = ay + ax * perp;
      const nl = Math.hypot(nx, ny) || 1;
      nx /= nl; ny /= nl;
      moveWithWalls(e, nx * e.speed * dt, ny * e.speed * dt, currentWalls);
    }
    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (distToPlayer > despawnDist) state.enemies.splice(i, 1);
  }


}

function update_enemySeparation(dt) {
  const p=state.player;
  // Separación
  enemyGrid.rebuild(state.enemies);
  const order = new Map(state.enemies.map((e,i)=>[e,i]));
  for (let i = 0; i < state.enemies.length; i++) {
    const a = state.enemies[i];
    for (const b of enemyGrid.query(a.x,a.y,180)) {
      if(order.get(b)<=i) continue;
      if (a.type === 'juggernaut' || b.type === 'juggernaut') continue;
      const ddx = b.x - a.x, ddy = b.y - a.y;
      const minD = (a.size + b.size) * 0.5;
      const d2 = ddx*ddx + ddy*ddy;
      if (d2 > 0.001 && d2 < minD*minD) {
        const dd = Math.sqrt(d2);
        const push = (minD - dd) * 0.5;
        const ux = ddx/dd, uy = ddy/dd;
        a.x -= ux*push; a.y -= uy*push;
        b.x += ux*push; b.y += uy*push;
      }
    }
  }


}

function update_projectileHits(dt) {
  const p=state.player;
  // Bala jugador vs enemigo
  enemyGrid.rebuild(state.enemies);
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    let hit = false, bounceKept = false;
    for (const e of enemyGrid.query(b.x,b.y,45+b.r).reverse()) {
      if(e._dying) continue;
      const ddx = b.x - e.x, ddy = b.y - e.y;
      const rr = e.size/2 + b.r;
      if (ddx*ddx + ddy*ddy < rr*rr) {
        e.hp -= b.damage * state.playerDamageMult;
        e.hitFlash = 0.12;
        hit = true;
        spawnParticles(b.x, b.y, 5, e.color, 0.6);
        if (e.hp <= 0) killEnemy(state.enemies.indexOf(e));
        else Sfx.play('hit', 25);
        const d = Math.sqrt(ddx*ddx + ddy*ddy) || 1;
        const nx = ddx/d, ny = ddy/d;
        if (b.dupli > 0) {
          const dot = b.vx*nx + b.vy*ny;
          b.vx -= 2*dot*nx; b.vy -= 2*dot*ny;
          b.x = e.x + nx*(e.size/2 + b.r + 1);
          b.y = e.y + ny*(e.size/2 + b.r + 1);
          const newDupli = b.dupli - 1;
          b.dupli = newDupli;
          const spd = Math.hypot(b.vx, b.vy);
          const origAngle = Math.atan2(b.vy, b.vx);
          const copyAngle = origAngle + (gameRandom() < 0.5 ? 0.4 : -0.4);
          spawnBullet(b.x, b.y, copyAngle, spd, {
            drone: b.drone, bounces: b.bounces, homing: b.homing,
            dupli: newDupli, damage: b.damage, radius: b.r
          });
          spawnParticles(b.x, b.y, 4, '#ff4dd2', 0.7);
          bounceKept = true;
        } else if (b.bounces > 0) {
          b.bounces--;
          const dot = b.vx*nx + b.vy*ny;
          b.vx -= 2*dot*nx; b.vy -= 2*dot*ny;
          b.x = e.x + nx*(e.size/2 + b.r + 1);
          b.y = e.y + ny*(e.size/2 + b.r + 1);
          spawnParticles(b.x, b.y, 4, '#fbbf24', 0.6);
          bounceKept = true;
        }
        break;
      }
    }
    if (hit && !bounceKept) state.bullets.splice(i, 1);
  }


}

function update_bossHits(dt) {
  const p=state.player;
  // Balas vs boss
  if (state.boss) {
    const b0 = state.boss;
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      const ddx = b.x - b0.x, ddy = b.y - b0.y;
      const rr = b0.size/2 + b.r;
      if (ddx*ddx + ddy*ddy < rr*rr) {
        b0.hp -= b.damage * state.playerDamageMult;
        b0.hitFlash = 0.1;
        spawnParticles(b.x, b.y, 5, '#ff2255', 0.6);
        if (b.bounces > 0) {
          b.bounces--;
          const d = Math.sqrt(ddx*ddx + ddy*ddy) || 1;
          const nx = ddx/d, ny = ddy/d;
          const dot = b.vx*nx + b.vy*ny;
          b.vx -= 2*dot*nx; b.vy -= 2*dot*ny;
          b.x = b0.x + nx * (b0.size/2 + b.r + 1);
          b.y = b0.y + ny * (b0.size/2 + b.r + 1);
        } else {
          state.bullets.splice(i, 1);
        }
        if (b0.hp <= 0) { killBoss(); break; }
      }
    }
    if (state.boss) {
      for (const ball of state.boss.balls) {
        if (ball.state === 'attached') continue;
        for (let i = state.bullets.length - 1; i >= 0; i--) {
          const b = state.bullets[i];
          const ddx = b.x - ball.x, ddy = b.y - ball.y;
          const rr = ball.r + b.r;
          if (ddx*ddx + ddy*ddy < rr*rr) {
            state.boss.hp -= b.damage * state.playerDamageMult * 0.5;
            state.boss.hitFlash = 0.1;
            spawnParticles(b.x, b.y, 5, '#ff2255', 0.6);
            if (b.bounces > 0) {
              b.bounces--;
              const d = Math.sqrt(ddx*ddx + ddy*ddy) || 1;
              const nx = ddx/d, ny = ddy/d;
              const dot = b.vx*nx + b.vy*ny;
              b.vx -= 2*dot*nx; b.vy -= 2*dot*ny;
              b.x = ball.x + nx * (ball.r + b.r + 1);
              b.y = ball.y + ny * (ball.r + b.r + 1);
            } else {
              state.bullets.splice(i, 1);
            }
            if (state.boss && state.boss.hp <= 0) { killBoss(); break; }
          }
        }
        if (!state.boss) break;
      }
    }
  }


}

function update_enemyDarts(dt) {
  const p=state.player;
  // Dardos enemigos
  for (let i = state.enemyDarts.length - 1; i >= 0; i--) {
    const d = state.enemyDarts[i];
    if (d.owner && state.enemies.indexOf(d.owner) === -1) { state.enemyDarts.splice(i, 1); continue; }
    const ang = Math.atan2(p.y - d.y, p.x - d.x);
    d.vx += Math.cos(ang) * 400 * dt;
    d.vy += Math.sin(ang) * 400 * dt;
    const spd = Math.hypot(d.vx, d.vy);
    if (spd > 240) { d.vx = d.vx/spd*240; d.vy = d.vy/spd*240; }
    d.x += d.vx * dt; d.y += d.vy * dt;
    d.angle = Math.atan2(d.vy, d.vx);
    if (p.invuln <= 0) {
      const ddx = p.x - d.x, ddy = p.y - d.y;
      const rr = p.size/2 + 6;
      if (ddx*ddx + ddy*ddy < rr*rr) {
        damagePlayer(1);
        state.enemyDarts.splice(i, 1);
      }
    }
  }


}

function update_experience(dt) {
  const p=state.player;
  // Orbes
  for (let i = state.orbs.length - 1; i >= 0; i--) {
    const o = state.orbs[i];
    o.life -= dt; o.pulse += dt * 6;
    if (o.life <= 0) { state.orbs.splice(i, 1); continue; }
    const ddx = p.x - o.x, ddy = p.y - o.y;
    const d2 = ddx*ddx + ddy*ddy;
    const d = Math.sqrt(d2) || 1;
    const mr = state.magnetRange;
    if (d < mr) {
      const str = 1800 * (1 - d/mr);
      o.vx += (ddx/d) * str * dt;
      o.vy += (ddy/d) * str * dt;
    }
    const friction = Math.max(0, 1 - 3*dt);
    o.vx *= friction; o.vy *= friction;
    o.x += o.vx * dt; o.y += o.vy * dt;
    if (d < p.size/2 + o.r + 6) {
      gainXp(o.value);
      Sfx.play('pickup', 20);
      spawnParticles(o.x, o.y, 4, '#8fff9e', 0.5);
      state.orbs.splice(i, 1);
    }
  }


}

function update_potions(dt) {
  const p=state.player;
  // Pociones
  for (let i = state.potions.length - 1; i >= 0; i--) {
    const pot = state.potions[i];
    pot.life -= dt; pot.bob += dt * 4;
    if (pot.life <= 0) { state.potions.splice(i, 1); continue; }
    const ddx = p.x - pot.x, ddy = p.y - pot.y;
    const rr = p.size/2 + 16;
    if (state.halfHearts < state.maxHalfHearts && ddx*ddx + ddy*ddy < rr*rr) {
      const before = state.halfHearts;
      state.halfHearts = Math.min(state.maxHalfHearts, state.halfHearts + pot.value);
      const gained = state.halfHearts - before;
      if (gained > 0) {
        Sfx.play('potion');
        spawnParticles(pot.x, pot.y, 22, pot.type === 'large' ? '#ff9ec4' : '#ff7aa8', 1);
        addFloat(pot.x, pot.y - 20, '+' + (gained*0.5) + ' ❤', '#ff7aa8');
        state.cam.zoom = Math.min(1.1, state.cam.zoom + 0.03);
      }
      state.potions.splice(i, 1);
    }
  }


}

function update_contactDamage(dt) {
  const p=state.player;
  // Enemigo vs jugador
  if (p.invuln <= 0) {
    for (const e of state.enemies) {
      if (e.type === 'kamikaze') continue;
      if (e.type === 'juggernaut' && e.jState !== 'dashing') continue;
      const ddx = p.x - e.x, ddy = p.y - e.y;
      const rr = (e.size + p.size) * 0.5;
      if (ddx*ddx + ddy*ddy < rr*rr) { damagePlayer(1); break; }
    }
  }


}

function update_drones(dt) {
  const p=state.player;
  // Drones
  if (state.drones.length > 0) {
    const N = state.drones.length;
    const baseR = 62 + Math.max(0, (N - 6) * 3);
    for (let i = 0; i < N; i++) {
      const d = state.drones[i];
      d.bob += dt * 3.5;
      const orbitAngle = (i / N) * TAU + TAU * 0.25 + Math.sin(d.bob * 0.4) * 0.05;
      const orbitR = baseR + Math.sin(d.bob) * 3;
      const tx = p.x + Math.cos(orbitAngle) * orbitR;
      const ty = p.y + Math.sin(orbitAngle) * orbitR;
      const kf = 1 - Math.exp(-9 * dt);
      d.x += (tx - d.x) * kf;
      d.y += (ty - d.y) * kf;
      const nearest = getNearestTarget(d.x, d.y);
      if (nearest) {
        d.angle = Math.atan2(nearest.y - d.y, nearest.x - d.x);
        d.cd -= dt;
        if (d.cd <= 0) {
          const n = d.lines, spread = 0.10;
          const total = (n - 1) * spread;
          const baseRadius = 4 + p.sizeLevel * 1.2;
          const baseDamage = 1 + Math.floor(p.sizeLevel * 0.75);
          for (let j = 0; j < n; j++) {
            const a = d.angle - total/2 + j*spread + (gameRandom() - 0.5) * 0.02;
            const isHoming = gameRandom() < p.homingChance;
            const isDupli = gameRandom() < p.dupliChance;
            spawnBullet(d.x + Math.cos(a)*10, d.y + Math.sin(a)*10, a, 820, {
              drone: true, bounces: p.bounces, homing: isHoming,
              dupli: isDupli ? p.dupliCount : 0,
              damage: baseDamage, radius: baseRadius
            });
          }
          d.cd = 0.5 + 0.10 * d.lines;
          Sfx.play('shoot', 70);
        }
      }
    }
  }


}

function update_darts(dt) {
  const p=state.player;
  // Dardos jugador
  for (let i = 0; i < state.darts.length; i++) {
    const d = state.darts[i];
    if (d.target) {
      const stillValid = (state.enemies.indexOf(d.target) !== -1) || isBossOrBall(d.target);
      if (!stillValid) { d.target = null; d.state = 'return'; }
    }
    if (d.state === 'follow') {
      const nearest = getNearestTarget(d.x, d.y);
      let dist2 = Infinity;
      if (nearest) dist2 = (nearest.x - d.x)**2 + (nearest.y - d.y)**2;
      if (nearest && dist2 < 450*450) { d.target = nearest; d.state = 'hunt'; }
      else {
        d.bob += dt * 3;
        const baseAngle = (i / Math.max(1, state.darts.length)) * TAU + state.time * 1.5;
        const tx = p.x + Math.cos(baseAngle) * 45;
        const ty = p.y + Math.sin(baseAngle) * 45;
        d.x += (tx - d.x) * Math.min(1, 12*dt);
        d.y += (ty - d.y) * Math.min(1, 12*dt);
        d.angle = baseAngle + Math.PI/2;
      }
    } else if (d.state === 'hunt' && d.target) {
      const ang = Math.atan2(d.target.y - d.y, d.target.x - d.x);
      d.angle = ang;
      d.x += Math.cos(ang) * 650 * dt;
      d.y += Math.sin(ang) * 650 * dt;
      const targetRadius = d.target.size !== undefined ? d.target.size/2 : (d.target.r || 20);
      const ddx = d.x - d.target.x, ddy = d.y - d.target.y;
      const rr = targetRadius + 6;
      if (ddx*ddx + ddy*ddy < rr*rr) {
        const targetIsBoss = isBossOrBall(d.target);
        if (d.type === 'explosive') {
          const radius = 90;
          spawnParticles(d.x, d.y, 30, '#fb7185', 1.5);
          state.shake = 14;
          Sfx.play('explode', 80);
          for (let j = state.enemies.length - 1; j >= 0; j--) {
            const e2 = state.enemies[j];
            const edx = e2.x - d.x, edy = e2.y - d.y;
            if (edx*edx + edy*edy < radius*radius) {
              e2.hp -= 3 * state.playerDamageMult;
              e2.hitFlash = 0.15;
              if (e2.hp <= 0) killEnemy(j);
            }
          }
          if (state.boss) {
            const edx = state.boss.x - d.x, edy = state.boss.y - d.y;
            if (edx*edx + edy*edy < radius*radius) {
              state.boss.hp -= 3 * state.playerDamageMult;
              if (state.boss.hp <= 0) killBoss();
            }
          }
          state.darts.splice(i, 1);
          i--;
          continue;
        } else {
          if (targetIsBoss) {
            if (state.boss) {
              state.boss.hp -= (d.target === state.boss ? 1 : BALANCE.ballDamage) * state.playerDamageMult;
              state.boss.hitFlash = 0.12;
              if (state.boss.hp <= 0) killBoss();
            }
          } else {
            const idx = state.enemies.indexOf(d.target);
            if (idx !== -1) {
              d.target.hp -= 1 * state.playerDamageMult;
              d.target.hitFlash = 0.12;
              if (d.target.hp <= 0) killEnemy(idx);
            }
          }
          spawnParticles(d.x, d.y, 5, '#fbbf24', 0.6);
          Sfx.play('hit', 25);
          d.target = null;
          const next = getNearestTarget(d.x, d.y);
          let nextDist2 = Infinity;
          if (next) nextDist2 = (next.x - d.x)**2 + (next.y - d.y)**2;
          if (next && nextDist2 < 450*450) { d.target = next; d.state = 'hunt'; }
          else d.state = 'return';
        }
      }
    } else if (d.state === 'return') {
      const ang = Math.atan2(p.y - d.y, p.x - d.x);
      d.angle = ang;
      d.x += Math.cos(ang) * 550 * dt;
      d.y += Math.sin(ang) * 550 * dt;
      const ddx = d.x - p.x, ddy = d.y - p.y;
      if (ddx*ddx + ddy*ddy < 45*45) d.state = 'follow';
    }
  }
}
