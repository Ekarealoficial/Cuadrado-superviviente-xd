'use strict';
/* =============== LIGHTNING =============== */
function updateLightning(dt) {
  const p = state.player;
  if (p.lightningCount === 0) return;
  p.lightningCd -= dt;
  if (p.lightningCd > 0) return;
  p.lightningCd = 5;
  for (let n = 0; n < p.lightningCount; n++) {
    const targets = state.enemies;
    if (targets.length === 0 && !state.boss) break;
    let tx, ty;
    if (state.boss && gameRandom() < 0.5) { tx = state.boss.x; ty = state.boss.y; }
    else if (targets.length > 0) { const e = targets[Math.floor(gameRandom() * targets.length)]; tx = e.x; ty = e.y; }
    else break;
    state.lightningStrikes.push({ x: tx, y: ty, timer: 0.35, maxTimer: 0.35 });
    const radius = 80;
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e2 = state.enemies[i];
      const ddx = e2.x - tx, ddy = e2.y - ty;
      if (ddx*ddx + ddy*ddy < radius*radius) {
        e2.hp -= 3 * state.playerDamageMult;
        e2.hitFlash = 0.15;
        if (e2.hp <= 0) killEnemy(i);
      }
    }
    if (state.boss) {
      const bdx = state.boss.x - tx, bdy = state.boss.y - ty;
      if (bdx*bdx + bdy*bdy < radius*radius) {
        state.boss.hp -= 3 * state.playerDamageMult;
        state.boss.hitFlash = 0.15;
        if (state.boss.hp <= 0) killBoss();
      }
    }
    spawnParticles(tx, ty, 20, '#fde047', 1.2);
    state.shake = Math.min(state.shake + 8, 16);
  }
  Sfx.play('lightning', 150);
}

