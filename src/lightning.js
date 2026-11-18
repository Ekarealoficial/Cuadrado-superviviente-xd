'use strict';
/* =============== LIGHTNING =============== */
function updateLightning(dt) {
  const p = state.player;
  if (p.lightningCount === 0) return;
  p.lightningCd -= dt;
  if (p.lightningCd > 0) return;
  p.lightningCd = 5;
  for (let n = 0; n < p.lightningCount; n++) {
    const bosses = bossTargets();
    const targets = bosses.length && (!state.enemies.length || gameRandom()<.5) ? bosses : state.enemies;
    if (!targets.length) break;
    const {x:tx,y:ty} = targets[Math.floor(gameRandom()*targets.length)];
    state.lightningStrikes.push({ x: tx, y: ty, timer: 0.35, maxTimer: 0.35 });
    const radius = 80;
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e2 = state.enemies[i];
      const ddx = e2.x - tx, ddy = e2.y - ty;
      if (ddx*ddx + ddy*ddy < radius*radius) {
        e2.hp -= 3 * attackMultiplier(e2);
        e2.hitFlash = 0.15;
        if (e2.hp <= 0) killEnemy(i);
      }
    }
    for (const boss of bosses) {
      const bdx = boss.x - tx, bdy = boss.y - ty;
      if (bdx*bdx + bdy*bdy < radius*radius) {
        boss.hp -= 3 * attackMultiplier(boss);
        boss.hitFlash = 0.15;
        if (boss.hp <= 0) finishTarget(boss);
      }
    }
    spawnParticles(tx, ty, 20, '#fde047', 1.2);
    state.shake = Math.min(state.shake + 8, 16);
  }
  Sfx.play('lightning', 150);
}

