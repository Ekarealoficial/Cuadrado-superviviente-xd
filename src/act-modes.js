'use strict';
function dailyChallenge(date=new Date()){
  const day=date.toISOString().slice(0,10),seed=Number(day.replaceAll('-','')),rng=makeRng(seed);
  function sample(list,n){const pool=[...list],out=[];while(out.length<n&&pool.length)out.push(pool.splice(Math.floor(rng()*pool.length),1)[0]);return out;}
  const bosses=sample(Object.keys(BOSS_NAMES),4);
  const enemies=['normal',...sample(Object.keys(ENEMY_NAMES).filter(k=>k!=='normal'&&!BOSS_NAMES[k]),7)];
  const modifiers=sample(Object.keys(CHAOS_RULES),3);
  return {day,seed,duration:10,disabled:Object.keys(ENEMY_NAMES).filter(id=>!bosses.includes(id)&&!enemies.includes(id)),chaosPool:modifiers,
    description:day+' UTC · '+bosses.map(id=>BOSS_NAMES[id]).join(' / ')+' · '+modifiers.map(k=>CHAOS_RULES[k]).join(', ')};
}
function startPursuit(m){
  state.arena={x:-350,y:-290,w:1500,h:580,chase:-1};layoutCorridor(state.arena);
  const b=m.wall={id:-1,x:state.arena.x+58,y:0,kind:'frontier',state:'gates',size:100,hp:1,maxHp:1,color:'#74e5dc',chasing:true,parts:[],balls:[],clock:0,age:0};
  makeScore(b);m.distance=0;m.nextGate=1;m.beat=0;m.upgradeAt=900;
  const dash=SPECIAL_CARDS.find(c=>c.id==='dash');for(let i=0;i<4;i++)applyCard(dash);
  state.slots[0]='dash';updateChase(b,0);
}
function advancePursuit(m,dt){
  const b=m.wall,p=state.player;b.clock+=dt;b.age+=dt;b.safeSize=p.size;
  m.distance=Math.max(m.distance,Math.floor(p.x));const pressure=Math.log1p(m.distance/1600);
  b.difficulty={overlap:pressure*.75,movement:1+pressure*.09,density:1+pressure*.12,shot:1+pressure*.12};
  updateChase(b,dt);
  if(b.clock>=m.nextGate){
    const sequence=['gates','rubble','headfall','gates','chaseLasers','trains'];
    chaseBeat(b,sequence[m.beat%sequence.length],m.beat);
    if(pressure>1.4&&m.beat%3===0)chaseBeat(b,'rubble',m.beat+1);
    m.beat++;m.nextGate=b.clock+Math.max(.86,2.3-pressure*.23);
  }
  tickScore(b,dt);b.events=b.events.filter(e=>e.end>=b.age);
  if(p.x-p.size/2<=b.x||scoreShapes(b).some(s=>s.live&&patternTouches(s,p)))damagePlayer(1);
  if(m.distance>=m.upgradeAt){m.upgradeAt+=900;state.bonusPicks++;if(!state.cardChoices)openCardSelection();}
}
function drawPursuit(m){
  const b=m.wall,a=state.arena;ctx.fillStyle='#103b46';ctx.fillRect(a.x,a.y,58,a.h);
  for(let y=a.y+12;y<a.y+a.h;y+=24){ctx.fillStyle='#77fff2';ctx.fillRect(b.x-4,y,8,13);}
  for(const s of scoreShapes(b)){
    ctx.save();ctx.globalAlpha=s.live?1:.5;ctx.fillStyle='#80e4dc80';ctx.strokeStyle=s.live?'#b9fff3':'#e1c8ff';
    if(s.kind==='rect')paintHazardPanel(s,'#78eddf');
    else if(s.kind==='line'){ctx.lineWidth=s.live?s.width:2;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.xx,s.yy);ctx.stroke();}
    ctx.restore();
  }
}
function duelMedal(seconds,lost){return seconds<=100&&lost<=2?'Oro':seconds<=210&&lost<=6?'Plata':'Bronce';}
function actModeResults(m,rows){
  let key,score,label;
  if(m.id==='daily'){key='daily.'+m.day;score=state.score;label='Mejor puntuación del día';}
  if(m.id==='pursuit'){key='pursuit.best';score=m.distance;label='Récord de distancia';rows.unshift(['Distancia',score+' px']);}
  if(m.id==='duel'){
    const id=rules.boss,key='duel.'+id+'.'+rules.difficulty,damage=state.damageTaken||0;
    rows.unshift(['Jefe',BOSS_NAMES[id]],['Resultado',m.won?duelMedal(state.time,damage):'Derrota'],['Daño recibido',damage/2+' ♥']);
    let best=readLocal(key,null);
    if(m.won&&(!best||best.cost>state.time+10*damage)){best={cost:state.time+10*damage,time:state.time,damage};writeLocal(key,best);}
    if(best)rows.push(['Mejor duelo',clockText(best.time)+' · '+best.damage/2+' ♥']);
  }
  if(key){const best=Math.max(Number(readLocal(key,0))||0,score);writeLocal(key,best);rows.push([label,best]);}
  return rows;
}
