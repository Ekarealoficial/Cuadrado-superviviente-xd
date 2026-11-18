'use strict';
/* =============== CARTAS =============== */
function getRegenInfo(level) {
  if (level === 0) return { interval: 50, amount: 1 };
  const totalReduction = level - 1;
  const cycles = Math.floor(totalReduction / 50);
  const interval = 50 - (totalReduction % 50);
  const amount = 1 + cycles;
  return { interval, amount };
}

function pickRandomCards(n) {
  const allCards = [...CARD_TYPES, ...SPECIAL_CARDS];
  const pool = [...allCards];
  const picked = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(gameRandom() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}
function openCardSelection() {
  if (playMode === 'online') state.inventoryOpen = false;
  state.cardChoices = pickRandomCards(3);
  mouse.down = false;
  state.laserCharging = false;
  state.laserChargeTime = 0;
  Sfx.play('cardpop');
}
function applyCard(card) {
  const p = state.player;
  card.apply(p,card);
}
function pickCard(card) {
  applyCard(card);
  state.pendingLevelUps--;
  state.cardChoices = null;
  state.cardRects = null;
  mouse.down = false;
  state.cam.zoom = Math.min(1.12, state.cam.zoom + 0.06);
  spawnParticles(state.player.x, state.player.y, 16, card.color, 0.9);
  Sfx.play('pick');
  addFloat(state.player.x, state.player.y - 55, card.name.toUpperCase(), card.color);
  if (state.pendingLevelUps > 0) {
    openCardSelection();
  }
}

