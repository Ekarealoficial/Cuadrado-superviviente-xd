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
    picked.push({...pool.splice(idx, 1)[0]});
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
  state.upgrades=(state.upgrades||0)+1;
}
function pickCard(card) {
  if(!state.cardChoices?.includes(card))return;
  applyCard(card);
  if(state.bonusPicks>0)state.bonusPicks--;
  else state.pendingLevelUps=Math.max(0,state.pendingLevelUps-1);
  state.cardChoices = null;
  state.cardRects = null;
  mouse.down = false;
  state.cam.zoom = Math.min(1.12, state.cam.zoom + 0.06);
  spawnParticles(state.player.x, state.player.y, 16, card.color, 0.9);
  Sfx.play('pick');
  addFloat(state.player.x, state.player.y - 55, card.name.toUpperCase(), card.color);
  if (state.pendingLevelUps > 0 || state.bonusPicks > 0) {
    openCardSelection();
  }
}

function rewardSpot(x,y){
  // A worm can die while crossing outside the arena. Keep the drops reachable.
  const arena=state.arena,p=state.player;
  if(arena){x=clamp(x,arena.x+35,arena.x+arena.w-35);y=clamp(y,arena.y+35,arena.y+arena.h-35);}
  for(let i=0;i<24;i++){
    const t=i/23,px=x+(p.x-x)*t,py=y+(p.y-y)*t;
    const walls=getChunk(Math.floor(px/CHUNK_SIZE),Math.floor(py/CHUNK_SIZE)).walls;
    if(!walls.some(w=>aabbOverlapCircle(px,py,20,w)))return {x:px,y:py};
  }
  return {x:p.x,y:p.y};
}
function collectCardRelics(){
  if(state.over)return;
  for(let i=state.cardRelics.length-1;i>=0;i--){
    const r=state.cardRelics[i],p=state.player;
    if(Math.hypot(p.x-r.x,p.y-r.y)>p.size/2+17)continue;
    state.cardRelics.splice(i,1);
    state.bonusPicks++;
    if(!state.cardChoices)openCardSelection();
  }
}
