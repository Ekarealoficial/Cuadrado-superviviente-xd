'use strict';
/* =============== BALAS =============== */
function spawnBullet(x, y, angle, speed, opts, list = state.bullets) {
  opts = opts || {};
  if (!opts.inverted && list.length >= playerBulletLimit(state.player)) return;
  list.push({
    x, y,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    r: opts.radius !== undefined ? opts.radius : 4,
    life: 1.6*(1+.15*(state.player.persist||0)),persist:state.player.persist||0,style:opts.style, viewDelay:opts.viewDelay || 0,
    venom: state.player.venom || 0,
    volley: opts.volley, lane: opts.lane, batch:opts.batch,
    drone: !!opts.drone,inverted:opts.inverted,
    bounces: opts.bounces || 0,
    homing: !!opts.homing,
    dupli: opts.dupli || 0,
    damage: opts.inheritedDamage ?? (opts.damage ?? 1)*capacitorGain(state.player)*(state.player.movingTime>=2?1+.05*(state.player.kinetic||0):1)
  });
}

function shoot(n, commandId = 0, preview = null, cycles = 1, batch = 0) {
  const p = state.player;
  const list = preview || state.bullets;
  const random = commandId ? makeRng(commandId) : gameRandom;
  const volley = commandId || (p.volley + 1);
  if (!preview){p.volley=volley;geometryVolley(p,cycles,n);}
  function line(angle, speed, lane) {
    const a = angle + (random() - .5) * .03;
    const x = p.x + Math.cos(a) * (p.size/2 + 6);
    const y = p.y + Math.sin(a) * (p.size/2 + 6);
    spawnBullet(x,y,a,speed,{
      homing:random() < p.homingChance, dupli:random() < p.dupliChance ? p.dupliCount : 0,
      bounces:p.bounces, damage:Math.min(Number.MAX_VALUE,cycles*(1+Math.floor(p.sizeLevel*.75))), radius:4+p.sizeLevel*1.2,
      viewDelay:commandId && !preview ? state.viewDelay : 0, volley,lane,batch
    },list);
    if (!preview) spawnParticles(x,y,2,lane<0?'#c77dff':'#9ef7ff',.5);
  }
  for (let i=p.shots-n;i<p.shots && list.length<playerBulletLimit(p);i++)
    line(p.angle+(i-(p.shots-1)/2)*.12,900,i);
  for (let i=0;i<p.backShots && list.length<playerBulletLimit(p);i++)
    line(p.angle+Math.PI+(i-(p.backShots-1)/2)*.12,810,-1-i);
  if (!preview) state.shake = Math.min(state.shake + .6, 4);
  Sfx.play('shoot',30);
}

// Move the base into the exponent near overflow so a representable result
// survives even when 1.5 ** (stacks - 1) alone would exceed a double.
function compoundEffect(base, stacks){
  if(!stacks)return 0;
  const power=1.5**(stacks-1);
  return Number.isFinite(power)?base*power:Math.exp(Math.min(Math.log(Number.MAX_VALUE),Math.log(base)+(stacks-1)*Math.log(1.5)));
}
function stackingChance(base, stacks) {
  return stacks ? Math.min(1, base * 1.5 ** (stacks - 1)) : 0;
}
function cardPulse(kind,target,power=1) {
  const p=state.player;
  const pulses=p.pulses ||= [];
  const recent=pulses.at(-1);
  if (recent && recent.kind===kind && state.time-recent.born<.07 &&
      Math.hypot(recent.x-target.x,recent.y-target.y)<32) return;
  while(pulses.length && (pulses[0].born<state.time-.7 || pulses.length>=18))pulses.shift();
  pulses.push({kind,x:target.x,y:target.y,born:state.time,power});
}
function attackMultiplier(target, attacker=state,shot=null) {
  if(shot)shot.criticalHit=false;
  const p = attacker.player;
  const missing = 1 - attacker.halfHearts / attacker.maxHalfHearts;
  const base = attacker.playerDamageMult * (1+.04*(p.saturation||0)*(p.nearby||0)) * (1 + missing * 0.5 * p.fury);
  if (!p.critical) return base;
  const upgrades = p.critical - 1;
  const chance = (10 + 5 * (upgrades % 18)) / 100;
  if (gameRandom() >= chance) return base;
  const tier=2+Math.floor(upgrades/18);
  if(shot)shot.criticalHit=true;
  if(target?.training)target.training.critical++;
  if (target) cardPulse('critical',target,tier);
  return base*tier;
}
function recordKill(victim = state.player) {
  state.kills++;
  state.recentKills.push(state.time);
  if(state.recentKills.length>RAPID_KILLS)state.recentKills.shift();
  const p = state.player;
  if (!p.vampirism || ++p.vampKills < 16 - p.vampirism % 16) return;
  p.vampKills = 0;
  const healed = Math.min(state.maxHalfHearts - state.halfHearts, 1 + Math.floor(p.vampirism / 16));
  state.halfHearts += healed;
  if (healed) cardPulse('vampirism',victim,healed);
  if (healed) addFloat(p.x, p.y - 30, '+' + healed / 2 + ' ❤', '#ff608a');
}
function damagePlayer(amount, piercesPlasma=false) {
  if(playMode==='sandbox' && lab.god){
    if(state.time>=(state.labContactAt||0)){state.labContactAt=state.time+.18;addFloat(state.player.x,state.player.y-40,'Contacto · '+(amount||1),'#ffd697');}
    return;
  }
  if(state.player.plasma?.end>state.time && !piercesPlasma)return;
  amount = amount || 1;
  const p = state.player;
  if (p.invuln > 0) return;
  const blocks=p.armor?chanceCount(compoundEffect(.10,p.armor)):0;
  if (blocks) {
    p.invuln = blocks;
    cardPulse('armor',p);
    addFloat(p.x, p.y - 30, 'Armadura', '#99baff');
    return;
  }
  const absorbed=Math.min(amount,state.blueHealth);state.blueHealth-=absorbed;
  state.halfHearts -= amount-absorbed;
  if(p.survival)p.survivalUntil=state.time+2+.15*p.survival;
  state.damageTaken=(state.damageTaken||0)+amount;
  p.invuln = 1.0;defensiveReaction(p);
  state.shake = 20 + amount * 5;
  state.flash = 0.4;
  state.flashRGB = '255,60,100';
  for(const boss of livingBosses())if(boss.state!=='final'&&boss.clock>(boss.reactionAt||0)&&['channel','general'].includes(boss.kind)){
    encounterVoice(boss,boss.kind==='channel'?'¡OTRA VEZ RECIBIÓ DAÑO!':boss.phase>1?'¡ALÉJATE! ¡NO PUEDO CONTROLARLO!':'OBJETIVO ALCANZADO');boss.reactionAt=boss.clock+3;
  }
  state.damageTimer = 0;
  spawnParticles(p.x, p.y, 24, '#ff3b6b');
  Sfx.play('damage', 100);
  addFloat(p.x, p.y - 30, '-' + (amount * 0.5) + ' ❤', '#ff3b6b');
  for (const e of state.enemies) {
    const dx = e.x - p.x, dy = e.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 220) { e.x += (dx/d) * 55; e.y += (dy/d) * 55; }
  }
  if (state.halfHearts <= 0) {
    state.halfHearts = 0;
    state.over = true;
    state.overTimer = 0;
    state.shake = 30;
    state.cam.zoom = 0.85;
    state.lasersFiring = [];
    spawnParticles(p.x, p.y, 60, p.color || rules.color, 1.4);
  }
}

function gainXp(amount) {
  state.xp += amount * rules.xp;
  state.score += Math.round(amount * 2);
  let leveled = false;
  while (state.xp >= state.xpNeeded) {
    state.xp -= state.xpNeeded;
    state.level++;
    state.pendingLevelUps++;
    // A full Rush has tens of thousands of rounds. Linear growth in the late
    // game keeps XP representable while levels and card picks continue.
    const nextCost=Math.floor(state.xpNeeded * 1.35) + 4;
    const step=state.rush?1000:Number.MAX_SAFE_INTEGER;
    state.xpNeeded=Math.min(nextCost,state.xpNeeded+step);
    leveled = true;
  }
  if (leveled) {
    state.levelTimer = 0;
    addFloat(state.player.x, state.player.y - 55, '¡NIVEL ' + state.level + '!', '#ffd54a');
    spawnParticles(state.player.x, state.player.y, 22, '#ffd54a', 1.1);
    state.cam.zoom = Math.min(1.18, state.cam.zoom + 0.08);
    Sfx.play('levelup');
    if (!state.cardChoices) openCardSelection();
  }
}

