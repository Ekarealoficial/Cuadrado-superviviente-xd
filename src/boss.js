'use strict';
/* =============== BOSS =============== */
function livingBosses() {
  return state.boss ? [state.boss, ...(state.extraBosses || [])] : [];
}
function bossTargets() {
  return livingBosses().flatMap(b => b.pieces ? b.pieces.flatMap(piece => piece.parts) : b.state==='final' ? [] : b.parts ? [...(b.kind==='heart'?[b]:[]),...activeParts(b)] : [b]);
}
function bossFor(target) {
  if(target?.component)return livingBosses().some(b=>b.state!=='final'&&b.parts?.includes(target))&&target.hp>0?target:null;
  if(target?.wormSegment)return target._dying ? null : target;
  return livingBosses().find(b => b.state!=='final' && (b === target || b.balls.includes(target)));
}
function finishTarget(target) {
  if(target.component)partDefeated(target);
  else if (target.wormSegment) breakWormSegment(target);
  else if (target.balls) killBoss(target);
  else killEnemy(state.enemies.indexOf(target));
}

// Unrank a shuffled index within a group size. Sixteen bosses have 65,535
// possible groups; only three numbers travel in snapshots, even late in a run.
function chooseCount(n,k){
  let count=1;
  for(let i=1;i<=Math.min(k,n-k);i++)count=count*(n-i+1)/i;
  return Math.round(count);
}
function pickEncounter(){
  const pool=Object.keys(BOSS_NAMES).filter(k=>!rules.disabled.includes(k)).sort();
  if(!pool.length)return null;
  const roster=pool.join('+');
  if(state.encounterRoster!==roster){state.encounterRoster=roster;state.groupSize=1;state.bossCycle=[];state.encounterTiers=null;}
  let k=state.groupSize,n=chooseCount(pool.length,k),cycle=state.bossCycle;
  if(cycle[0]>=n){k=state.groupSize=Math.min(k+1,pool.length);n=chooseCount(pool.length,k);cycle=state.bossCycle=[];}
  if(weightedModes())return drawWeightedGroup(pool,k,n,cycle);
  if(!cycle.length){
    const stride=coprimeStep(n);
    cycle.push(0,Math.floor(gameRandom()*n),stride);
  }
  let rank=(cycle[1]+cycle[0]++*cycle[2])%n;
  const group=[];
  for(let i=0;k>0;i++){
    const count=chooseCount(pool.length-i-1,k-1);
    if(rank<count){group.push(pool[i]);k--;}else rank-=count;
  }
  return group;
}
let roomTargets=[];
function bossPrey(b){return roomTargets.length?roomTargets[(b.id-1)%roomTargets.length]:state.player;}
function spawnEncounter(group){
  if(!group?.length)return;
  const p=state.player,occupied=livingBosses().flatMap(b=>b.pieces?b.pieces.flatMap(q=>q.parts):[b]);
  if(!occupied.length){state.enemies=[];state.enemyDarts=[];state.enemyBullets=[];if(!state.rush)state.potions=[];}
  const profile=encounterProfile(group);
  const ordered=group.includes('worm')?['worm',...group.filter(id=>id!=='worm')]:group;
  for(const kind of ordered){
    const candidates=[];
    for(const orbit of [1,.8])for(let i=0;i<30;i++){
      const a=-Math.PI/2+i*TAU/30;
      const x=p.x+Math.cos(a)*490*orbit,y=p.y+Math.sin(a)*252*orbit;
      let space=Math.hypot(x-p.x,y-p.y)-p.size/2;
      for(const body of occupied)space=Math.min(space,Math.hypot(x-body.x,y-body.y)-body.size/2);
      candidates.push({x,y,space});
    }
    const pos=occupied.length?candidates.reduce((best,q)=>best.space>=q.space?best:q):candidates[0];
    spawnBoss({x:pos.x,y:pos.y},kind,profile);
    const b=livingBosses().at(-1);occupied.push(...(b.pieces?b.pieces.flatMap(q=>q.parts):[b]));
  }
}

function spawnBoss(position,kind='boss',profile=encounterProfile([kind])) {
  if(!state.boss)state.bossEncounters = (state.bossEncounters || 0) + 1;
  const growth=profile?.hp ?? Math.pow(BALANCE.bossGrowth,state.bossEncounters-1);
  const bossHp=Math.round(Math.min(Number.MAX_SAFE_INTEGER,BALANCE.bossHp*growth*state.enemyHpMult));
  state.bossActive = true;
  state.bossOmen = null;
  const p = state.player;
  let aw = 1366;
  let ah = 768;
  let ax = p.x - aw / 2, ay = p.y - ah / 2;
  if(position){
    const right=Math.max(ax+aw,position.x+90),bottom=Math.max(ay+ah,position.y+90);
    ax=Math.min(ax,position.x-90);ay=Math.min(ay,position.y-90);
    aw=right-ax;ah=bottom-ay;
  }
  if (state.boss && state.arena) {
    const old = state.arena;
    const right = Math.max(ax+aw,old.x+old.w), bottom = Math.max(ay+ah,old.y+old.h);
    ax = Math.min(ax,old.x); ay = Math.min(ay,old.y);
    aw = right-ax; ah = bottom-ay;
  }
  if(!state.arena?.chase)state.arena = {
    x: ax, y: ay, w: aw, h: ah,
    walls: [
      { x: ax - 60, y: ay - 60, w: aw + 120, h: 60, isArena: true },
      { x: ax - 60, y: ay + ah, w: aw + 120, h: 60, isArena: true },
      { x: ax - 60, y: ay - 60, w: 60, h: ah + 120, isArena: true },
      { x: ax + aw, y: ay - 60, w: 60, h: ah + 120, isArena: true }
    ]
  };
  const boss = PATTERN_BOSSES[kind]?createPatternBoss(kind,position||{x:p.x,y:ay+180},bossHp):kind==='singular' ? createSingular(position || {x:p.x,y:ay+180},bossHp) : kind==='worm' ? createWorm(position || {x:p.x,y:ay+180},bossHp) : {
    kind,
    x: position?.x ?? p.x, y: position?.y ?? ay + 200,
    size: 180,
    hp: bossHp, maxHp: bossHp,
    color: '#ff2255', hitFlash: 0,
    state: 'idle', timer: 3, dashAngle: 0, phase: 1,
    balls: [
      { side: 'left',   x: 0, y: 0, r: 36, state: 'attached', vx: 0, vy: 0, life: 0 },
      { side: 'right',  x: 0, y: 0, r: 36, state: 'attached', vx: 0, vy: 0, life: 0 }
    ]
  };
  boss.difficulty=profile;
  if(state.rush){
    boss.rushXp=300+state.xpNeeded*2;
    boss.awardedXp=0;
  }
  boss.id=++state.nextBossId;
  makeComponents(boss);
  if(ENCORE[kind]){
    const landing=point(boss),a=state.arena;
    const from=kind==='frontier'?{x:a.x+boss.size/2,y:landing.y}:kind==='general'?{x:a.x+a.w-boss.size/2,y:landing.y}:kind==='sovereign'?{x:landing.x,y:landing.y+65}:{x:landing.x,y:a.y+boss.size/2};
    boss.entry={from,to:landing};Object.assign(boss,from);
  }
  if(kind==='monolith'){
    makeScore(boss);boss.state='landing';wave(boss,.3,boss,false,0);
  }
  if (state.boss) state.extraBosses.push(boss);
  else state.boss = boss;
  if(!position){
    state.enemies = [];state.enemyDarts = [];state.enemyBullets = [];state.potions = [];
  }
  addFloat(boss.x, boss.y - boss.size/2 - 24, BOSS_NAMES[kind].toUpperCase(), boss.color);
  state.shake = 25;
  state.flash = 0.5;
  state.flashRGB = '255,60,100';
  Sfx.play('bossroar');
}

function killBoss(b = state.boss, completed = false) {
  if (!b || b._dying || !livingBosses().includes(b)) return;
  if(b.kind==='frontier'&&!completed&&b.phase===1&&b.hp<=0){b.hp=b.maxHp*.499;return;}
  if(PATTERN_BOSSES[b.kind] && !completed){if(b.state!=='final')startPatternFinal(b);return;}
  if(b.kind==='singular' && !completed){
    if(b.state!=='final')startSingularFinal(b);
    return;
  }
  if(b.kind==='frontier')endChase(b);
  if(b.kind==='sovereign')state.enemies=state.enemies.filter(e=>e.master!==b.id);
  b._dying = true;
  state.firstBossDefeatAt??=state.time;
  state.enemyBullets=state.enemyBullets.filter(s=>s.source!==b.id);
  state.cosmicZones=state.cosmicZones.filter(s=>s.source!==b.id);
  state.bossBombs=state.bossBombs.filter(s=>s.source!==b.id);
  state.bossLasers=state.bossLasers.filter(s=>s.source!==b.id);
  if(PATTERN_BOSSES[b.kind]){
    state.remnants.push({kind:b.kind,x:b.x,y:b.y,born:state.time,color:b.kind==='general'?state.player.color||b.color:b.color});
    bossCue(b.kind+'Release',b);
  }
  spawnParticles(b.x, b.y, 80, b.kind==='general'?state.player.color||b.color:b.color, 2);
  spawnParticles(b.x, b.y, 40, '#ffffff', 1.5);
  state.shake = 40;
  state.flash = 0.6;
  state.flashRGB = ({fractal:'255,140,224',clock:'255,223,150',crown:'233,204,255',
    beacon:'255,152,180',twins:'245,242,255',heart:'255,133,112',monolith:'176,242,255'})[b.kind]||'255,60,100';
  state.score += 5000;
  recordKill(b);
  const loot=rewardSpot(b.x,b.y);
  const xp=state.rush?b.rushXp-b.awardedXp:300+state.xpNeeded*2;
  dropGreedBonus(b,xp);
  const relicCount=state.rush?4:2;
  for(let i=0;i<relicCount;i++){
    const angle=Math.PI+i*TAU/relicCount;
    state.cardRelics.push(rewardSpot(loot.x+48*Math.cos(angle),loot.y+24+48*Math.sin(angle)));
  }
  if(state.rush)state.rush.defeated++;
  if(state.extra)state.extra.bosses++;
  addFloat(b.x, b.y - 60, '¡JEFE DERROTADO!', '#ffd54a');
  Sfx.play('bossdie');
  for (let i = 0; i < 25; i++) {
    const pos=rewardSpot(loot.x+gameRand(-150,150),loot.y+gameRand(-150,150));
    spawnOrbs(pos.x,pos.y,xp/25);
  }
  for (let i = 0; i < 3; i++) {
    state.potions.push({ ...rewardSpot(loot.x+gameRand(-100,100),loot.y+gameRand(-100,100)), type: 'large', value: 2, life: 60, maxLife: 60, bob: gameRandom() * TAU });
  }
  if (b === state.boss) state.boss = state.extraBosses.shift() || null;
  else state.extraBosses.splice(state.extraBosses.indexOf(b),1);
  if (state.boss) {
    state.bossLaserActive = livingBosses().some(other => other.kind==='boss' && other.phase >= 3);
    return;
  }
  state.completedEncounters=(state.completedEncounters||0)+1;
  if(state.completedEncounters<=3)(state.unlockTimes||=[])[state.completedEncounters-1]=state.time;
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
    if (dx*dx + dy*dy < (radius+p.size/2)**2) damagePlayer(1);
  }
  for (const b2 of state.bossBombs) {
    if (b2 === bomb || b2.exploded) continue;
    const dx = b2.x - bomb.x, dy = b2.y - bomb.y;
    if (dx*dx + dy*dy < 130*130) b2.timer = Math.min(b2.timer, 0.35);
  }
}

function startBossAttack(type, b = state.boss) {
  b.lastAttack=type;
  const p = bossPrey(b);
  if (type === 'dash') {
    b.state = 'dash_windup';
    b.timer = 0.7;
    b.dashAngle = Math.atan2(p.y - b.y, p.x - b.x);
  } else if (type === 'bombs') {
    b.state = 'attack';
    b.timer = 1.2;
    for (let i = 0; i < Math.round(6*(b.difficulty?.density||1)); i++) {
      let bx, by, tries = 0;
      do {
        bx = state.arena.x + 60 + gameRandom() * (state.arena.w - 120);
        by = state.arena.y + 60 + gameRandom() * (state.arena.h - 120);
        tries++;
        if (tries > 25) break;
      } while (Math.hypot(bx - p.x, by - p.y) < 140);
      state.bossBombs.push({ source:b.id,x: bx, y: by, r: 18, timer: 2.5 + i * 0.35, exploded: false, triggerTime: 0, fadeTimer: 0 });
    }
  } else if (type === 'balls') {
    b.state = 'attack';
    b.timer = 0.6;
    const ballSpeed = [0,700,930,1080][b.phase]*(b.difficulty?.shot||1);
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
function getBossIdleTime(b) {
  if (b.phase >= 3) return 0.66;
  if (b.phase >= 2) return 1.3;
  return 1.9;
}

function updateBoss(dt, b = state.boss) {
  if (!b) return;
  const p = state.player;

  if(PATTERN_BOSSES[b.kind]){updatePatternBoss(b,dt);if(b===state.boss)updateArenaHazards(dt);return;}
  if(b.pieces)tickLayers(b,dt);
  if (b.pieces || b.kind==='singular') {
    if(b.pieces)updateWorm(b,dt);else updateSingular(b,dt);
    if(b===state.boss)updateArenaHazards(dt);
    return;
  }
  b.hitFlash=Math.max(0,b.hitFlash-dt);
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

  const target=bossPrey(b),toPx = target.x - b.x, toPy = target.y - b.y;
  const dist = Math.hypot(toPx, toPy) || 1;

  if (b.state === 'idle') {
    b.x += (toPx / dist) * 60 * moveTime(b,dt)*(b.difficulty?.movement||1);
    b.y += (toPy / dist) * 60 * moveTime(b,dt)*(b.difficulty?.movement||1);
    b.timer -= dt;
    if (b.timer <= 0) {
      const attacks = ['dash', 'bombs', 'balls'];
      if (b.phase >= 3) attacks.push('laser');
      const move=attacks[Math.floor(gameRandom()*attacks.length)];startBossAttack(move,b);
      if(move!=='bombs'&&canCoverArena(b)&&gameRandom()<.44+.12*b.phase+.2*(b.difficulty?.overlap||0))addPatternLayer(b,'bombs');
    }
  } else if (b.state === 'dash_windup') {
    b.timer -= dt;
    if (b.timer <= 0) { b.state = 'dash'; b.timer = 0.55; Sfx.play('dash', 100); }
  } else if (b.state === 'dash') {
    b.timer -= dt;
    b.x += Math.cos(b.dashAngle) * 1600 * moveTime(b,dt)*(b.difficulty?.movement||1);
    b.y += Math.sin(b.dashAngle) * 1600 * moveTime(b,dt)*(b.difficulty?.movement||1);
    if (p.invuln <= 0) {
      const rr = (b.size/2 + p.size/2);
      if (visibleContact(b,p,rr)) damagePlayer(2);
    }
    if (b.timer <= 0) { b.state = 'idle'; b.timer = getBossIdleTime(b)*(b.difficulty?.recovery||1); }
  } else if (b.state === 'attack') {
    b.timer -= dt;
    if (b.timer <= 0) { b.state = 'idle'; b.timer = getBossIdleTime(b)*(b.difficulty?.recovery||1); }
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
      const travel=dt*(playMode==='sandbox'?(state.labShotSpeed||1):1);
      ball.x += ball.vx * travel; ball.y += ball.vy * travel;
      ball.life -= dt;
      if (ball.x - ball.r < state.arena.x) { ball.x = state.arena.x + ball.r; ball.vx = Math.abs(ball.vx); }
      if (ball.x + ball.r > state.arena.x + state.arena.w) { ball.x = state.arena.x + state.arena.w - ball.r; ball.vx = -Math.abs(ball.vx); }
      if (ball.y - ball.r < state.arena.y) { ball.y = state.arena.y + ball.r; ball.vy = Math.abs(ball.vy); }
      if (ball.y + ball.r > state.arena.y + state.arena.h) { ball.y = state.arena.y + state.arena.h - ball.r; ball.vy = -Math.abs(ball.vy); }
      if (blockBossBall(ball)) continue;
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

  if (b === state.boss) updateArenaHazards(dt);
}
function updateArenaHazards(dt){
  const p=state.player;
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
    if (state.bossLaserTimer <= 0 && !livingBosses().some(b=>HEAVY_MOVES.has(b.state)||b.waitFinal)) {
      state.bossLaserTimer = 2.0;
      const edges = ['top', 'bottom', 'left', 'right'];
      const edge = edges[Math.floor(gameRandom() * 4)];
      let lx, ly, la;
      if (edge === 'top') { lx = state.arena.x + gameRandom() * state.arena.w; ly = state.arena.y; la = Math.PI/2 + gameRand(-0.6, 0.6); }
      else if (edge === 'bottom') { lx = state.arena.x + gameRandom() * state.arena.w; ly = state.arena.y + state.arena.h; la = -Math.PI/2 + gameRand(-0.6, 0.6); }
      else if (edge === 'left') { lx = state.arena.x; ly = state.arena.y + gameRandom() * state.arena.h; la = gameRand(-0.6, 0.6); }
      else { lx = state.arena.x + state.arena.w; ly = state.arena.y + gameRandom() * state.arena.h; la = Math.PI + gameRand(-0.6, 0.6); }
      state.bossLasers.push({ source:livingBosses().find(o=>o.kind==='boss'&&o.phase>=3)?.id,x: lx, y: ly, angle: la, warmup: 1.0, active: 1.6, width: 70, state: 'warmup' });
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
        if (proj > 0 && proj<=bossLaserReach() && Math.abs(perp) < ls.width/2 + p.size/2) damagePlayer(1);
      }
    }
  }
}


function blockBossBall(ball) {
  if (ball.state !== 'flying') return false;
  const shield=state.shields.find(sh=>Math.hypot(ball.x-sh.x,ball.y-sh.y)<ball.r+14);
  if (!shield) return false;
  shield.hp--; ball.state='returning';
  spawnParticles(shield.x,shield.y,10,'#4df3ff'); Sfx.play('shieldblock',40);
  if(shield.hp<=0)state.shields.splice(state.shields.indexOf(shield),1);
  return true;
}
