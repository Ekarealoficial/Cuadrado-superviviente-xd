'use strict';
/* =============== LÁSER =============== */
function fireLasers(holdTime, commandId=0, output=state.lasersFiring) {
  const p = state.player;
  const count = p.laserCount;
  if (count === 0 || holdTime < 0.15) return;
  const width = 20 + holdTime * 25;
  const damage = width * 0.4;
  output.push({commandId,
    startAngle: p.angle, sweep: 0, sweepSpeed: 6,
    width, damage, count, holdTime
  });
  if (output===state.lasersFiring) state.shake = Math.min(state.shake + 8, 20);
  Sfx.play('laser', 300);
}

function updateLasersFiring(dt) {
  const p = state.player;
  const range = 2000;
  for (let i = state.lasersFiring.length - 1; i >= 0; i--) {
    const lf = state.lasersFiring[i];
    lf.sweep += lf.sweepSpeed * dt;
    if (lf.sweep >= TAU) { state.lasersFiring.splice(i, 1); continue; }
    for (let k = 0; k < lf.count; k++) {
      const angle = p.angle + lf.sweep + (k / lf.count) * TAU;
      for (let j = state.enemies.length - 1; j >= 0; j--) {
        const e = state.enemies[j];
        if (laserHits(e.x, e.y, e.size / 2, p.x, p.y, angle, lf.width, range)) {
          e.hp -= lf.damage * dt * attackMultiplier(e);
          e.hitFlash = 0.05;
          if (e.hp <= 0) killEnemy(j);
        }
      }
      if (state.boss) {
        const b = state.boss;
        if (laserHits(b.x, b.y, b.size / 2, p.x, p.y, angle, lf.width, range)) {
          b.hp -= lf.damage * dt * attackMultiplier(b);
          b.hitFlash = 0.05;
          if (b.hp <= 0) killBoss();
        }
        for (const ball of b.balls) {
          if (ball.state === 'attached') continue;
          if (laserHits(ball.x, ball.y, ball.r, p.x, p.y, angle, lf.width, range)) {
            b.hp -= lf.damage * dt * attackMultiplier(ball) * 0.5;
            if (b.hp <= 0) { killBoss(); break; }
          }
        }
      }
    }
  }
}

