'use strict';
const EXTRA_NAMES={siege:'Asedio Infinito',trial:'Contrarreloj',chaos:'Caos Geométrico'};
const CHAOS_RULES={rain:'Lluvia de proyectiles',haste:'Velocidad alterada',gravity:'Gravedad circular',
  laser:'Sobrecarga de láseres',double:'Oleada duplicada',energy:'Carga de energía'};
function beginExtra(id){
  if(!Object.hasOwn(EXTRA_NAMES,id))return;
  restart();
  state.extra={id,wave:0,cleared:0,next:1,timer:0,remaining:0,phase:'rest',bosses:0,
    milestones:0,modifiers:0,bag:[],zones:[],rays:[],nextChange:30,modifier:null};
  state.extra.wave=(rules.wave||1)-1;state.extra.duration=(rules.duration||10)*60;state.extra.nextChange=rules.chaosPeriod||30;
  state.spawnTimer=.1;
}
function extraSpawn(type,angle=gameRandom()*TAU){
  const p=state.player,a=state.arena;
  const radius=Math.min(550,Math.max(270,Math.min(W,H)*.68));
  const pos=polarPoint(p,radius,angle);
  if(a)Object.assign(pos,boundedPoint(pos.x,pos.y,40));
  else Object.assign(pos,rewardSpot(pos.x,pos.y));
  state.enemies.push(createEnemy(type,pos.x,pos.y));
}
function siegePool(wave){
  const pool=['normal','fast'];
  if(wave>=3)pool.push('tank','shooter','kamikaze');
  if(wave>=5)pool.push('tackler','splitter','cannon');
  if(wave>=12)pool.push('invoker','frostMage','pulseRing','rebound');
  if(wave>=20)pool.push('juggernaut','erratic','dardante','twinCannon');
  return pool;
}
function updateSiege(m,dt){
  if(m.phase==='rest'){
    m.next-=dt;if(m.next>0)return;
    m.wave++;m.phase='fight';
    if(m.wave%10===0){spawnEncounter(pickEncounter());return;}
    m.remaining=3+Math.floor(2*m.wave);m.timer=0;m.sent=0;
  }
  if(m.remaining){
    m.timer-=dt;
    if(m.timer<=0 && state.enemies.length<64){
      let pool=siegePool(m.wave).filter(t=>!rules.disabled.includes(t));
      if(!pool.length)pool=Object.keys(ENEMY_NAMES).filter(t=>!BOSS_NAMES[t]&&!rules.disabled.includes(t));
      if(!pool.length){m.remaining=0;return;}
      for(let i=0;i<4&&m.remaining;i++,m.remaining--,m.sent++){
        const advanced=m.wave%5===0&&m.sent%2===0;
        const options=advanced?pool.slice(-3):pool;
        extraSpawn(options[Math.floor(gameRandom()*options.length)]);
      }
      m.timer=.55;
    }
  }
  // Running away cannot despawn the wave. Bring stragglers back to its perimeter.
  for(const e of state.enemies)if(Math.hypot(e.x-state.player.x,e.y-state.player.y)>Math.max(W,H)+660)
    Object.assign(e,polarPoint(state.player,580,angleTo(state.player,e)));
  if(!m.remaining&&!state.enemies.length&&!state.bossActive){m.cleared=m.wave;m.next=3;m.phase='rest';}
}
function clockText(seconds){
  const t=Math.max(0,Math.ceil(seconds));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');
}
function updateTrial(m){
  const duration=m.duration||600;
  if(state.time>=duration){state.time=duration;state.over=true;m.won=true;return;}
  const due=Math.min(4,Math.floor(state.time/(duration/5)));
  if(m.milestones<due){m.milestones++;spawnEncounter(pickEncounter());}
}
function activateModifier(m,id){
  m.modifier=id;m.until=state.time+(rules.chaosDuration||12);m.tick=0;m.zones=[];m.rays=[];
  if(id==='gravity')for(let i=0;i<3;i++)m.zones.push({...polarPoint(state.player,190,i*TAU/3+gameRandom()*.4),pull:i!==1});
  addFloat(state.player.x,state.player.y-60,CHAOS_RULES[id].toUpperCase(),'#f7aaff');
  spawnParticles(state.player.x,state.player.y,18,id==='energy'?'#f4e784':'#c68aff',.8);
}
function updateChaos(m,dt){
  if(m.modifier&&state.time>=m.until){m.modifiers++;if(m.modifier==='rain')state.enemyBullets=state.enemyBullets.filter(b=>!b.chaos);
    m.modifier=null;m.secondary=null;m.zones=[];m.rays=[];}
  if(state.time>=m.nextChange){
    if(!m.bag.length)m.bag=[...(rules.chaosPool??Object.keys(CHAOS_RULES))];
    if(!m.bag.length){m.nextChange=Infinity;return;}
    const next=m.bag.splice(Math.floor(gameRandom()*m.bag.length),1)[0];
    activateModifier(m,next);
    if(rules.doubleChaos&&state.time>=180){
      const passive=(rules.chaosPool??Object.keys(CHAOS_RULES)).filter(k=>k!==next&&['energy','double','haste'].includes(k));
      m.secondary=passive[Math.floor(gameRandom()*passive.length)];
      if(m.secondary)addFloat(state.player.x,state.player.y-92,CHAOS_RULES[m.secondary],'#dcaaff');
    }
    m.nextChange=state.time+(rules.chaosPeriod||30);
  }
  const p=state.player;
  for(const z of m.zones){
    const d=Math.hypot(z.x-p.x,z.y-p.y);
    if(d>1&&d<170){const step=(z.pull?1:-1)*130*dt*(1-d/170)/d;moveWithWalls(p,(z.x-p.x)*step,(z.y-p.y)*step,currentWalls);}
  }
  m.tick-=dt;
  if(m.tick<=0 && ['rain','laser'].includes(m.modifier)){
    m.tick=m.modifier==='laser'?2.3:1.1;
    const targets=[...livingBosses().filter(b=>b.state!=='final'),...state.enemies];
    const e=targets[Math.floor(gameRandom()*targets.length)];
    if(e){
      const angle=angleTo(e,p);
      if(m.modifier==='rain')for(const off of [-.24,0,.24]){
        state.enemyBullets.push({...point(e),vx:240*Math.cos(angle+off),vy:240*Math.sin(angle+off),r:5,life:4,damage:1,tint:'#cc92ff',chaos:true});
      }else{const end=polarPoint(e,Math.max(960,Math.hypot(W,H)),angle);
        m.rays.push({kind:'line',...point(e),xx:end.x,yy:end.y,width:16,on:state.time+.85,end:state.time+1.18});}
    }
  }
  m.rays=m.rays.filter(r=>r.end>state.time);
  for(const r of m.rays)if(state.time>=r.on&&patternTouches(r,p))damagePlayer(1);
}
function updateExtra(dt){
  const m=state.extra;
  if(m.id==='siege')updateSiege(m,dt);
  if(m.id==='trial')updateTrial(m);
  if(m.id==='chaos')updateChaos(m,dt);
}
function drawExtraField(m){
  ctx.save();
  for(const z of m.zones){
    ctx.strokeStyle=z.pull?'#bd84f2':'#78e7de';ctx.lineWidth=2;
    for(let i=0;i<3;i++){const f=(state.time*.55+i/3)%1;ctx.globalAlpha=.15+.5*(1-f);ctx.beginPath();ctx.arc(z.x,z.y,12+145*(z.pull?1-f:f),0,TAU);ctx.stroke();}
  }
  ctx.globalAlpha=1;
  for(const ray of m.rays){ctx.strokeStyle=state.time>=ray.on?'#fff0ff':'#d294ff';ctx.lineWidth=state.time>=ray.on?ray.width:2;
    ctx.beginPath();ctx.moveTo(ray.x,ray.y);ctx.lineTo(ray.xx,ray.yy);ctx.stroke();}
  ctx.restore();
}
function extraHUD(m){
  if(m.id==='siege')return 'ASEDIO · OLEADA '+m.wave+'\n'+(m.phase==='rest'?'Próxima en '+Math.ceil(m.next)+' s':(m.remaining+state.enemies.length+livingBosses().length)+' restantes')+' · Especial '+(5*(1+Math.floor(m.wave/5)));
  if(m.id==='trial')return clockText((m.duration||600)-state.time)+' · CONTRARRELOJ\n'+state.score+' puntos';
  return 'CAOS GEOMÉTRICO\n'+([m.modifier,m.secondary].filter(Boolean).map(k=>CHAOS_RULES[k]).join(' + ')||'Próximo cambio')+' · '+Math.ceil((m.modifier?m.until:m.nextChange)-state.time)+' s';
}
function extraResults(m){
  const rows=[['Tiempo sobrevivido',clockText(state.time)],['Puntuación',state.score],['Jefes derrotados',m.bosses]];
  if(m.id==='siege')rows.unshift(['Última oleada superada',m.cleared]);
  if(m.id==='chaos')rows.unshift(['Modificadores superados',m.modifiers]);
  if(m.id==='trial'){
    rows.unshift(['Resultado',m.won?'Tiempo completado':'Derrota']);
    try{const key='cs.trial.best',best=Math.max(Number(localStorage.getItem(key))||0,state.score);localStorage.setItem(key,String(best));rows.push(['Récord local',best]);}catch{}
  }
  return rows;
}
