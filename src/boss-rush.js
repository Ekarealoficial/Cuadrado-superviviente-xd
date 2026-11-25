'use strict';
let syncRushUI=()=>{};
function rushStage(size){
  return ['','JEFES INDIVIDUALES','DUPLAS','TRÍOS'][size]||'GRUPOS DE '+size;
}
function beginRush(bot){
  const enabled=Object.keys(BOSS_NAMES).filter(id=>!rules.disabled.includes(id)).length;
  if(!enabled)return false;
  restart();
  state.rush={enabled,bot,phase:'reward',round:0,stageWins:0,defeated:0,group:[],action:'ACTIVO',
    history:[],remainder:0,intent:null,nextPlan:0,cardDelay:0,nextSpecial:0};
  queueRushRound(3);
  return true;
}
function queueRushRound(seconds){
  const r=state.rush,previous=state.groupSize;
  // At the last stage the only valid group repeats, including a one-boss roster.
  r.group=pickEncounter();
  r.newStage=state.groupSize!==previous;
  if(r.newStage || (r.round && state.groupSize===r.enabled))r.stageWins=0;
  // The offset and stride reconstruct every group in a stage from its index.
  // Only the weighted singles need explicit IDs, even across 65,535 rounds.
  if(!r.history.length || r.newStage){
    r.history.push({size:state.groupSize,singles:[],offset:state.bossCycle[1]||0,
      stride:state.bossCycle[2]||1,completed:0});
  }
  if(state.groupSize===1 && r.history[0].singles.length<r.enabled)r.history[0].singles.push(r.group[0]);
  r.round++;r.timer=seconds;r.phase='countdown';
  state.bossSpawnTimer=seconds;
  state.bossOmen={kind:r.group[0],group:r.group,start:state.time};
  for(const kind of r.group)if(PATTERN_BOSSES[kind])bossCue(kind+'Omen',state.player);
}
function updateRushSchedule(dt){
  const r=state.rush;
  if(r.phase==='battle'){
    if(state.bossActive){
      // In a marathon there are no normal waves to build the starting deck.
      // Pay part of the standard XP budget as damage is dealt; the rest drops on death.
      for(const b of livingBosses()){
        const earned=Math.floor(b.rushXp*.65*Math.sqrt(clamp(1-b.hp/b.maxHp,0,1)));
        if(earned>b.awardedXp){const amount=earned-b.awardedXp;b.awardedXp=earned;gainXp(amount);}
      }
      return;
    }
    r.stageWins++;r.history.at(-1).completed++;r.phase='reward';
  }
  if(r.phase==='reward'){
    // A moving corridor or a world wall can leave drops far from the player.
    // Draw relics home after combat, then let the normal pickup and card UI run.
    for(const relic of [...state.cardRelics,...state.potions,...state.orbs]){
      const dx=state.player.x-relic.x,dy=state.player.y-relic.y;
      const t=Math.min(1,dt*230/(Math.hypot(dx,dy)||1));relic.x+=dx*t;relic.y+=dy*t;
    }
    if(state.cardRelics.length || state.bonusPicks || state.pendingLevelUps || state.cardChoices)return;
    queueRushRound(5);return;
  }
  if(state.bonusPicks || state.pendingLevelUps || state.cardChoices || state.inventoryOpen)return;
  r.timer=Math.max(0,r.timer-dt);state.bossSpawnTimer=r.timer;
  if(r.timer===0){spawnEncounter(r.group);r.lastGroup=r.group;r.phase='battle';r.nextPlan=0;}
}
// Match the simulation timeline across 60, 90 and 120 Hz displays.
function advanceRush(elapsed){
  const r=state.rush,step=1/60;
  r.remainder+=elapsed;
  while(r.remainder+1e-10>=step){
    r.remainder=Math.max(0,r.remainder-step);
    updateRushFrame(step);
  }
}
function updateRushFrame(dt){
  const r=state.rush;
  if(!r.bot || state.over){update(dt);return;}
  if(state.cardChoices){
    r.cardDelay-=dt;
    if(r.cardDelay<=0){botPickUpgrade();r.cardDelay=.35;}
    return;
  }
  const intent=rushBotControl(dt);
  const p=state.player,angle=Math.atan2(intent.aim.y-p.y,intent.aim.x-p.x);
  update(dt,true,[[0,dt,intent.x,intent.y,angle,intent.fire]]);
}
function rushResults(){
  const r=state.rush,t=Math.floor(state.time);
  return [['Rondas completadas',state.completedEncounters],['Etapa alcanzada',rushStage(state.groupSize)],
    ['Jefes derrotados',r.defeated],['Tiempo sobrevivido',Math.floor(t/60)+' min '+t%60+' s'],
    ['Puntuación',state.score],['Último encuentro',(r.lastGroup||[]).map(id=>BOSS_NAMES[id]).join(' + ')||'—'],
    ['Control',r.bot?'Bot Play':'Manual']];
}
