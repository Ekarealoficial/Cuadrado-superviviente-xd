'use strict';
const lab={bossId:0,god:false,speed:1,debug:false,hitboxes:false,spawnWaves:false,fps:60,displayAt:0,group:new Set()};
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
    b.state='transition';b.timer=.5;b.events=[];b.tracks=[];b.overlap='';b.combo=null;b.laserGate=false;
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
  toggle('Mostrar hitboxes','hitboxes');
  const progress=select('Encuentros completados',[[0,'0'],[1,'1'],[2,'2'],[3,'3']],Math.min(3,state.completedEncounters||0),()=>{});
  button('Aplicar progreso','#99eca5',()=>{labProgress(Number(progress.value));status.textContent=lab.spawnWaves?'Oleadas de prueba activadas. Sustitución gradual durante 25 s.':'Oleadas de prueba desactivadas.';});
  const stress=select('Proyectiles de prueba',[[150,'150'],[500,'500'],[1000,'1000']],500,()=>{});
  button('Generar proyectiles','#ffaf81',()=>{labBarrage(Number(stress.value));closeSandboxPanel();});
  const bosses=livingBosses(),b=labBoss();
  if(b){
    heading('Jefe activo');
    select('Jefe',bosses.map(o=>[o.id,BOSS_NAMES[o.kind]+' · '+o.id]),b.id,v=>{lab.bossId=Number(v);openSandboxPanel('lab');});
    const corner=select('Esquina',[[0,'Superior izquierda'],[1,'Superior derecha'],[2,'Inferior izquierda'],[3,'Inferior derecha']],0,()=>{});
    button('Ir a la esquina','#80dbed',()=>{labCorner(Number(corner.value));closeSandboxPanel();});
    if(b.state!=='final'){
      select('Fase',sandboxPhases(b).map((_,i)=>[i+1,'Fase '+(i+1)]),b.phase,v=>{setSandboxPhase(b,Number(v));openSandboxPanel('lab');});
      const moves=sandboxPhases(b).flat(),s=select('Ataque',moves.map(m=>[m,MOVE_NAMES[m]||LAB_NAMES[m]]),moves.includes(b.state)?b.state:moves[0],()=>{});
      const layer=select('Ataque simultáneo',[['','Ninguno']],'',()=>{});
      function refreshLayers(){
        layer.replaceChildren(new Option('Ninguno',''));
        for(const m of compatibleSeconds(b,s.value))layer.add(new Option(MOVE_NAMES[m]||LAB_NAMES[m],m));
        layer.disabled=layer.options.length===1;
      }
      s.onchange=refreshLayers;refreshLayers();
      button('Ejecutar ataque',b.color,()=>{executeSandboxPair(b,s.value,layer.value);closeSandboxPanel();});
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
function labCorner(index){
  const a=state.arena;if(!a)return;
  const p=state.player,h=p.size/2+1;
  Object.assign(p,{x:index%2?a.x+a.w-h:a.x+h,y:index<2?a.y+h:a.y+a.h-h,vx:0,vy:0});
  fitPlayerInArena(p,a);state.cam.x=p.x;state.cam.y=p.y;
}
function labProgress(n){
  state.completedEncounters=n;
  state.firstBossDefeatAt=n?state.time-60:null;
  state.unlockTimes=Array.from({length:n},(_,i)=>i===n-1?state.time:state.time-60);
  lab.spawnWaves=n>0;state.spawnTimer=0;
}
function labBarrage(n){
  const p=state.player,arena=state.arena;
  const a=arena?{x:arena.x+22,y:arena.y+22,w:arena.w-44,h:arena.h-44}:{x:p.x-440,y:p.y-270,w:880,h:540};
  for(let i=0;i<n;i++){
    const f=(i+.5)/n,edge=perimeterPoint(a,f),q=mixPoint(edge,p,.04+.24*((i*17)%43)/43);
    const angle=angleTo(q,p)+Math.sin(i*.75)*.46;
    const speed=140+60*(i%4);
    state.enemyBullets.push({...q,vx:speed*Math.cos(angle),vy:speed*Math.sin(angle),r:[4,6,11][i%3],life:8,damage:1,tint:i%2?'#df96ff':'#facf8f'});
  }
}
function executeSandboxPair(b,first,second){
  if(!second){sandboxAttack(b,first);return;}
  const pair=(PAIRINGS[b.kind]||[]).find(p=>p.includes(first)&&p.includes(second)&&first!==second);
  if(!pair)return;
  const phase=Math.max(...pair.map(m=>sandboxPhases(b).findIndex(ms=>ms.includes(m))+1));
  if(phase>b.phase)setSandboxPhase(b,phase);
  sandboxAttack(b,pair[0]);
  if(b.kind==='heart')for(const q of b.parts)if(q.role===pair[1]&&!q.hp){q.hp=q.maxHp;q._dying=false;}
  addPatternLayer(b,pair[1]);
}
function drawLabHitboxes(){
  ctx.save();ctx.lineWidth=1.3;
  const red='#ff526c',blue='#68efff',warn='#ffc36a';
  function circle(q,r,color){strokeRing(q.x,q.y,r,color,1.4);}
  function beam(q,angle,len,width,color){
    ctx.save();ctx.translate(q.x,q.y);ctx.rotate(angle);ctx.strokeStyle=color;ctx.strokeRect(0,-width/2,len,width);ctx.restore();
  }
  for(const q of state.bullets)circle(q,q.r,blue);
  for(const q of state.darts)circle(q,6,blue);
  for(const q of state.enemyBullets)circle(q,q.r,red);
  for(const q of state.enemyDarts)circle(q,6,red);
  for(const q of [...state.enemies,...bossTargets()])circle(q,q.size/2,red);
  for(const b of livingBosses()){
    for(const q of b.balls)if(q.state==='flying')circle(q,q.r,red);
    for(const q of b.planets||[])circle(q,q.r,red);
    for(const piece of b.pieces||[])if(piece.mode==='pass'){const r=airCutBounds(piece);ctx.strokeStyle=red;ctx.strokeRect(r.x,r.y,r.w,r.h);}
    if(!PATTERN_BOSSES[b.kind])continue;
    for(const s of patternShapes(b)){
      ctx.strokeStyle=s.live?red:warn;ctx.setLineDash(s.live?[]:[4,5]);
      if(s.kind==='line'){
        const d=Math.hypot(s.xx-s.x,s.yy-s.y);ctx.save();ctx.translate(s.x,s.y);ctx.rotate(Math.atan2(s.yy-s.y,s.xx-s.x));
        const r=s.width/2;ctx.beginPath();ctx.arc(d,0,r,-Math.PI/2,Math.PI/2);ctx.arc(0,0,r,Math.PI/2,3*Math.PI/2);ctx.closePath();ctx.stroke();ctx.restore();
      }else if(s.kind==='sector'||s.kind==='arc'){
        for(const sign of [-1,1])strokeRing(s.x,s.y,s.r+sign*s.width/2,ctx.strokeStyle,1.3,s.from??s.angle+s.gap,s.to??s.angle+TAU-s.gap);
      }else if(s.kind==='box')ctx.strokeRect(s.x-s.r,s.y-s.r,2*s.r,2*s.r);
      else circle(s,s.r,ctx.strokeStyle);
    }
  }
  ctx.setLineDash([]);
  for(const ls of state.bossLasers)beam(ls,ls.angle,Math.hypot(state.arena.w,state.arena.h)*1.2,ls.width,ls.state==='active'?red:warn);
  for(const bomb of state.bossBombs)circle(bomb,bomb.exploded?100:bomb.r,bomb.exploded?red:warn);
  for(const z of state.cosmicZones){
    const color=z.age>=z.windup?red:warn;
    if(z.type==='beam'){for(let i=1;i<z.points.length;i++){const q=z.points[i-1],v=z.points[i];beam(q,angleTo(q,v),Math.hypot(q.x-v.x,q.y-v.y),z.width,color);}}
    else if(z.type==='solar'){ctx.strokeStyle=color;cosmicPath(solarVertices(z));ctx.closePath();ctx.stroke();}
    else if(z.type==='well')circle(z,36,color);
  }
  for(const l of state.lasersFiring)for(let i=0;i<l.count;i++)beam(state.player,state.player.angle+l.sweep+i*TAU/l.count,2000,l.width,blue);
  for(const l of state.player.beam||[])beam(state.player,l.a,1100,32,blue);
  for(const z of state.iceZones)circle(z,45,z.age>=ICE_FALL?red:warn);
  circle(state.player,state.player.size/2,blue);ctx.restore();
}
