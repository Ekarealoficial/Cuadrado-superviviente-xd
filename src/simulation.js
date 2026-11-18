'use strict';
/* =============== UPDATE =============== */
function update(dt, worldStep = true, commands = null) {
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
  const targetZoom=p.frameTime>0 ? 0.86 : 1;
  state.cam.zoom += (targetZoom - state.cam.zoom) * Math.min(1, 4.5 * dt);
  currentWalls = getVisibleChunks(state.cam);
  if (state.bossActive && state.arena) currentWalls = currentWalls.concat(state.arena.walls);

  if (state.over) { state.overTimer += dt; return; }
  if (playMode !== 'online' && (state.cardChoices || state.inventoryOpen)) return;

  if (worldStep) state.time += dt;
  state.levelTimer += dt;
  state.damageTimer += dt;

  update_regeneration(dt);
  update_abilityCooldowns(dt);
  update_stormAndBossSchedule(dt, worldStep);
  update_movementAndWeapons(dt, worldStep, commands);
  updateExpansion(dt,worldStep);
  if(state.stopUntil<=state.time)updateCardFields(dt,worldStep);
  if(state.stopUntil>state.time){
    update_shieldPositions(dt);update_experience(worldStep?dt:0);update_potions(worldStep?dt:0);return;
  }
  update_shieldPositions(dt);
  update_playerProjectiles(dt);
  if (worldStep) update_enemyProjectiles(dt);
  update_projectileCancellation(dt);
  update_shieldBlocking(dt);
  update_shieldPush(dt);
  repelPlasma();
  update_enemyProjectileHits(dt);
  if (worldStep) {
    update_spawning(dt);
    update_enemyAI(dt);
    update_enemySeparation(dt);
  }
  update_projectileHits(dt);
  update_enemyDarts(worldStep ? dt : 0);
  update_experience(worldStep ? dt : 0);
  update_potions(worldStep ? dt : 0);
  repelPlasma();
  update_contactDamage(dt);
  update_drones(dt);
  update_darts(dt);
}

function projectileImpact(target, bullet, factor = 1) {
  const p = state.player;
  poisonHit(target, bullet);
  if (p.frost) {
    cardPulse('frost',target);
    target.slow = Math.max(target.slowUntil > state.time ? target.slow : 0, Math.min(1, p.frost / 10));
    target.slowUntil = state.time + 2;
  }
  const damage = bullet.damage * attackMultiplier(target) * factor;
  target.hp -= damage;
  if (!p.explosive || gameRandom() >= stackingChance(.15, p.explosive)) return;
  spawnParticles(bullet.x, bullet.y, 22, '#ff9c52', 1.4);
  Sfx.play('explode', 80);
  target.hp -= damage;
  for (const e of state.enemies.slice()) {
    if (e === target || e._dying || Math.hypot(e.x-bullet.x,e.y-bullet.y) > 80+e.size/2) continue;
    e.hp -= damage;
    e.hitFlash = .15;
    if (e.hp <= 0) killEnemy(state.enemies.indexOf(e));
  }
  for (const boss of bossTargets()) {
    if (boss === target || Math.hypot(boss.x-bullet.x,boss.y-bullet.y)>80+boss.size/2) continue;
    boss.hp -= damage;
    if (boss.hp <= 0) finishTarget(boss);
  }
}
function moveTime(entity,dt) {
  return entity.slowUntil > state.time ? dt * (1 - entity.slow) : dt;
}
const poisonOwners = new WeakMap();
function poisonHit(target, bullet) {
  if (!bullet.venom) return;
  const dps = bullet.venom * attackMultiplier(target);
  if (!(target.venomTime > 0) || dps >= target.venomDps) {
    target.venomDps = dps;
    poisonOwners.set(target, state);
  }
  target.venomTime=Math.max(target.venomTime||0,2+bullet.venom);
}

function updateCardFields(dt,worldStep) {
  const p=state.player;
  if(p.gravity){
    p.gravityCd=(p.gravityCd||0)-dt;
    if(p.gravityCd<=0){
      const target=getNearestTarget(p.x,p.y);
      if(target){
        p.field={x:target.x,y:target.y,r:75+20*p.gravity,time:1.4,born:state.time};
        p.gravityCd=7;
      }
    }
  }
  if(p.field)p.field.time-=dt;
  if(p.frameTime>0){
    p.frameTime=Math.max(0,p.frameTime-dt);
    p.echoTimer-=dt;
    if(p.echoTimer<=0 && Math.hypot(p.vx,p.vy)>30){
      p.echoes.push({x:p.x,y:p.y});p.echoTimer=.12;
    }
    if(!p.frameTime)p.echoes=[];
  }
  p.blades=[];
  for(let i=0;i<(p.swords||0);i++){
    const angle=state.time*3+i*TAU/p.swords;
    p.blades.push({x:p.x+Math.cos(angle)*64,y:p.y+Math.sin(angle)*64,angle});
  }
  if(!p.field && !p.blades.length && !p.frameTime && !worldStep)return;
  const targets=state.enemies.concat(bossTargets());
  for(const e of targets){
    if(e._dying)continue;
    let damage=0;
    if(worldStep && e.venomTime>0){
      e.hp-=e.venomDps*Math.min(dt,e.venomTime);
      if (e.hp <= 0) {
        const active = state;
        state = poisonOwners.get(e) || active;
        finishTarget(e);
        state = active;
        continue;
      }
      e.venomTime-=dt;
      if(e.venomTime<=0)e.venomDps=0;
    }
    if(p.field){
      const f=p.field,dx=f.x-e.x,dy=f.y-e.y,d=Math.hypot(dx,dy);
      if(d<=f.r+e.size/2){
        if(f.time<=0)damage+=(3+2*p.gravity)*attackMultiplier(e);
        else if(d>1){
          const pull=Math.min(d,180*dt)/d;
          moveWithWalls(e,dx*pull,dy*pull,currentWalls);
        }
      }
    }
    for(const blade of p.blades)if(Math.hypot(e.x-blade.x,e.y-blade.y)<e.size/2+13)
      damage+=12*dt*attackMultiplier(e);
    if(p.frameTime>0 && Math.hypot(p.vx,p.vy)>30 && Math.hypot(e.x-p.x,e.y-p.y)<(e.size+p.size)/2+5){
      damage+=(29+5*state.specialCards.frames.totalCards)*dt*attackMultiplier(e);
      e.hitFlash=.12;
      if(!p.impact || state.time-p.impact.born>.14)
        p.impact={x:(p.x+e.x)/2,y:(p.y+e.y)/2,born:state.time};
    }
    if(damage){
      e.hp-=damage;
      if(e.hp<=0)finishTarget(e);
    }
  }
  if(p.field?.time<=0){
    p.burst={x:p.field.x,y:p.field.y,r:p.field.r,born:state.time};
    p.field=null;
  }
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
          e.hp -= 3 * attackMultiplier(e);
          e.hitFlash = 0.15;
          anyHit = true;
          if (e.hp <= 0) killEnemy(i);
        }
      }
      for (const boss of bossTargets()) {
        if (!isOnScreen(boss.x,boss.y)) continue;
        state.lightningStrikes.push({ x: boss.x, y: boss.y, timer: 0.3, maxTimer: 0.3 });
        boss.hp -= 3 * attackMultiplier(boss);
        boss.hitFlash = 0.15;
        anyHit = true;
        if (boss.hp <= 0) finishTarget(boss);
      }
      if (anyHit) Sfx.play('lightning', 120);
    }
    if (state.thunderRain.timer <= 0) state.thunderRain.active = false;
  }

  if (!worldStep) return;
  if (playMode!=='sandbox' && !state.bossActive) {
    const rate=rules.difficulty;
    state.bossSpawnTimer-=dt*rate;
    if(!state.bossOmen && state.bossSpawnTimer<=20*rate){
      const kind=pickEncounter();
      if(kind)state.bossOmen={kind,start:state.time};
      else state.bossSpawnTimer=180;
    }
    if(state.bossSpawnTimer<=0 && state.bossOmen)spawnBoss(null,state.bossOmen.kind);
  }
  checkAdaptive(dt * rules.difficulty);


}

function movementDirection() {
  if(touchMove.x || touchMove.y)return touchMove;
  return {
    x: Number(!!(keys.d || keys.arrowright)) - Number(!!(keys.a || keys.arrowleft)),
    y: Number(!!(keys.s || keys.arrowdown)) - Number(!!(keys.w || keys.arrowup))
  };
}
function movePlayer(p,dt,dx,dy,walls) {
  if(p.iceUntil>state.time){p.vx=0;p.vy=0;return;}
  // Movimiento (con dash)
  if (p.dashTimer > 0) {
    p.vx = Math.cos(p.dashAngle) * 1650;
    p.vy = Math.sin(p.dashAngle) * 1650;
  } else {
    const moving = (dx !== 0 || dy !== 0);
    if (moving) { const l = Math.max(1,Math.hypot(dx, dy)); dx /= l; dy /= l; }
    const response = moving ? 16 : 11;
    const k = 1 - Math.exp(-response * dt);
    p.vx += (dx * p.speed * (p.frameTime>0 ? 4 : 1) - p.vx) * k;
    p.vy += (dy * p.speed * (p.frameTime>0 ? 4 : 1) - p.vy) * k;
  }
  const res = moveWithWalls(p, p.vx * dt, p.vy * dt, walls);
  if (res.blockedX) p.vx = 0;
  if (res.blockedY) p.vy = 0;

}

function applyControl(dt, direction, command) {
  state.viewDelay=Number.isFinite(command?.[6]) ? clamp(state.time-command[6],0,.18) : 0;
  const p=state.player;
  movePlayer(p,dt,direction.x,direction.y,currentWalls);
  if (command && state.arena) {
    const a=state.arena,h=p.size/2;
    p.x=clamp(p.x,a.x+h,a.x+a.w-h);
    p.y=clamp(p.y,a.y+h,a.y+a.h-h);
  }
  if (p.dashTimer > 0) {
    p.invuln = Math.max(p.invuln, 0.05);
    spawnParticles(p.x, p.y, 1, p.color || rules.color, 0.7);
  }
  // Fin del dash
  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    if (p.dashTimer <= 0) {
      p.vx = 0; p.vy = 0;
      if (p.pendingDashes > 0 && state.specialCards.dash.charges > 0) {
        p.pendingDashes--;
        const target = getWorldMouse();
        p.dashAngle = Math.atan2(target.y - p.y, target.x - p.x);
        p.dashTimer = 0.18;
        p.invuln = Math.max(p.invuln, 0.3);
        state.specialCards.dash.charges--;
        if (state.specialCards.dash.cooldown <= 0) state.specialCards.dash.cooldown = state.specialCards.dash.cooldownMax;
        spawnParticles(p.x, p.y, 12, p.color || rules.color, 1);
      } else {
        p.pendingDashes = 0;
      }
    }
  }

  const wm = getWorldMouse();
  p.angle = command ? command[4] : Math.atan2(wm.y - p.y, wm.x - p.x);
  p.fireCd -= dt;

  // Disparo / carga láser
  if (command ? command[5] && !state.inventoryOpen && !state.cardChoices : mouse.down) {
    if (p.laserCount > 0) {
      state.laserCharging = true;
      state.laserChargeTime += dt;
      if (p.fireCd <= 0 && p.shots > 1) {
        shoot(p.shots - 1,command?.[0]);
        p.fireCd = p.fireCdBase;
      }
    } else {
      if (p.fireCd <= 0) {
        shoot(p.shots,command?.[0]);
        p.fireCd = p.fireCdBase;
      }
    }
  } else {
    if (state.laserCharging) {
      fireLasers(state.laserChargeTime,command?.[0]);
      state.laserCharging = false;
      state.laserChargeTime = 0;
    }
  }
}
function update_movementAndWeapons(dt, worldStep = true, commands = null) {
  if (commands) {
    for (const c of commands) applyControl(c[1],{x:c[2],y:c[3]},c);
  } else applyControl(dt,movementDirection(),null);
  if (state.player.invuln > 0) state.player.invuln -= dt;
  if(state.stopUntil>state.time)return;
  updateLasersFiring(dt);

  updateLightning(dt);
  if (worldStep && state.bossActive) for (const boss of livingBosses()) updateBoss(dt,boss);


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

function advanceBullet(b,p,dt) {
    b.prevX=b.x;b.prevY=b.y;
    if (b.homing) {
      const nearest = getNearestTarget(b.x, b.y);
      if (nearest) {
        const targetAngle = Math.atan2(nearest.y - b.y, nearest.x - b.x);
        const currentAngle = Math.atan2(b.vy, b.vx);
        let diff = targetAngle - currentAngle;
        while (diff > Math.PI) diff -= TAU;
        while (diff < -Math.PI) diff += TAU;
        const turn = 7.5 * Math.max(1,p.homingChance) * dt;
        const newAngle = currentAngle + clamp(diff, -turn, turn);
        const spd = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(newAngle) * spd; b.vy = Math.sin(newAngle) * spd;
      }
    }
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
}

function update_playerProjectiles(dt) {
  const p=state.player;
  // Balas jugador
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    advanceBullet(b,p,dt);
    if (b.life <= 0) { state.bullets.splice(i, 1); continue; }
    let removed = false;
    for (const w of currentWalls) {
      if (aabbOverlapCircle(b.x, b.y, b.r, w)) {
        b.prevX=b.x;b.prevY=b.y;
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
      const rr = p.size/2 + b.r;
      if (visibleContact(b,p,rr)) {
        damagePlayer(b.damage||1);
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
    if (playMode!=='sandbox' && state.spawnTimer <= 0) {
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
    if (!e) continue;
    const travel = moveTime(e,dt);
    const toPx = p.x - e.x, toPy = p.y - e.y;
    const distToPlayer = Math.hypot(toPx, toPy) || 1;

    if(updateExpansionEnemy(e,p,dt,travel,distToPlayer))continue;
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
      moveWithWalls(e, mvx * e.speed * travel, mvy * e.speed * travel, currentWalls);
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
      moveWithWalls(e, (mvx/ml) * e.speed * travel, (mvy/ml) * e.speed * travel, currentWalls);
      e.shootCd -= dt;
      if (e.shootCd <= 0) { summonEnemies(e); e.shootCd = 5 + gameRandom() * 2; Sfx.play('teleport', 150); }
    } else if (e.type === 'teleporter') {
      const dirX = toPx / distToPlayer, dirY = toPy / distToPlayer;
      e.wob += dt * 4;
      moveWithWalls(e, dirX * e.speed * travel, dirY * e.speed * travel, currentWalls);
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
      moveWithWalls(e, dirX * e.speed * travel, dirY * e.speed * travel, currentWalls);
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
      moveWithWalls(e, (mvx/ml) * e.speed * travel, (mvy/ml) * e.speed * travel, currentWalls);
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
        if (e.jTimer <= 0) { e.jState = 'dashing'; e.jTimer = 0.6; Sfx.play('dash', 100); }
      } else if (e.jState === 'dashing') {
        e.jTimer -= dt;
        const res2 = moveWithWalls(e, Math.cos(e.jAngle) * 1800 * travel, Math.sin(e.jAngle) * 1800 * travel, currentWalls);
        if (!e.jHit && p.invuln <= 0) {
          const rr = (e.size + p.size) * 0.5;
          if (visibleContact(e,p,rr)) { damagePlayer(2); e.jHit = true; }
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
      moveWithWalls(e, nx * e.speed * travel, ny * e.speed * travel, currentWalls);
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

function reboundFromTarget(shot, surface, center, radius) {
  if (!shot.dupli && !shot.bounces) return false;
  let dx=shot.x-center.x, dy=shot.y-center.y;
  if (!dx && !dy) { dx=-shot.vx || (shot.vy ? 0 : 1); dy=-shot.vy; }
  const length=Math.hypot(dx,dy), nx=dx/length, ny=dy/length;
  const dot=Math.min(0,shot.vx*nx+shot.vy*ny);
  shot.vx-=2*dot*nx; shot.vy-=2*dot*ny;
  shot.x=shot.prevX=surface.x+nx*(radius+1);
  shot.y=shot.prevY=surface.y+ny*(radius+1);
  if (shot.dupli>0) {
    shot.dupli--;
    const offset=gameRandom()<.5 ? .4 : -.4;
    const angle=Math.atan2(shot.vy,shot.vx)+offset;
    spawnBullet(shot.x,shot.y,angle,Math.hypot(shot.vx,shot.vy),{
      drone:shot.drone,bounces:shot.bounces,homing:shot.homing,dupli:shot.dupli,
      damage:shot.damage,radius:shot.r,viewDelay:shot.viewDelay
    });
    spawnParticles(shot.x,shot.y,4,'#ff4dd2',.7);
  } else {
    shot.bounces--;
    spawnParticles(shot.x,shot.y,4,'#fbbf24',.6);
  }
  return true;
}

function update_projectileHits() {
  enemyGrid.rebuild(state.enemies);
  const bosses=bossTargets();
  for (let i=state.bullets.length-1;i>=0;i--) {
    const shot=state.bullets[i];
    const dx=shot.x-(shot.prevX??shot.x),dy=shot.y-(shot.prevY??shot.y);
    const range=45+shot.r+Math.hypot(dx,dy)/2+(shot.viewDelay||0)*1800;
    let first=Infinity, victim, surface, center, radius;
    function consider(body,owner,r) {
      if (owner._dying) return;
      const pos=combatPosition(body,shot.viewDelay);
      const t=bulletEntry(shot,pos,r+shot.r);
      if (t<first) { first=t;victim=owner;surface=body;center=pos;radius=r+shot.r; }
    }
    for(const e of enemyGrid.query(shot.x-dx/2,shot.y-dy/2,range)) consider(e,e,e.size/2);
    for(const boss of bosses){
      consider(boss,boss,boss.size/2);
      for(const ball of boss.balls)if(ball.state!=='attached')consider(ball,boss,ball.r);
    }
    if (!victim) continue;
    shot.x-=dx*(1-first);shot.y-=dy*(1-first);
    projectileImpact(victim,shot,victim===surface?1:BALANCE.ballDamage);
    victim.hitFlash=.12;
    spawnParticles(shot.x,shot.y,5,victim.color,.6);
    if(victim.hp<=0)finishTarget(victim);
    else Sfx.play('hit',25);
    if(!reboundFromTarget(shot,surface,center,radius))state.bullets.splice(i,1);
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
      const rr = p.size/2 + 6;
      if (visibleContact(d,p,rr)) {
        damagePlayer(1,true);
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
      if (ddx*ddx + ddy*ddy < rr*rr) {
        if(visibleContact(e,p,rr)){damagePlayer(1);break;}
      }
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
        const owner = bossFor(d.target);
        if (d.type === 'explosive') {
          const radius = 90;
          spawnParticles(d.x, d.y, 30, '#fb7185', 1.5);
          state.shake = 14;
          Sfx.play('explode', 80);
          for (let j = state.enemies.length - 1; j >= 0; j--) {
            const e2 = state.enemies[j];
            const edx = e2.x - d.x, edy = e2.y - d.y;
            if (edx*edx + edy*edy < radius*radius) {
              e2.hp -= 3 * attackMultiplier(e2);
              e2.hitFlash = 0.15;
              if (e2.hp <= 0) killEnemy(j);
            }
          }
          for (const boss of bossTargets()) {
            const direct = boss === owner;
            if (direct || Math.hypot(boss.x-d.x,boss.y-d.y)<radius+boss.size/2) {
              const factor=direct && d.target!==boss ? BALANCE.ballDamage : 1;
              expansionHit(boss,3*factor);
            }
          }
          state.darts.splice(i, 1);
          i--;
          continue;
        } else {
          if (owner) {
            expansionHit(owner,d.target===owner?1:BALANCE.ballDamage);
          } else {
            const idx = state.enemies.indexOf(d.target);
            if (idx !== -1) {
              d.target.hp -= 1 * attackMultiplier(d.target);
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
