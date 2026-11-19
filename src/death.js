'use strict';
/* =============== EXPLOSIONES / MUERTE =============== */
function killEnemy(index) {
  const e = state.enemies[index];
  if (!e || e._dying) return;
  e._dying = true;
  if (e.type === 'dardante') state.enemyDarts = state.enemyDarts.filter(d => d.owner !== e);
  spawnParticles(e.x, e.y, 20, e.color, 1.1);
  spawnOrbs(e.x, e.y, e.xp);
  dropGreedBonus(e,e.xp);
  recordKill(e);
  state.score += Math.round(e.maxHp * 5);
  state.shake = Math.min(state.shake + 6, 16);
  state.cam.zoom = Math.min(1.15, state.cam.zoom + 0.04);
  Sfx.play('kill', 40);
  state.enemies.splice(index, 1);
  if(e.type==='splitter' && (e.generation||0)<2){
    const generation=(e.generation||0)+1,angle=gameRandom()*TAU;
    for(const sign of [-1,1]){
      const hp=Math.max(1,Math.floor(e.maxHp/2));
      state.enemies.push(createEnemy('splitter',e.x+sign*Math.cos(angle)*12,e.y+sign*Math.sin(angle)*12,
        {generation,size:e.size*.68,hp,maxHp:hp,speed:e.speed*1.65,xp:2}));
    }
  }
  if (e.type === 'kamikaze') explodeKamikaze(e);
}

function explodeKamikaze(e) {
  const radius = 100;
  spawnParticles(e.x, e.y, 35, '#ef4444', 1.8);
  spawnParticles(e.x, e.y, 18, '#fbbf24', 1.2);
  state.shake = 18;
  state.flash = 0.15;
  state.flashRGB = '255,100,50';
  Sfx.play('explode', 60);
  const p = state.player;
  const ddx = p.x - e.x, ddy = p.y - e.y;
  if (ddx*ddx + ddy*ddy < (radius+p.size/2)**2 && p.invuln <= 0) damagePlayer(1);
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const other = state.enemies[i];
    if (!other) continue;
    const dx = other.x - e.x, dy = other.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < radius) {
      other.hp -= 2;
      other.hitFlash = 0.15;
      other.x += (dx/d) * 40;
      other.y += (dy/d) * 40;
      if (other.hp <= 0) killEnemy(i);
    }
  }
}

function summonEnemies(invoker) {
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + gameRandom() * 0.4;
    const sx = invoker.x + Math.cos(a) * 45, sy = invoker.y + Math.sin(a) * 45;
    if (pointInWall(sx, sy, currentWalls)) continue;
    const type = gameRandom() < 0.5 ? 'normal' : 'fast';
    if (!rules.disabled.includes(type)) state.enemies.push(createEnemy(type, sx, sy));
  }
  spawnParticles(invoker.x, invoker.y, 30, '#8b5cf6', 1.3);
  state.shake = Math.min(state.shake + 8, 14);
}

function dropGreedBonus(e,xp) {
  const bonuses=state.player.greedLevel?chanceCount(.15*state.player.greedLevel):0;
  if (bonuses) {
    spawnOrbs(e.x + gameRand(-30, 30), e.y + gameRand(-30, 30), xp*.7*bonuses);
    addFloat(e.x, e.y - 25, '¡XP extra!', '#fbbf24');
  }
}
