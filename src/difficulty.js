'use strict';
/* =============== ADAPTIVE =============== */
const RAPID_KILLS=8, KILL_WINDOW=15;
function checkAdaptive(dt) {
  if (state.bossActive) { state.adaptiveCheckTimer = 0; return; }
  state.adaptiveCheckTimer += dt;
  if (state.adaptiveCheckTimer < 15) return;
  state.adaptiveCheckTimer = 0;
  const levelSlow = state.levelTimer > 30;
  const noDamage = state.damageTimer > 22;
  const kills=state.recentKills;
  const fastKills=kills.length===RAPID_KILLS && state.time-kills[0]<=KILL_WINDOW;
  if (!(levelSlow && noDamage && fastKills)) return;
  const r = gameRandom();
  if (r < 0.40) {
    state.spawnRateMult = Math.max(0.55, state.spawnRateMult * 0.88);
    addFloat(state.player.x, state.player.y - 90, '¡MÁS ENEMIGOS!', '#ff5a6e');
  } else if (r < 0.72) {
    state.enemyHpMult = Math.min(2.5, state.enemyHpMult * 1.12);
    addFloat(state.player.x, state.player.y - 90, 'ENEMIGOS +VIDA', '#ff9a6e');
  } else {
    state.playerDamageMult = Math.max(0.5, state.playerDamageMult * 0.92);
    addFloat(state.player.x, state.player.y - 90, 'DAÑO -8%', '#fbbf24');
  }
  state.shake = Math.max(state.shake, 12);
  Sfx.play('explode', 400);
}

