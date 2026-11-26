'use strict';
function trainingDummy(hp,regen){
  if(playMode!=='sandbox'||!Number.isFinite(hp)||hp<1)return;
  const p=state.player,origin=rewardSpot(p.x+200*Math.cos(p.angle),p.y+200*Math.sin(p.angle));
  const dummy=createEnemy('tank',origin.x,origin.y,{hp,maxHp:hp,size:48,speed:0,color:'#7df6ca',
    training:{origin,regen,start:null,total:0,hits:0,critical:0,procs:0}});
  state.enemies.push(dummy);return dummy;
}
function resetMeters(){
  if(playMode!=='sandbox')return;
  for(const e of state.enemies)if(e.training)Object.assign(e.training,{start:null,total:0,hits:0,critical:0,procs:0});
}
function drawTrainingStats(){
  ctx.save();ctx.textAlign='center';ctx.font='bold 13px monospace';ctx.fillStyle='#b5ffe4';
  for(const e of state.enemies)if(e.training){
    const t=e.training,dps=t.total/Math.max(.1,state.time-(t.start??state.time));
    ctx.fillText('Σ '+meterValue(t.total)+' · '+meterValue(dps)+' DPS',e.x,e.y-49);
    ctx.fillText(t.hits+' impactos · '+t.critical+' crít · '+t.procs+' efectos',e.x,e.y-33);
  }
  ctx.restore();
}
const labNumber=new Intl.NumberFormat('es',{maximumSignificantDigits:4});
function meterValue(v){return Math.abs(v)>=1e6?v.toExponential(2):labNumber.format(v);}
function applyLoadout(recipe){
  if(playMode!=='sandbox')return;
  const cards=[...CARD_TYPES,...SPECIAL_CARDS];
  for(const [id,qty] of Object.entries(recipe)){
    const c=cards.find(c=>c.id===id);
    if(c&&Number.isSafeInteger(qty)&&qty>0)for(let i=0;i<qty;i++)applyCard(c);
  }
}
function inspectorText(){
  const p=state.player,crit=p.critical?10+5*((p.critical-1)%18):0;
  const values=[['Velocidad',p.speed],['Tamaño',p.size],['Medios corazones',state.halfHearts+'/'+state.maxHalfHearts],
    ['Disparos',p.shots+' + '+p.backShots],['Intervalo (s)',p.fireCdBase],['Radio de bala',4+p.sizeLevel*1.2],
    ['Duración (s)',1.6*(1+.15*(p.persist||0))],['Rebotes',p.bounces],['Daño de bala',(1+Math.floor(p.sizeLevel*.75))*state.playerDamageMult*(1+(1-state.halfHearts/state.maxHalfHearts)*.5*p.fury)*(p.movingTime>=2?1+.05*(p.kinetic||0):1)],
    ['Crítico',crit+' % ×'+(p.critical?2+Math.floor((p.critical-1)/18):1)],['Explosión',meterValue(100*stackingChance(.15,p.explosive))+' %'],
    ['Armadura',meterValue(100*stackingChance(.1,p.armor))+' %'],['Teledirigido',meterValue(Math.min(1,p.homingChance)*100)+' %']];
  for(const c of SPECIAL_CARDS){const sc=state.specialCards[c.id];if(sc?.totalCards)values.push([c.name,sc.charges+'/'+sc.maxCharges+' · '+Math.ceil(sc.cooldown)+' s']);}
  return values.map(([name,v])=>name+'  '+(typeof v==='number'?meterValue(v):v)).join('\n');
}
function renderTraining(list,button,status,heading,select){
  if(playMode!=='sandbox')return;
  const ink='#88dfc2';
  function field(label,type,value,min=1){
    const tag=document.createElement('label'),input=document.createElement('input');
    tag.className='labSelect';tag.append(label,input);input.type=type;input.value=value;
    if(type==='number'){input.min=min;input.step='1';}list.append(tag);return input;
  }
  heading('Director de dificultad');
  const settings=state.labDifficulty||{encounter:1,stage:1,threat:0};
  const encounter=field('Encuentro','number',settings.encounter),stage=field('Etapa','number',settings.stage);
  const threat=field('Amenaza (0 = automática)','number',settings.threat,0);
  button('Aplicar a la próxima invocación',ink,()=>{
    const nums=[encounter,stage,threat].map(n=>n.valueAsNumber);
    if(nums.some(n=>!Number.isSafeInteger(n))||nums[0]<1||nums[1]<1||nums[2]<0){status.textContent='Comprueba los tres valores.';return;}
    state.labDifficulty={encounter:nums[0],stage:nums[1],threat:nums[2]};status.textContent='Director preparado para el próximo encuentro.';
  });
  select('Velocidad de balas de jefe',[[.5,'0,5×'],[1,'1×'],[1.5,'1,5×'],[2,'2×']],state.labShotSpeed||1,v=>state.labShotSpeed=Number(v));
  const b=labBoss();
  if(b){
    const readout=document.createElement('output'),d=b.difficulty;
    readout.className='labReadout';
    readout.textContent=BOSS_NAMES[b.kind]+' · '+meterValue(b.hp)+' / '+meterValue(b.maxHp)+' PV'+
      (d?'\nMovimiento ×'+meterValue(d.movement)+' · Balas ×'+meterValue(d.shot)+' · Densidad ×'+meterValue(d.density)+' · Recuperación ×'+meterValue(d.recovery):'');
    list.append(readout);
  }
  heading('Muñeco de entrenamiento');
  const hp=field('Vida del muñeco','number',1000),regen=select('Regeneración',[[1,'Instantánea'],[0,'Desactivada']],1,()=>{});
  button('Colocar muñeco',ink,()=>{if(trainingDummy(hp.valueAsNumber,regen.value==='1'))closeSandboxPanel();});
  button('Reiniciar mediciones',ink,()=>{resetMeters();status.textContent='Contadores a cero.';});
  heading('Combinaciones de cartas');
  const cards=[...CARD_TYPES,...SPECIAL_CARDS],recipe=state.labRecipe||={};
  const chosen=select('Carta',cards.map(c=>[c.id,c.name]),cards[0].id,()=>{});
  const copies=field('Copias (0 para quitar)','number',1,0);
  const listText=document.createElement('output');listText.className='labReadout';list.append(listText);
  const refresh=()=>listText.textContent=cards.filter(c=>recipe[c.id]).map(c=>c.name+' ×'+recipe[c.id]).join(' · ')||'Combinación vacía';
  refresh();
  button('Añadir o actualizar',ink,()=>{const n=copies.valueAsNumber;if(Number.isSafeInteger(n)&&n>=0){if(n)recipe[chosen.value]=n;else delete recipe[chosen.value];refresh();}});
  button('Aplicar combinación',ink,()=>{applyLoadout(recipe);openSandboxPanel('lab');status.textContent='Combinación aplicada.';});
  button('Quitar mis cartas','#f698ae',()=>{clearSandboxCards();openSandboxPanel('lab');});
  const preset=select('Configuración local',[1,2,3].map(n=>[n,'Memoria '+n]),1,()=>{});
  button('Guardar configuración',ink,()=>{try{localStorage.setItem('cs.loadout.'+preset.value,JSON.stringify(recipe));status.textContent='Combinación guardada.';}catch{status.textContent='Almacenamiento local no disponible.';}});
  button('Cargar configuración',ink,()=>{try{const saved=JSON.parse(localStorage.getItem('cs.loadout.'+preset.value));if(!saved){status.textContent='Memoria vacía.';return;}
    for(const c of cards){delete recipe[c.id];if(Number.isSafeInteger(saved[c.id])&&saved[c.id]>0)recipe[c.id]=saved[c.id];}refresh();}catch{status.textContent='No se pudo leer la memoria.';}});
  heading('Estado del jugador');
  const stats=document.createElement('output');stats.className='labReadout';stats.textContent=inspectorText();list.append(stats);
  button('Restaurar vida',ink,()=>{state.halfHearts=state.maxHalfHearts;stats.textContent=inspectorText();});
  button('Recargar especiales',ink,()=>{for(const s of Object.values(state.specialCards)){s.charges=s.maxCharges;s.cooldown=0;}stats.textContent=inspectorText();});
  button('Eliminar enemigos normales',ink,()=>{state.enemies=state.enemies.filter(e=>e.training);state.enemyDarts=state.enemyDarts.filter(d=>!d.owner||state.enemies.includes(d.owner));status.textContent='Enemigos normales retirados.';});
}
