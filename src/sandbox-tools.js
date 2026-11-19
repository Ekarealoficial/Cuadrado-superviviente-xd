'use strict';
const lab={bossId:0,god:false,speed:1,debug:false,fps:60,displayAt:0,group:new Set()};
const CLASSIC_MOVES={
  boss:[['dash','bombs','balls'],[],['laser']],
  worm:[['zigzag','rush','lanes'],['frenzy']],
  singular:[['attract','blink','solar'],['lunar'],[]]
};
const LAB_NAMES={dash:'Embestida',bombs:'Bombas',balls:'Malabares',laser:'Láser',zigzag:'Zigzagueo',rush:'Estampida',lanes:'Líneas',frenzy:'Frenesí',attract:'Atracción y repulsión',blink:'Teletransportación',solar:'Rayos solares',lunar:'Ataque lunar',recover:'Recuperación',transition:'Transición',final:'Secuencia final',absorb:'Absorción',landing:'Aterrizaje'};
function sandboxPhases(b){return PATTERN_BOSSES[b.kind]?.moves||CLASSIC_MOVES[b.kind];}
function setSandboxPhase(b,n){
  if(b.state==='final')return;
  const limits=PATTERN_BOSSES[b.kind]?.limits||({boss:[.5,.33],worm:[.3],singular:[.5,.3]})[b.kind];
  const ratio=n===1?1:limits[n-2]-.015;
  b.hp=b.maxHp*ratio;b.phase=n;b.deck=[];b.charging=false;b.age=0;b.waitFinal=false;
  if(PATTERN_BOSSES[b.kind]){
    b.state='transition';b.timer=.5;b.events=[];b.tracks=[];b.overlap='';
    if(b.kind==='twins'){
      for(const q of b.parts){q.hp=n===3&&q.index===1?0:q.maxHp*(n===2?.37:1);q._dying=q.hp===0;}
      b.hp=activeParts(b).reduce((s,q)=>s+q.hp,0);
    }
  }else if(b.pieces){
    for(const piece of b.pieces){for(const q of piece.parts)q.hp=q.maxHp*ratio;
      piece.mode='curve';piece.timer=.8;if(n===2)startWormVolley(piece);}
    b.hp=wormHealth(b);
  }else if(b.kind==='singular'){
    b.planets=[];if(n>1)addPlanets(b);b.state='drift';b.timer=.65;b.ambient=2;
    state.cosmicZones=state.cosmicZones.filter(s=>s.source!==b.id);
  }else{
    b.balls=b.balls.slice(0,2);
    if(n>1)for(const side of ['top','bottom'])b.balls.push({side,x:b.x,y:b.y,r:36,state:'attached',vx:0,vy:0,life:0});
    b.state='idle';b.timer=.65;state.bossLaserActive=livingBosses().some(o=>o.kind==='boss'&&o.phase>=3);
  }
  bossCue(b.kind+'Phase',b);
}
function sandboxAttack(b,m){
  if(b.state==='final')return;
  const phase=sandboxPhases(b).findIndex(moves=>moves.includes(m))+1;
  if(phase>b.phase || b.kind==='twins'&&phase!==b.phase)setSandboxPhase(b,phase);
  if(b.kind==='twins'&&phase===3){for(const q of b.parts){q.hp=(m==='positiveStorm')===(q.index===0)?q.maxHp:0;q._dying=!q.hp;}}
  if(b.kind==='heart'&&b.parts.some(q=>q.role===m&&!q.hp)){
    const q=b.parts.find(q=>q.role===m);q.hp=q.maxHp;q._dying=false;
  }
  if(b.kind==='heart'&&m==='rebuild'){
    if(activeParts(b).length===4)partDefeated(b.parts[0]);b.repairs=Math.max(1,b.repairs);
  }
  if(PATTERN_BOSSES[b.kind])beginPattern(b,m);
  else if(b.kind==='singular')startSingularAttack(b,m);
  else if(b.pieces)for(const piece of b.pieces){
    if(m==='lanes')startWormLines(piece);
    if(m==='frenzy')startWormVolley(piece);
    if(m==='rush')wormWindup(piece,false);
    if(m==='zigzag'){piece.mode='zigzag';piece.timer=3.5;bossCue('wormZig',piece.parts[0]);}
  }else startBossAttack(m,b);
}
function clearSandboxShots(){
  state.enemyBullets=[];state.enemyDarts=[];state.bossBombs=[];state.bossLasers=[];
  for(const b of livingBosses())for(const ball of b.balls)if(ball.state==='flying')ball.state='returning';
}
function labBoss(){return livingBosses().find(b=>b.id===lab.bossId)||state.boss;}
function updateSandboxDebug(dt,now){
  if(dt>0)lab.fps+=.1*(1/dt-lab.fps);
  const out=document.getElementById('sandboxDebug');
  out.hidden=playMode!=='sandbox'||!lab.debug;
  if(out.hidden||now<lab.displayAt)return;
  lab.displayAt=now+180;
  const b=labBoss(),m=b?.pieces?.[0]?.mode||b?.state;
  out.textContent=Math.round(lab.fps)+' FPS · Aliados '+(state.bullets.length+state.darts.length)+' · Hostiles '+(state.enemyBullets.length+state.enemyDarts.length)+' · Enemigos '+state.enemies.length+
    (b?'\n'+BOSS_NAMES[b.kind]+' · F'+b.phase+' · '+(MOVE_NAMES[m]||LAB_NAMES[m]||m):'');
}
function renderLabMenu(list,button,status){
  function heading(title){const h=document.createElement('h3');h.textContent=title;list.append(h);}
  function select(label,options,value,change){
    const tag=document.createElement('label'),s=document.createElement('select');tag.className='labSelect';s.setAttribute('aria-label',label);tag.append(label,s);
    for(const [id,name] of options)s.add(new Option(name,id));
    s.value=String(value);s.onchange=()=>change(s.value);list.append(tag);return s;
  }
  function toggle(name,key){
    const btn=button(name,'#88dfc2',()=>{lab[key]=!lab[key];btn.setAttribute('aria-pressed',String(lab[key]));});
    btn.setAttribute('aria-pressed',String(lab[key]));
  }
  heading('Simulación');
  toggle('Invulnerabilidad','god');toggle('Ver depuración','debug');
  select('Velocidad',[[.5,'0,5×'],[1,'1×'],[1.5,'1,5×']],lab.speed,v=>lab.speed=Number(v));
  button('Limpiar proyectiles','#ffaf81',()=>{clearSandboxShots();status.textContent='Arena despejada.';});
  const bosses=livingBosses(),b=labBoss();
  if(b){
    heading('Jefe activo');
    select('Jefe',bosses.map(o=>[o.id,BOSS_NAMES[o.kind]+' · '+o.id]),b.id,v=>{lab.bossId=Number(v);openSandboxPanel('lab');});
    if(b.state!=='final'){
      select('Fase',sandboxPhases(b).map((_,i)=>[i+1,'Fase '+(i+1)]),b.phase,v=>{setSandboxPhase(b,Number(v));openSandboxPanel('lab');});
      const moves=sandboxPhases(b).flat(),s=select('Ataque',moves.map(m=>[m,MOVE_NAMES[m]||LAB_NAMES[m]]),moves.includes(b.state)?b.state:moves[0],()=>{});
      button('Ejecutar ataque',b.color,()=>{sandboxAttack(b,s.value);closeSandboxPanel();});
    }
  }
  heading('Encuentro personalizado');
  for(const [id,name] of Object.entries(BOSS_NAMES)){
    const l=document.createElement('label'),box=document.createElement('input');l.className='labChoice';box.type='checkbox';box.checked=lab.group.has(id);
    box.onchange=()=>{if(box.checked)lab.group.add(id);else lab.group.delete(id);};l.append(box,name);list.append(l);
  }
  button('Invocar selección','#daa8ff',()=>{if(!lab.group.size){status.textContent='Selecciona al menos un jefe.';return;}
    spawnEncounter([...lab.group]);lab.bossId=livingBosses().at(-1).id;closeSandboxPanel();});
}
