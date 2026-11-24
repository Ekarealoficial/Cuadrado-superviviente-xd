'use strict';
/* =============== ENEMIGOS =============== */
const ENEMY_TYPES = {
  pulseRing:{size:31,hp:5,speed:105,color:'#8e55ce',xp:6},
  erratic:{size:22,hp:3,speed:178,color:'#ff993b',xp:5},
  twinCannon:{size:42,hp:10,speed:73,color:'#af404b',xp:10},
  rebound:{size:55,hp:15,speed:113,color:'#294e9b',xp:10},
  tackler: {size:28,hp:5,speed:130,color:'#ff9865',xp:6},
  splitter: {size:42,hp:8,speed:53,color:'#5cff9a',xp:4},
  cannon: {size:48,hp:12,speed:74,color:'#ffab4c',xp:10},
  frostMage: {size:34,hp:9,speed:96,color:'#80dfff',xp:11},
  normal:     { size: 28, hp: 2, speed: 95,  color: '#ff5a6e', xp: 3 },
  fast:       { size: 18, hp: 1, speed: 195, color: '#ffc857', xp: 2 },
  tank:       { size: 52, hp: 7, speed: 62,  color: '#b06bff', xp: 8 },
  shooter:    { size: 26, hp: 3, speed: 145, color: '#ff8c42', xp: 6 },
  invoker:    { size: 34, hp: 5, speed: 70,  color: '#8b5cf6', xp: 12 },
  teleporter: { size: 24, hp: 2, speed: 110, color: '#06b6d4', xp: 7 },
  kamikaze:   { size: 22, hp: 2, speed: 250, color: '#ef4444', xp: 4 },
  dardante:   { size: 32, hp: 4, speed: 110, color: '#fbbf24', xp: 8 },
  juggernaut: { size: 90, hp: 80, speed: 0,  color: '#9f1239', xp: 50 }
};

// Transfers part of a donor's scheduled spawns over a 20-second transition.
const rotations={normal:[5,'splitter',.55],fast:[15,'tackler',.65],
  shooter:[25,'cannon',.65],invoker:[35,'frostMage',.7]};
const advancedRotations={normal:[2,'pulseRing',.37],fast:[2,'erratic',.43],
  shooter:[3,'twinCannon',.43],tank:[3,'rebound',.54]};
function chooseEnemyType(t){
  const donor=baseEnemyType(playMode==='sandbox'&&lab.spawnWaves?Math.max(120,t):t),swap=rotations[donor];
  if(state.firstBossDefeatAt == null) return donor==='dardante'?'shooter':donor;
  const elapsed = t - state.firstBossDefeatAt * rules.difficulty;
  const next=advancedRotations[donor];
  if(next && state.completedEncounters>=next[0] && !rules.disabled.includes(next[1])){
    const elapsedReal=t/rules.difficulty-state.unlockTimes[next[0]-1];
    if(gameRandom()<next[2]*clamp(elapsedReal/25,0,1))return next[1];
  }
  if(swap && elapsed>=swap[0] && !rules.disabled.includes(swap[1]) &&
      gameRandom()<swap[2]*Math.min(1,(1+elapsed-swap[0])/20))return swap[1];
  return donor;
}
function baseEnemyType(t) {
  const r = gameRandom();
  if (t < 20) return r < 0.85 ? 'normal' : 'fast';
  if (t < 40) return r < 0.50 ? 'normal' : (r < 0.85 ? 'fast' : 'tank');
  if (t < 55) {
    if (r < 0.40) return 'normal';
    if (r < 0.64) return 'fast';
    if (r < 0.80) return 'tank';
    if (r < 0.92) return 'shooter';
    return 'kamikaze';
  }
  if (t < 75) {
    if (r < 0.30) return 'normal';
    if (r < 0.50) return 'fast';
    if (r < 0.66) return 'tank';
    if (r < 0.80) return 'shooter';
    if (r < 0.90) return 'kamikaze';
    return 'invoker';
  }
  if (t < 100) {
    if (r < 0.24) return 'normal';
    if (r < 0.42) return 'fast';
    if (r < 0.54) return 'tank';
    if (r < 0.66) return 'shooter';
    if (r < 0.78) return 'kamikaze';
    if (r < 0.88) return 'invoker';
    if (r < 0.96) return 'teleporter';
    return 'dardante';
  }
  if (r < 0.14) return 'normal';
  if (r < 0.26) return 'fast';
  if (r < 0.38) return 'tank';
  if (r < 0.50) return 'shooter';
  if (r < 0.62) return 'kamikaze';
  if (r < 0.74) return 'invoker';
  if (r < 0.84) return 'teleporter';
  if (r < 0.92) return 'dardante';
  return 'juggernaut';
}

function createEnemy(type, x, y, extra) {
  const base = ENEMY_TYPES[type];
  const bonus = Math.min(state.time * rules.difficulty * 0.35, 40);
  const spd = base.speed + bonus * (type === 'tank' ? 0.35 : (type === 'juggernaut' ? 0 : (type === 'shooter' || type === 'invoker' || type === 'teleporter' || type === 'dardante' ? 0.4 : 1)));
  const hp = Math.round(base.hp * state.enemyHpMult);
  const e = Object.assign(createBody({ activeDarts: 0 }), {
    type, x, y, born:state.time,
    size: base.size,
    hp, maxHp: hp,
    speed: spd,
    color: base.color,
    hitFlash: 0,
    wob: gameRandom() * TAU,
    xp: base.xp,
    shootCd: 1 + gameRandom() * 1.2
  }, extra || {});
  if (type === 'juggernaut') {
    e.jState = 'idle'; e.jTimer = 3 + gameRandom() * 2;
    e.jAngle = 0; e.jHit = false; e.vx = 0; e.vy = 0;
  }
  return e;
}

function spawnEnemy() {
  if (state.enemies.length > 90) return;
  const type = chooseEnemyType(state.time * rules.difficulty);
  if (rules.disabled.includes(type)) return;
  const p = state.player;
  const minDist = Math.max(W, H) * 0.6 / state.cam.zoom + 100;
  const dist = minDist + gameRandom() * 300;
  const angle = gameRandom() * TAU;
  state.enemies.push(createEnemy(type, p.x + Math.cos(angle) * dist, p.y + Math.sin(angle) * dist));
}
function spawnOrbs(x, y, totalXp) {
  const n = clamp(Math.round(totalXp / 2), 1, 5);
  for (let i = 0; i < n; i++) {
    const a = gameRandom() * TAU, s = 60 + gameRandom() * 140;
    state.orbs.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, r: 5, value: totalXp/n, life: 25, pulse: gameRandom()*TAU });
  }
}
function spawnPotion(walls) {
  const p = state.player;
  for (let attempt = 0; attempt < 12; attempt++) {
    const angle = gameRandom() * TAU;
    const dist = 280 + gameRandom() * 450;
    const x = p.x + Math.cos(angle) * dist, y = p.y + Math.sin(angle) * dist;
    let blocked = false;
    for (const w of walls) {
      if (x > w.x - 20 && x < w.x + w.w + 20 && y > w.y - 20 && y < w.y + w.h + 20) { blocked = true; break; }
    }
    if (blocked) continue;
    const isLarge = gameRandom() < 0.35;
    state.potions.push({ x, y, type: isLarge ? 'large' : 'small', value: isLarge ? 2 : 1, life: 45, maxLife: 45, bob: gameRandom()*TAU });
    if (state.potions.length > 6) state.potions.shift();
    return;
  }
}

function updateAdvancedEnemy(e,p,dt,travel,d){
  const aim=Math.atan2(p.y-e.y,p.x-e.x);
  e.hitFlash=Math.max(0,e.hitFlash-dt);e.shootCd-=dt;e.wob+=dt*5;
  if(e.type==='erratic'&&Math.floor(state.time*9)!==e.crumb){e.crumb=Math.floor(state.time*9);spawnParticles(e.x,e.y,1,e.color,.35);}
  function move(angle,speed){return moveWithWalls(e,Math.cos(angle)*speed*travel,Math.sin(angle)*speed*travel,currentWalls);}
  function shoot(a,speed,r){
    let x=e.x,y=e.y;if(e.type==='twinCannon'){
      const f=e.size*.62,side=(e.gunSide||1)*e.size*.325,cs=Math.cos(e.heading),sn=Math.sin(e.heading);
      x+=f*cs-side*sn;y+=f*sn+side*cs;
    }
    state.enemyBullets.push({x,y,vx:speed*Math.cos(a),vy:speed*Math.sin(a),r,tint:e.color,life:4,damage:1,streak:true});}
  if(e.type==='rebound'){
    e.heading??=aim;e.boost=Math.max(0,(e.boost||0)-dt);
    if(!e.boost)e.heading+=clamp(Math.atan2(Math.sin(aim-e.heading),Math.cos(aim-e.heading)),-dt*1.7,dt*1.7);
    const hit=move(e.heading,e.speed*(e.boost?1.9:1));
    if(hit.blockedX||hit.blockedY){
      if(hit.blockedX)e.heading=Math.PI-e.heading;if(hit.blockedY)e.heading=-e.heading;
      e.boost=.72;e.bounced=state.time;spawnParticles(e.x,e.y,7,'#a9efff');
    }
  }else if(e.type==='erratic'){
    if(e.phase==='rush'){
      move(e.heading,640);if(e.shootCd<=0){e.bounced=state.time;e.phase='walk';e.shootCd=gameRand(1.1,2.1);}
    }else if(e.phase==='aim'){
      if(e.shootCd<=0){e.phase='rush';e.shootCd=.20;}
    }else{
      move(aim+.82*Math.sin(e.wob*2.6),e.speed);
      if(e.shootCd<=0&&d<460){e.phase='aim';e.heading=aim;e.shootCd=.36;}
    }
  }else if(e.type==='pulseRing'){
    if(e.phase==='aim'){
      if(e.shootCd<=0){
        e.firedAt=state.time;spawnParticles(e.x,e.y,8,'#d5a4ff');const n=e.pulseCount||8;
        for(let i=0;i<n;i++)shoot(e.heading+i*TAU/n,230,5);
        e.phase='walk';e.shootCd=2.48;
      }
    }else{
      move(aim,e.speed);if(e.shootCd<=0){e.phase='aim';e.heading=aim;e.pulseCount=gameRandom()<.5?6:8;e.shootCd=.52;}
    }
  }else if(e.phase==='aim'||e.phase==='second'){
    if(e.shootCd<=0){
      const second=e.phase==='second';e.gunSide=second?1:-1;e.firedAt=state.time;spawnParticles(e.x,e.y,6,'#ff9a88');
      for(let i=-2;i<=2;i++)shoot(e.heading+(i+(second?.35:-.35))*.125,second?335:285,5);
      e.phase=second?'walk':'second';e.shootCd=second?2.35:.23;
    }
  }else{
    if(d>365||d<240)move(aim,d>365?e.speed:-e.speed*.75);
    e.heading=aim;if(d<660&&e.shootCd<=0){e.phase='aim';e.shootCd=.61;}
  }
}
