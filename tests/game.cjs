const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
function game() {
 const ctx=new Proxy({}, {get:(_,k)=>k==='arc'?(_x,_y,r)=>assert.ok(Number.isFinite(r) && r>=0):k==='measureText'?()=>({width:30}):String(k).endsWith('Gradient')?()=>({addColorStop(){}}):()=>{}});
 const sandbox={console,URLSearchParams,location:{search:'?seed=42'},performance:{now:()=>0},setTimeout:()=>{},requestAnimationFrame:()=>{},window:{innerWidth:1200,innerHeight:800,addEventListener:()=>{}},document:{createElement:()=>({getContext:()=>ctx}),getElementById:()=>({getContext:()=>ctx,addEventListener:()=>{}})}};
 vm.createContext(sandbox);
 const html=fs.readFileSync('index.html','utf8');
 for(const [,file] of html.matchAll(/src="([^"]+)"/g)) vm.runInContext(fs.readFileSync(file,'utf8'),sandbox,{filename:file});
 return code=>vm.runInContext(code,sandbox);
}
test('una sala anterior a Velocista permite dibujar y abrir el inventario',()=>{
  const run=game();
  run("delete state.specialCards.frames;state.specialCards.blink.totalCards=1;state.inventoryOpen=true;updateUILayout();render()");
  assert.equal(run("state.inventoryCardRects.map(r=>r.id).join(',')"),'blink');
});
test('one reward per gained level',()=>{const run=game();assert.equal(run('gainXp(100); state.pendingLevelUps'),run('state.level-1'));});
test('boss keeps phase two balls on a large hit',()=>{const run=game();assert.equal(run('spawnBoss();state.boss.hp=300;updateBoss(1/60);state.boss.balls.length'),4);assert.equal(run('state.boss.phase'),3);});
test('later bosses scale with difficulty and encounters',()=>{const run=game();assert.equal(run('spawnBoss();killBoss();state.enemyHpMult=2;spawnBoss();state.boss.maxHp'),3000);});
test('simulation and renderer smoke test',()=>{const run=game();run('for(let i=0;i<600;i++){update(1/60);render();}');});
test('seed produces identical simulation',()=>{const a=game(),b=game();const code='for(let i=0;i<600;i++)update(1/60);JSON.stringify(state.enemies.map(e=>[e.type,e.x,e.y]))';assert.equal(a(code),b(code));});
test('spatial query includes negative coordinates',()=>{const run=game();assert.equal(run('enemyGrid.rebuild([{x:-1,y:-1}]);enemyGrid.query(0,0,10).length'),1);});
test('every card can be applied',()=>{const run=game();run('for(const card of [...CARD_TYPES,...SPECIAL_CARDS])applyCard(card);for(let i=0;i<120;i++){update(1/60);render();}');});
test('blink validates full body and final arena position',()=>{const run=game();assert.equal(run('getChunk=()=>({walls:[{x:85,y:-100,w:100,h:200}]});state.specialCards.blink.charges=1;mouse.x=W/2+80;mouse.y=H/2;tryBlink();aabbOverlapBox(state.player.x,state.player.y,30,{x:85,y:-100,w:100,h:200})'),false);});
test('normal dart applies half damage to a detached ball',()=>{const run=game();assert.equal(run('spawnBoss();const ball=state.boss.balls[0];ball.state="flying";ball.x=100;ball.y=100;state.darts=[{type:"normal",x:100,y:100,state:"hunt",target:ball}];update_darts(0);state.boss.hp'),1199.5);});
test('Las mejoras superan los antiguos límites',()=>{
  const run=game();
  for(const [id,field] of [['multi','shots'],['size','sizeLevel'],['bounce','bounces'],['rayolaser','laserCount']]){
    assert.ok(run("for(let n=0;n<12;n++)applyCard(CARD_TYPES.find(c=>c.id==='"+id+"'));state.player."+field)>=12);
  }
});
test('Velocista consume carga, protege y limpia las copias',()=>{
  const run=game();
  run("applyCard(SPECIAL_CARDS.find(c=>c.id==='frames')); state.slots[0]='frames';useSlot(0);keys.d=true;update(1/30)");
  assert.ok(run('state.player.invuln>9 && state.player.echoes.length && !state.specialCards.frames.charges'));
  run('state.player.frameTime=.01;update(1/30)');
  assert.equal(run('state.player.echoes.length'),0);
});
test('El veneno dura más y causa daño progresivo',()=>{
  const run=game();
  run("const target=createEnemy('tank',0,0);state.enemies.push(target);poisonHit(target,{venom:2});updateCardFields(.5,true)");
  assert.equal(run('target.hp'),6);assert.equal(run('target.venomTime'),3.5);
});
test('Vampirismo cambia de ciclo a las 16 y 32 copias',()=>{
  for(const [n,kills,heal] of [[1,15,1],[15,1,1],[16,16,2],[17,15,2],[32,16,3]]){
    const run=game();
    run('state.halfHearts=2;state.player.vampirism='+n+';for(let i=1;i<'+kills+';i++)recordKill()');
    assert.equal(run('state.halfHearts'),2);
    assert.equal(run('recordKill();state.halfHearts'),2+heal);
  }
});
test('Probabilidades compuestas, crítico por ciclos y furia según la vida',()=>{
  const run=game();
  assert.ok(Math.abs(run('stackingChance(.15,3)')-.3375)<1e-10);
  assert.equal(run('stackingChance(.1,20)'),1);
  run('gameRandom=()=>.09');
  for(const [n,mult] of [[1,2],[18,2],[19,3],[37,4]]){
    assert.equal(run('state.player.critical='+n+';attackMultiplier()'),mult);
  }
  assert.equal(run('gameRandom=()=>.11;state.player.critical=19;attackMultiplier()'),1);
  assert.equal(run('state.player.fury=2;state.halfHearts=4;attackMultiplier()'),1.5);
  assert.equal(run('state.player.armor=2;damagePlayer(1);state.halfHearts'),4);
});
test('La explosión alcanza vecinos y congelación se extingue a los dos segundos',()=>{
  const run=game();
  run("const a=createEnemy('tank',100,0),b=createEnemy('tank',135,0),c=createEnemy('tank',300,0);state.enemies=[a,b,c];gameRandom=()=>0;state.player.explosive=1;state.player.frost=3;projectileImpact(a,{x:100,y:0,damage:1})");
  assert.equal(run('a.maxHp-a.hp'),2);
  assert.equal(run('b.maxHp-b.hp'),1);
  assert.equal(run('c.maxHp-c.hp'),0);
  assert.equal(run('moveTime(a,1)'),.7);
  assert.equal(run('state.time=2;moveTime(a,1)'),1);
});
test('El primer cuadro local mueve, apunta y dispara antes de una respuesta de red',()=>{
  const run=game();
  run("playMode='online';keys.d=true;mouse.y=H;mouse.down=true;predictLocalFrame(16,.016);render()");
  assert.ok(run('state.player.x>0 && state.player.angle>1 && previewShots.length===1 && !state.bullets.length'));
  run('const next=JSON.parse(JSON.stringify(state));next.selfId=2;next.player.volley=1;next.bullets=[{...previewShots[0],shooterId:2,netId:1}];prepareMotion(state,next,50)');
  assert.equal(run('previewShots.length'),0);
});
test('Los cambios de dirección y las ráfagas coinciden con solo bajo latencia variable',()=>{
  const online=game(), solo=game();
  const room=require('../room-engine.cjs')({difficulty:1,xp:1,pvp:false,disabled:['normal','boss']});
  room.add('a',{name:'A',color:'#fff'});
  online("playMode='online'");
  const packets=[], snapshots=[], predicted=[],authoritative=[];
  let maxError=0, volley=0;
  for(let i=1;i<=150;i++){
    const keys='keys.d='+ (i<32 || i>=56&&i<92)+';keys.a='+(i>=32&&i<56)+';mouse.down='+(i<76 || i===90);
    solo(keys+';applyControl(1/60,movementDirection(),null)');
    online(keys+';predictLocalFrame('+i+'*1000/60,1/60)');
    if(online('previewShots.some(b=>b.volley===commandNumber)'))predicted.push(i);
    if(i%3===0)packets.push({due:i+(i%2?10:5),frames:JSON.parse(online('JSON.stringify(inputHistory)'))});
    for(const packet of packets.filter(p=>p.due===i))room.input('a',{frames:packet.frames},[]);
    if(i%2===0){
      room.tick(1/30);
      const s=room.snapshot('a');
      if(s.player.volley!==volley){volley=s.player.volley;authoritative.push(volley);}
      if(i%4===0)snapshots.push({due:i+6,s:JSON.stringify(s)});
    }
    for(const packet of snapshots.filter(p=>p.due===i))
      online('{const next='+packet.s+';prepareMotion(state,next,'+i+'*1000/60);state=next}');
    maxError=Math.max(maxError,Math.abs(online('state.player.x')-solo('state.player.x')));
  }
  assert.ok(maxError<.001,'Desviación respecto a singleplayer: '+maxError);
  assert.deepEqual(predicted,authoritative);
  assert.ok(predicted.length>=5);
});
test('Los distintivos se activan al bloquear, curar, congelar y acertar un crítico',()=>{
  const run=game();
  run(`const p=state.player,e=createEnemy('tank',80,0);
       Object.assign(p,{armor:20,vampirism:15,frost:2,critical:1,fury:1});
       state.halfHearts=4;gameRandom=()=>0;damagePlayer(1);recordKill(e);
       projectileImpact(e,{x:e.x,y:e.y,damage:1});state.enemies=[e];
       p.field={x:80,y:0,r:90,time:1,born:0};render()`);
  assert.equal(run("p.pulses.map(h=>h.kind).join(',')"),'armor,vampirism,frost,critical');
});
test('Una bala rápida que cruza dos blancos golpea una vez al primero',()=>{
  const run=game();
  run(`const first=createEnemy('fast',12,0), second=createEnemy('fast',40,0);
       state.enemies=[second,first];spawnBullet(-8,0,0,2000,{damage:.5});
       update_playerProjectiles(1/30);update_projectileHits(1/30)`);
  assert.equal(run('first.hp'),.5);
  assert.equal(run('second.hp'),1);
  assert.equal(run('state.bullets.length'),0);
});
test('Con retraso, se valida el blanco apuntado y se descarta el contacto lejano',()=>{
  const run=game();
  run(`const e=createEnemy('tank',60,0);state.enemies=[e];
       rememberPosition(e,0);state.time=.1;e.y=50;
       spawnBullet(35,0,0,900,{damage:2,viewDelay:.1});
       update_playerProjectiles(1/30);update_projectileHits(1/30)`);
  assert.equal(run('e.hp'),5);
  run('e.x=0;e.y=0;state.viewDelay=.1;update_contactDamage(1/30)');
  assert.equal(run('state.halfHearts'),8);
  run('state.viewDelay=0;update_contactDamage(1/30)');
  assert.equal(run('state.halfHearts'),7);
});
test('Solo aumentan los ajustes adaptativos con las tres condiciones a la vez',()=>{
  for(const [level,damage,kills,age,expected] of [[31,23,8,15,true],[30,23,8,0,false],
    [31,22,8,0,false],[31,23,7,0,false],[31,23,8,15.1,false]]){
    const run=game();
    run('state.levelTimer='+level+';state.damageTimer='+damage+';for(let i=0;i<'+kills+';i++)recordKill();state.time='+age+';gameRandom=()=>0;checkAdaptive(15)');
    assert.equal(run('state.spawnRateMult<1'),expected);
  }
});
test('Sandbox mantiene el mapa sin oleadas y admite enemigos junto al jefe manual',()=>{
  const run=game();
  run("playMode='sandbox';state.spawnTimer=0;state.bossSpawnTimer=0;for(let i=0;i<100;i++)update(.05)");
  assert.equal(run('state.enemies.length'),0);
  assert.equal(run('state.boss'),null);
  run("state.enemies.push(createEnemy('tank',20,50));spawnBoss({x:590,y:-380});updateBoss(0)");
  assert.equal(run('state.enemies.length'),1);
  assert.equal(run('state.boss.x'),590);
  assert.equal(run('state.boss.y'),-380);
});
test('Las rotaciones sustituyen al donante y respetan la lista desactivada',()=>{
 const run=game();
 for(const [donor,id,time] of [['normal','splitter',105],['fast','tackler',115],['shooter','cannon',125],['invoker','frostMage',135]]){
   run("baseEnemyType=()=>'"+donor+"';gameRandom=()=>0;rules.disabled=[]");
   assert.equal(run('state.firstBossDefeatAt=null;chooseEnemyType(999)'),donor);
   run('state.firstBossDefeatAt=100');
   assert.equal(run('chooseEnemyType('+ (time-1)+')'),donor);
   assert.equal(run('chooseEnemyType('+time+')'),id);
   assert.equal(run("rules.disabled=['"+id+"'];chooseEnemyType(200)"),donor);
 }
});
test('El divisor se agota en siete bajas',()=>{
 const run=game();run("state.enemies=[createEnemy('splitter',50,50)];for(let i=0;i<7;i++)killEnemy(0)");
 assert.equal(run('state.enemies.length'),0);assert.equal(run('state.kills'),7);
});
test('Cargas, vida azul, inversión, plasma y tiempo roto',()=>{
 const run=game();
 run("for(const [id] of expansionCards){const c=SPECIAL_CARDS.find(c=>c.id===id);applyCard(c);applyCard(c)}");
 assert.equal(run("activateExpansion('activeHeal');state.blueHealth"),3);
 assert.equal(run("damagePlayer(1);state.blueHealth"),2);
 run("state.enemyBullets=[{x:20,y:0,vx:-80,vy:0,r:4,life:2}];state.enemyDarts=[{x:10,y:0}];activateExpansion('reverse')");
 assert.equal(run("state.bullets[0].homing && state.darts[0].type==='explosive'"),true);
 run("activateExpansion('timeBreak');const bx=state.bullets[0].x;update(.05)");
 assert.equal(run('state.bullets[0].x===bx'),true);
 run("state.stopUntil=0;update(.05);activateExpansion('kame');activateExpansion('kame')");
 assert.equal(run('state.player.beam.length'),2);
 run("activateExpansion('plasma');state.enemyBullets=[{x:40,y:0,vx:-90,vy:0,r:5}];repelPlasma();state.player.invuln=0;damagePlayer(2);render()");
 assert.equal(run('state.enemyBullets[0].vx'),90);assert.equal(run('state.blueHealth'),2);
 assert.equal(run('damagePlayer(1,true);state.blueHealth'),1);
});
test('Dos jefes independientes comparten la arena y Duplibala funciona contra cuerpo y bola',()=>{
  const run=game();
  run("spawnBoss({x:180,y:0});spawnBoss({x:-210,y:0});const [a,b]=livingBosses();update_movementAndWeapons(.01);render()");
  assert.ok(run('a.timer<3 && b.timer<3 && state.arena'));
  run("const ball=b.balls[0];ball.state='flying';ball.x=50;ball.y=140;spawnBullet(50,140,0,400,{dupli:1,damage:10});update_projectileHits()");
  assert.equal(run('state.bullets.length'),2);assert.equal(run('b.maxHp-b.hp'),5);
  run('state.bullets=[];spawnBullet(a.x-90,a.y,0,350,{dupli:1,damage:a.hp});update_projectileHits()');
  assert.equal(run('state.bullets.length'),2);assert.ok(run('state.boss===b && state.bossActive && state.arena'));
  run("baseEnemyType=()=>'dardante'");assert.equal(run('chooseEnemyType(300)'),'dardante');
  run("killBoss(b)");assert.ok(run('state.arena===null && !state.bossActive && state.kills===2'));
});
test('Sandbox retira mejoras, especiales activos y equipo conservando el mundo',()=>{
 const run=game();
 run("playMode='sandbox';state.player.x=150;spawnBoss();for(const c of [...CARD_TYPES,...SPECIAL_CARDS])applyCard(c);activateExpansion('timeBreak');clearSandboxCards()");
 assert.ok(run('state.player.x===150 && state.boss && state.player.shots===1 && !state.drones.length && !state.shields.length && !state.stopUntil && Object.values(state.specialCards).every(s=>s.totalCards===0)'));
});
test('El cristal quita medio corazón una vez al caer y Kamekameka inflige 285 por segundo',()=>{
 const run=game();run('state.iceZones=[{x:0,y:0,age:0}];const hp=state.halfHearts;updateExpansion(.64,true)');
 assert.equal(run('state.halfHearts'),run('hp'));run('updateExpansion(.02,true);state.player.invuln=0;updateExpansion(.02,true)');
 assert.equal(run('hp-state.halfHearts'),1);
 run("spawnBoss({x:210,y:0});state.player.beam=[{a:0,end:.45}];updateExpansion(.1,true)");
 assert.equal(run('state.boss.maxHp-state.boss.hp'),28.5);
});
test('El aviso reserva un jefe veinte segundos antes en cada dificultad y agota el catálogo',()=>{
 const run=game();
 for(const rate of [.5,1,3]){
   run('state=newState();rules.difficulty='+rate+';state.bossSpawnTimer=20*rules.difficulty+.1;update_stormAndBossSchedule(.01)');
   assert.equal(run('state.bossOmen'),null);
   run('update_stormAndBossSchedule(.2);const announced'+String(rate).replace('.','_')+'=state.bossOmen.kind;state.bossSpawnTimer=.001;update_stormAndBossSchedule(.01)');
   assert.equal(run('state.boss.kind'),run('announced'+String(rate).replace('.','_')));
 }
 assert.equal(run("rules.disabled=Object.keys(BOSS_NAMES).filter(id=>id!=='boss');pickEncounter().join()"),'boss');
 assert.equal(run("rules.disabled=Object.keys(BOSS_NAMES);pickEncounter()"),null);
});
test('Una bala corta el gusano en dos y la victoria llega al eliminar la última bola',()=>{
 const run=game();run("spawnBoss({x:0,y:100},'worm');const worm=state.boss,body=worm.pieces[0].parts,s=body[37];spawnBullet(s.x,s.y,0,900,{damage:s.hp});update_projectileHits()");
 assert.equal(run('worm.pieces.length'),2);
 assert.ok(run('worm.pieces.every(p=>p.parts.length===37) && body[0].maxHp>body[1].maxHp && state.kills===0'));
 run("const [left,right]=worm.pieces;wormWindup(left,false);startWormLines(right);const angle=left.heading;state.player.x=500;updateBoss(.1);render()");
 assert.ok(run("left.heading===angle && left.mode==='windup' && right.mode==='exit'"));
 run('for(const s of bossTargets().slice(1)){s.hp=0;finishTarget(s);}');
 assert.ok(run('state.boss===worm && state.arena'));run('const lastSegment=bossTargets()[0];lastSegment.hp=0;finishTarget(lastSegment)');
 assert.ok(run('state.boss===null && state.kills===1 && state.arena===null'));
});
test('Carriles de borde a borde, diez a quince estampidas por trozo y descanso en fase dos',()=>{
 const run=game();run("spawnBoss({x:40,y:20},'worm');const worm=state.boss,piece=worm.pieces[0];startWormLines(piece);const lanes=new Set();for(let i=0;i<1500;i++){if(piece.mode==='pass')lanes.add(piece.lanes[piece.lane]);updateBoss(1/60);if(piece.mode==='curve')break;}");
 assert.equal(run('lanes.size'),run('Math.ceil((piece.horizontal?state.arena.h:state.arena.w)/150)'));
 run('finishTarget(piece.parts[5]);for(const s of bossTargets())s.hp=s.maxHp*.29;updateBoss(.01);const counts=worm.pieces.map(()=>0),lastModes=[];for(let i=0;i<700;i++){updateBoss(1/60);worm.pieces.forEach((p,k)=>{if(p.mode==="rush" && lastModes[k]!=="rush")counts[k]++;lastModes[k]=p.mode});if(worm.pieces.every(p=>p.mode==="rest"))break;}');
 assert.ok(run('worm.phase===2 && counts.length===2 && counts.every(n=>n>=10 && n<=15) && worm.pieces.every(p=>p.mode==="rest")'));
});
test('Cadencia aumenta el límite por jugador y Tiempo roto conserva cada grieta entre golpes',()=>{
 const run=game();assert.equal(run('playerBulletLimit(state.player)'),200);
 run("applyCard(CARD_TYPES.find(c=>c.id==='fire'));for(let i=0;i<270;i++)spawnBullet(0,0,0,400,{})");
 assert.equal(run('state.bullets.length'),250);
 run('state.stopStarted=1;state.stopUntil=4;state.time=1;fractureShake();const pattern=fracture.paths;state.time+=.001;fractureShake()');
 assert.equal(run('fracture.step'),0);run('state.time=4;fractureShake();render()');
 assert.ok(run('fracture.paths===pattern && fracture.step===fracture.times.length-1 && fracture.paths.every(ray=>ray.at(-1).at===1)'));
});
test('Cadencia, Multidisparo y Retroceso amplían juntos el presupuesto de balas',()=>{
 const run=game();run("for(const id of ['fire','multi','back','back'])applyCard(CARD_TYPES.find(c=>c.id===id))");
 assert.equal(run('playerBulletLimit(state.player)'),400);
});
test('Cada reliquia permite una elección además de las subidas pendientes',()=>{
 const run=game();run('state.level=9;state.xpNeeded=200;spawnBoss();killBoss();');
 assert.equal(run('state.cardRelics.length'),2);
 assert.ok(Math.abs(run('state.orbs.reduce((n,o)=>n+o.value,0)')-700)<1e-6);
 run('state.pendingLevelUps=1;openCardSelection();Object.assign(state.player,state.cardRelics[0]);collectCardRelics()');
 assert.equal(run('state.bonusPicks'),1);
 run('pickCard(state.cardChoices[0]);');
 assert.ok(run('state.level===9 && state.pendingLevelUps===1 && state.cardChoices.length===3 && state.cardRelics.length===1'));
 run('pickCard(state.cardChoices[0]);Object.assign(state.player,state.cardRelics[0]);collectCardRelics();pickCard(state.cardChoices[0]);');
 assert.ok(run('state.level===9 && !state.cardChoices && state.cardRelics.length===0'));
});
test('El Círculo absorbe y devuelve las mismas masas, emite rayos y termina antes del botín',()=>{
 const run=game();run("spawnBoss({x:220,y:50},'singular');const b=state.boss;startSingularAttack(b,'attract');for(let i=0;i<720 && b.state!=='repel';i++){updateBoss(1/60);update_enemyProjectiles(1/60)}");
 assert.ok(run('b.orbitTime>8 && b.orbitTime<12'));assert.equal(run('b.absorbed.length'),220);run("const masses=[...b.absorbed].sort().join();updateBoss(.6);");assert.equal(run("state.enemyBullets.map(s=>s.damage).sort().join()"),run('masses'));
 run("startSingularAttack(b,'blink');const count=b.remaining;for(let i=0;i<count;i++){updateBoss(.16);updateBoss(1.13);}");
 assert.ok(run("count>=4 && count<=6 && state.cosmicZones.filter(z=>z.type==='beam').length===count"));
 run("b.hp=b.maxHp*.5;updateBoss(.01);startSingularAttack(b,'lunar');");
 assert.ok(run('new Set(b.planets.map(p=>p.distance)).size===4 && b.planets.every(p=>p.moons.length===4)'));
 run("const shots=state.enemyBullets.length;updateBoss(.9);");assert.equal(run('state.enemyBullets.length-shots'),16);
 run("b.hp=b.maxHp*.29;b.ambient=0;updateBoss(.01);render()");
 assert.ok(run("b.phase===3 && state.cosmicZones.some(z=>z.type==='well') && state.cosmicZones.some(z=>z.type==='solar')"));
 run("b.hp=0;finishTarget(b);finishTarget(b);render()");
 assert.ok(run("b.state==='final' && !bossTargets().length && state.enemyBullets.filter(s=>s.planet).length===4 && !state.cardRelics.length"));
 run('for(let i=0;i<130;i++)updateBoss(1/60);render()');
 assert.ok(run("!state.boss && state.kills===1 && state.cardRelics.length===2 && state.cosmicZones.some(z=>z.type==='nova')"));
});
test('El triángulo solar ocupa dos veces el área del hielo y golpea sin congelar',()=>{
 const run=game();run("solarVolley();const z=state.cosmicZones[0],v=solarVertices(z);state.cosmicZones=[z];const area=Math.abs((v[1].x-v[0].x)*(v[2].y-v[0].y)-(v[1].y-v[0].y)*(v[2].x-v[0].x))/2;");
 assert.ok(Math.abs(run('area/(Math.PI*45**2)')-2)<1e-9);
 run('const hp=state.halfHearts;updateCosmicZones(.65,true);');assert.equal(run('hp'),run('state.halfHearts'));
 run('updateCosmicZones(.04,true);');assert.ok(run('hp-state.halfHearts===2 && !state.player.iceUntil && state.shake>0'));
});

test('El colapso dibuja hasta la nova con partículas de la estela ya caducadas',()=>{
 const run=game();
 run("playMode='sandbox';spawnBoss({x:300,y:80},'singular');const b=state.boss;b.timer=30;state.player.invuln=100;for(let i=0;i<150;i++)update(1/60)");
 assert.ok(run('b.trail.length>10 && state.arena.w===1366 && state.arena.h===768'));
 run('b.hp=0;finishTarget(b);for(let i=0;i<135;i++){update(1/60);render()}');
 assert.ok(run('!state.boss && state.cardRelics.length+state.bonusPicks===2'));
});
test('Los planetas alcanzan al jugador lejos del núcleo',()=>{
 const run=game();
 run("spawnBoss({x:0,y:0},'singular');const b=state.boss;b.hp=b.maxHp/2;updateBoss(.01);const outer=b.planets.at(-1);Object.assign(state.player,{x:outer.x,y:outer.y});const hp=state.halfHearts;planetContact(b,state.player)");
 assert.ok(run('outer.distance>300 && hp-state.halfHearts===1'));
});
test('El catálogo de diez recorre sus 1023 conjuntos y después conserva el máximo',()=>{
 const sequence=()=>game()('JSON.stringify(Array.from({length:1026},pickEncounter))');
 const out=JSON.parse(sequence());assert.equal(JSON.stringify(out),sequence());
 let start=0;
 for(const [index,n] of [10,45,120,210,252,210,120,45,10,1].entries()){
   const groups=out.slice(start,start+n);start+=n;
   assert.ok(groups.every(g=>g.length===index+1 && new Set(g).size===g.length));
   assert.equal(new Set(groups.map(g=>g.sort().join('+'))).size,n);
 }
 assert.ok(out.slice(1023).every(g=>g.length===10));
 const run=game();run("rules.disabled=Object.keys(BOSS_NAMES).filter(k=>!['fractal','clock','crown'].includes(k))");
 const reduced=JSON.parse(run('JSON.stringify(Array.from({length:9},pickEncounter))'));
 assert.deepEqual(reduced.map(g=>g.length),[1,1,1,2,2,2,3,3,3]);
 assert.ok(reduced.flat().every(id=>['clock','fractal','crown'].includes(id)));
});
test('Una arena, una escala y una entrega por muerte durante un encuentro triple',()=>{
 const run=game();run("spawnEncounter(['fractal','clock','crown']);const group=livingBosses();");
 assert.ok(run('state.bossEncounters===1 && group.every(b=>b.maxHp===1200) && new Set(group.map(b=>b.id)).size===3 && state.arena.w===1366 && state.arena.h===768'));
 for(let i=0;i<3;i++){
   run('startPatternFinal(group['+i+']);killBoss(group['+i+']);for(let k=0;k<1200 && !group['+i+']._dying;k++){updateBoss(1/60,group['+i+']);render()}');
   assert.equal(run('state.cardRelics.length'),2*(i+1));assert.equal(run('!!state.arena'),i<2);
 }
 run("spawnEncounter(['clock','crown'])");assert.ok(run('livingBosses().every(b=>b.maxHp===1500)'));
});
for(const kind of ['fractal','clock','crown'])test('Todas las fases y ataques de '+kind+' existen en Canvas y la simulación',()=>{
 const run=game();run("playMode='sandbox';spawnBoss(null,'"+kind+"');const b=state.boss;const spec=PATTERN_BOSSES[b.kind];");
 for(let phase=2;phase<=3;phase++){
   run('b.hp=b.maxHp*(spec.limits['+(phase-2)+']-.01);updateBoss(.01);render()');
   assert.equal(run('b.phase'),phase);
 }
 const moves=JSON.parse(run('JSON.stringify(spec.moves.flat())'));
 for(const m of moves){
   run("state.enemyBullets=[];beginPattern(b,'"+m+"');for(let i=0;i<2000 && b.state!=='recover';i++){state.time+=1/30;updateBoss(1/30,b);update_enemyProjectiles(1/30);if(i%10===0)render()}");
   assert.ok(run("b.state==='recover' && Number.isFinite(b.x) && Number.isFinite(b.y)"),m);
 }
});
test('La abertura de prisión y las zonas de aviso usan la geometría de impacto',()=>{
 const run=game();run("spawnBoss(null,'fractal');const b=state.boss;beginPattern(b,'prison');b.gap=0;b.trap={x:0,y:0};b.age=1;const shapes=patternShapes(b);");
 assert.equal(run('shapes.some(s=>patternTouches(s,{x:0,y:-185,size:30}))'),false);
 assert.equal(run('shapes.some(s=>patternTouches(s,{x:95,y:-185,size:30}))'),true);
 run("b.age=.6");assert.equal(run('patternShapes(b).some(s=>s.live)'),false);
});
test('Un pozo estalla durante 650 ms sin atraer ni causar daño después del colapso',()=>{
 const run=game();run("summonWells(1);const z=state.cosmicZones[0];z.age=z.off-.01;const p=state.player;Object.assign(p,{x:z.x+10,y:z.y});const hp=state.halfHearts;updateCosmicZones(.02,true);pullIntoWells(p,.1,[]);render()");
 assert.ok(run("z.age>z.off && state.halfHearts===hp && p.x===z.x+10 && state.bossCues.some(c=>c.name==='wellBurst')"));
 run('updateCosmicZones(.7,true)');assert.equal(run('state.cosmicZones.length'),0);
});
test('Miniatura y Gigantismo componen el mismo tamaño y cambian pared, contacto y límite real',()=>{
 function resized(order){const run=game();for(const id of order)run("applyCard(CARD_TYPES.find(c=>c.id==='"+id+"'))");return run;}
 const a=resized(['mini','giant','mini']),b=resized(['giant','mini','mini']);
 assert.ok(Math.abs(a('state.player.size')-30*.94**2*1.08)<1e-10);assert.equal(a('state.player.size'),b('state.player.size'));
 assert.ok(a('const p=state.player;p.x=0;moveWithWalls(p,200,0,[{x:60,y:-50,w:5,h:100}]);Math.abs(p.x+p.size/2-60)<1e-10'));
 assert.ok(a('fitPlayerInArena(p,{x:0,y:0,w:10,h:12});p.x===5 && p.y===6'));
 assert.ok(a('!visibleContact({x:p.x+p.size/2+4.1,y:p.y},p,p.size/2+4)'));
});
test('Colapso, ejército, ancla y corona se equipan, consumen carga y terminan',()=>{
 const run=game();run("const p=state.player;const cast=id=>{applyCard(SPECIAL_CARDS.find(c=>c.id===id));state.slots[0]=id;useSlot(0)};cast('crush');const enemy=createEnemy('tank',p.crush.x,p.crush.y);state.enemies=[enemy];updateGeometryCards(p,1.5);");
 assert.ok(run("enemy._dying && !p.crush && state.specialCards.crush.cooldown===38"));
 run("cast('army');shoot(1);updateGeometryCards(p,.16);");assert.equal(run("state.bullets.filter(s=>s.style==='army').length"),2);
 run("cast('anchor');state.enemyBullets=[{x:p.x+20,y:p.y,r:6,vx:-300,vy:0,life:.1}];updateGeometryCards(p,.5);");
 assert.ok(run("p.anchor.held.length===1 && !state.enemyBullets.length"));run("updateGeometryCards(p,3.5)");
 assert.ok(run("!p.anchor && state.bullets.some(s=>s.style==='anchor' && s.vx>0)"));
 run("cast('needles');updateGeometryCards(p,.05);render();");assert.equal(run("state.bullets.filter(s=>s.style==='needles').length"),8);
 run("updateGeometryCards(p,6.1)");assert.ok(run("!p.army && !p.needles"));
});
test('Marea cuenta ciclos, cinética pierde carga al parar y reacción respeta la inmunidad',()=>{
 const run=game();run("const p=state.player;for(const id of ['persist','tide','kinetic','reaction'])applyCard(CARD_TYPES.find(c=>c.id===id));p.vx=100;updateGeometryCards(p,2);for(let i=0;i<7;i++)shoot(1);");
 assert.equal(run("state.bullets.filter(s=>s.style==='tide').length"),5);assert.ok(run('state.bullets[0].damage===1.05 && state.bullets[0].life>1.8'));
 run("p.vx=0;updateGeometryCards(p,.51);damagePlayer(1);damagePlayer(1)");
 assert.ok(run("p.movingTime===0 && p.geometryFX.filter(z=>z.kind==='reaction').length===1"));
});
test('Resonancia cuenta doce impactos y Cadena sobre 100 % conserva descargas adicionales',()=>{
 const run=game();run("const p=state.player,t=createEnemy('tank',30,0),n=createEnemy('tank',90,0);state.enemies=[t,n];p.resonance=1;for(let i=0;i<11;i++)geometryImpact(t,p);const before=n.hp;geometryImpact(t,p);");
 assert.equal(run('before-n.hp'),1);run("p.resonance=0;p.chain=14;gameRandom=()=>.9;const hp=n.hp;geometryImpact(t,p);");
 assert.equal(run('hp-n.hp'),2);
});
test('Cancelación por área, acumulación simultánea, continuidad y barrido relativo',()=>{
 const run=game();
 run('const shot=(r,x=0,y=0)=>({x,y,r,vx:300,vy:0,life:5,damage:3});const collide=(n,r)=>{state.bullets=Array.from({length:n},()=>shot(r));update_projectileCancellation()}');
 for(const [r,hits] of [[6,1],[11,4],[17,9]]){
   run('state.enemyBullets=[shot('+r+')]');
   for(let i=1;i<hits;i++){
     run('collide(1,6);update_projectileCancellation()');
     assert.equal(run('state.enemyBullets[0].cancelHP'),r*r-i*36);
     assert.ok(run('!state.bullets.length && state.enemyBullets[0].vx===300 && state.enemyBullets[0].damage===3'));
   }
   run('collide(1,6)');assert.equal(run('state.enemyBullets.length'),0);
 }
 run('state.enemyBullets=[shot(17)];collide(9,6)');assert.equal(run('state.enemyBullets.length+state.bullets.length'),0);
 run('state.enemyBullets=[{...shot(6,150),prevX:-150}];state.bullets=[{...shot(17,-150),prevX:150}];update_projectileCancellation()');
 assert.equal(run('state.enemyBullets.length+state.bullets.length'),0);
 run('state.enemyBullets=Array.from({length:600},(_,i)=>shot(6,30*i));state.bullets=state.enemyBullets.map(e=>shot(6,e.x));update_projectileCancellation()');
 assert.equal(run('state.enemyBullets.length+state.bullets.length'),0);
});
for(const kind of ['beacon','twins','heart','monolith'])test('Laboratorio y ciclo completo de '+kind,()=>{
 const run=game();run("playMode='sandbox';lab.god=true;spawnBoss({x:0,y:-140},'"+kind+"');const b=state.boss,seen=new Set();");
 const moves=JSON.parse(run('JSON.stringify(sandboxPhases(b).flat())'));
 for(const move of moves){
   run("sandboxAttack(b,'"+move+"');");
   assert.equal(run('b.state'),move);
   assert.ok(run('b.events.length>0'),move);
   run("for(let i=0;i<2400 && b.state!=='recover';i++){state.time+=1/60;updateBoss(1/60,b);update_enemyProjectiles(1/60);patternContact(b,state.player);if(i%6===0)render()}");
   assert.ok(run("b.state==='recover' && Number.isFinite(b.x) && b.parts?.some(q=>!Number.isFinite(q.x))!==true"),move);
 }
 run("setSandboxPhase(b,1);killBoss(b);const before=state.cardRelics.length;const dangerous=[];for(let i=0;i<500&&!b._dying;i++){state.time+=1/60;updateBoss(1/60,b);if(!b._dying)dangerous.push(patternShapes(b).some(s=>s.live)||state.enemyBullets.length>0);if(i%5===0)render()}");
 assert.ok(run('dangerous.includes(true) && state.cardRelics.length===before+2 && !state.boss && !state.enemyBullets.some(s=>s.source===b.id)'));
});
test('Los dos gemelos comparten encuentro y cada superviviente conserva su propia ofensiva',()=>{
 for(const first of [0,1]){
  const run=game();run("spawnEncounter(['twins','heart']);const [b,h]=livingBosses();const q=b.parts["+first+"];hurtTarget(q,q.maxHp);finishTarget(q);");
  assert.ok(run("b.phase===3 && activeParts(b).length===1 && b.state==='absorb' && state.cardRelics.length===0 && state.bossEncounters===1"));
  assert.equal(run('availablePatterns(b)[0]'),first?'positiveStorm':'negativeStorm');
  run("const survivor=activeParts(b)[0];hurtTarget(survivor,survivor.maxHp);finishTarget(survivor);for(let i=0;i<330;i++)updateBoss(1/60,b)");
  assert.ok(run('state.boss===h && !!state.arena && state.cardRelics.length===2'));
 }
});
test('El núcleo pierde resistencia y solo reconstruye una vez si no se interrumpe',()=>{
 for(const interrupt of [false,true]){
  const run=game();run("spawnBoss(null,'heart');const b=state.boss;const q=b.parts[1];hurtTarget(b,90);const plated=b.maxHp-b.hp;partDefeated(q);const hp=b.hp;hurtTarget(b,90);");
  assert.ok(run('hp-b.hp>plated && !availablePatterns(b).includes("transmission")'));
  run("setSandboxPhase(b,2);beginPattern(b,'rebuild');"+(interrupt?'hurtTarget(b,b.maxHp*.12);':'')+"for(let i=0;i<140;i++)updateBoss(1/60,b)");
  assert.equal(run('q.hp>0'),!interrupt);assert.equal(run('b.repairs'),0);
 }
});
test('El láser refractado conserva cada rebote del aviso y el rayo de seguimiento fija la mira',()=>{
 const run=game();run("spawnBoss({x:0,y:0},'beacon');const b=state.boss;setSandboxPhase(b,2);beginPattern(b,'refraction');b.age=.2;const preview=patternShapes(b);b.age=1.2;const active=patternShapes(b)");
 assert.ok(run('preview.length>=3 && preview.every((s,i)=>!s.live && active[i].live && s.xx===active[i].xx && s.yy===active[i].yy && patternTouches(active[i],{...mixPoint(s,{x:s.xx,y:s.yy},.5),size:1}))'));
 run("beginPattern(b,'tracking');for(let i=0;i<65;i++)updateBoss(1/60,b);const locked=b.events[0].angle;state.player.y+=400;for(let i=0;i<20;i++)updateBoss(1/60,b)");
 assert.ok(run('b.events[0].angle===locked && patternShapes(b).some(s=>s.live)'));
});
test('Finales simultáneos respetan el turno, sus balas y el botín de cada dueño',()=>{
 const run=game();run("spawnEncounter(['fractal','clock']);const [f,c]=livingBosses();killBoss(f);killBoss(c);const marks=[];for(let i=0;i<900&&state.boss;i++){state.time+=1/60;for(const b of livingBosses())updateBoss(1/60,b);if(i===120)marks.push(c.waitFinal,state.enemyBullets.some(s=>s.source===f.id),state.cardRelics.length===0);}");
 assert.ok(run('marks.length===3 && marks.every(Boolean) && !state.arena && state.cardRelics.length===4'));
});
test('Inversión convierte disparos desgastados y bombas por encima del presupuesto normal',()=>{
 const run=game();run("state.enemyBullets=Array.from({length:200},()=>({r:11,x:0,y:0,vx:100,vy:0,damage:2,life:5,cancelHP:13}));state.bossBombs=[{x:0,y:0}];state.enemyDarts=[{x:0,y:0}];invertProjectiles()");
 assert.ok(run("state.bullets.length===201 && state.bullets.every(s=>s.homing && s.inverted && s.cancelHP===undefined) && state.darts[0].type==='explosive' && !state.enemyBullets.length"));
});
test('Laboratorio protege la vida y limpia disparos sin borrar el encuentro ni la progresión',()=>{
 const run=game();run("playMode='sandbox';lab.god=true;spawnEncounter(['heart','twins']);const b=state.boss;state.bullets=[{r:4}];state.enemyDarts=[{}];state.enemyBullets=[{}];const hp=state.halfHearts;damagePlayer(2);clearSandboxShots()");
 assert.ok(run('state.halfHearts===hp && !state.enemyBullets.length && !state.enemyDarts.length && state.bullets.length===1 && livingBosses().length===2 && !state.bossCycle.length'));
 run('lab.god=false;damagePlayer(2)');assert.equal(run('hp-state.halfHearts'),2);
});
test('El frente llega a la esquina más lejana desde cualquier emisor y su velocidad depende de la arena',()=>{
 const run=game();
 const sizes=[[960,540],[1366,768],[1850,1140]];
 const result=sizes.map(([w,h])=>JSON.parse(run(`state.arena={x:-310,y:80,w:${w},h:${h}};(()=>{
   const a=state.arena,c=patternOrigin(),summary=[];
   for(const q of [c,{x:a.x+80,y:a.y+a.h-110}])for(const square of [true,false]){
     const b={safeSize:90,events:[],timer:0,age:0};wave(b,.2,q,square,0);const e=b.events[0];
     const corners=[0,1,2,3].map(i=>({x:a.x+(i%2)*a.w,y:a.y+Math.floor(i/2)*a.h}));
     const required=Math.max(...corners.map(p=>square?Math.max(Math.abs(q.x-p.x),Math.abs(q.y-p.y)):Math.hypot(q.x-p.x,q.y-p.y)));
     summary.push([e.speed,e.end-e.on,34+e.speed*(e.end-e.on)>=required+45,b.timer>e.end]);
   }
   return JSON.stringify(summary);
 })()`)));
 for(const r of result)assert.ok(r.every(row=>row[2]&&row[3]));
 assert.ok(result[2][0][0]>result[0][0][0] && result[2][0][1]>result[0][0][1]);
});
for(const [kind,moves] of Object.entries({fractal:['collapse'],clock:['chime','rewind'],heart:['shock'],monolith:['stomp','rhythm','impact'],twins:['pulses']})){
 test('Alcance y daño progresivo de ondas de '+kind,()=>{
   const run=game();run("spawnBoss({x:0,y:-90},'"+kind+"');const b=state.boss;");
   for(const m of moves){
     run("sandboxAttack(b,'"+m+"')");
     const metrics=JSON.parse(run(`(()=>{
       const a=state.arena,hit=[false,false,false,false],events=b.events.filter(e=>e.kind==='wave');
       for(const e of events){
         const q=e.origin;
         for(let i=0;i<4;i++){
           const p={x:a.x+(i%2?a.w-15:15),y:a.y+(i>=2?a.h-15:15),size:30};
           const r=e.square?Math.max(Math.abs(q.x-p.x),Math.abs(q.y-p.y)):Math.hypot(q.x-p.x,q.y-p.y);
           if(e.reach<r+15)throw Error('onda truncada');
           const s=[];waveShapes(s,e,q,Math.max(0,(r-34)/e.speed),true);
           hit[i] ||= s.some(v=>patternTouches(v,p));
         }
       }
       return JSON.stringify([events.length,hit]);
     })()`));
     assert.ok(metrics[0]>0,m);
     if(['chime','stomp','collapse','rhythm','impact','shock'].includes(m))assert.deepEqual(metrics[1],[true,true,true,true],m);
   }
 });
}
test('Sobrecarga del Faro conserva una ruta continua a velocidad de marcha con 6–10 haces simultáneos',()=>{
 const run=game();run("spawnBoss({x:-140,y:80},'beacon');const b=state.boss;setSandboxPhase(b,4);state.player.size=64;beginPattern(b,'overload')");
 const [peak,maxSpeed]=JSON.parse(run(`(()=>{let peak=0,v=0,prev;
   for(let i=0;i<b.timer*120;i++){
     b.age=i/120;const p={...beaconPassage(b,b.age),size:64},sh=patternShapes(b);
     if(sh.some(s=>s.live&&patternTouches(s,p)))throw Error('Paso cerrado en '+b.age);
     peak=Math.max(peak,b.events.filter(e=>e.kind==='ray'&&b.age>=e.on&&b.age<=e.end).length);
     if(prev)v=Math.max(v,120*Math.hypot(p.x-prev.x,p.y-prev.y));prev=p;
   }return JSON.stringify([peak,v]);})()`));
 assert.ok(peak>=6&&peak<=10);assert.ok(maxSpeed<320);
});
test('Olas dirigidas a jugadores separados y rebobinado por el mismo carril',()=>{
 const run=game();run("spawnBoss({x:0,y:0},'clock');const b=state.boss;setSandboxPhase(b,3);roomTargets=[{x:-260,y:120,size:30},{x:260,y:-120,size:64}];beginPattern(b,'seconds');for(let i=0;i<230;i++)updateBoss(1/60,b);");
 assert.ok(run("b.events.filter(e=>e.kind==='dial').length===96 && [-260,260].every(x=>b.events.some(e=>e.kind==='dial'&&e.origin.x===x))"));
 run("beginPattern(b,'rewind');const [out,back]=b.events.filter(e=>e.kind==='rail');");
 assert.ok(run('JSON.stringify(out.path)===JSON.stringify([...back.path].reverse()) && out.lengths.at(-1)/Math.hypot(state.arena.w,state.arena.h)>.79 && Math.abs((out.end-out.on)/(back.end-back.on)-2.5)<.001'));
 run("state.enemyBullets=[];for(let i=0;i<240;i++)updateBoss(1/60,b)");
 assert.ok(run('state.enemyBullets.length>=40&&state.enemyBullets.length<=60'));
});
test('Los nuevos enemigos se desbloquean por encuentro completo y el relevo tarda 25 segundos reales',()=>{
 const run=game();run("state.time=40;spawnEncounter(['boss','boss']);killBoss(state.boss);");
 assert.equal(run('state.completedEncounters'),0);
 run("killBoss(state.boss);spawnEncounter(['boss','boss']);killBoss(state.boss);");
 assert.equal(run('state.completedEncounters'),1);run('killBoss(state.boss);rules.difficulty=3;gameRandom=()=>.19');
 assert.equal(run("baseEnemyType=()=>'normal';chooseEnemyType(120)"),'normal');
 assert.notEqual(run('chooseEnemyType(130)'),'pulseRing');assert.equal(run('chooseEnemyType(195)'),'pulseRing');
 run("baseEnemyType=()=>'fast'");assert.equal(run('chooseEnemyType(195)'),'erratic');
 run("baseEnemyType=()=>'tank'");assert.equal(run('chooseEnemyType(195)'),'tank');
 run("state.time=75;spawnBoss();killBoss();");assert.equal(run('chooseEnemyType(300)'),'rebound');
 run("baseEnemyType=()=>'shooter'");assert.equal(run('chooseEnemyType(300)'),'twinCannon');
 run("rules.disabled=['twinCannon']");assert.notEqual(run('chooseEnemyType(300)'),'twinCannon');
});
test('Sandbox permite superponer fases, probar esquinas y convertir mil balas intactas',()=>{
 const run=game();run("playMode='sandbox';spawnBoss({x:0,y:-100},'fractal');const b=state.boss;executeSandboxPair(b,'replicas','cuts');");
 assert.ok(run("b.state==='cuts'&&b.phase>=2&&b.events.some(e=>e.kind==='copy')"));
 run('state.player.size=61;for(let i=0;i<4;i++){labCorner(i);if(state.player.size!==61)throw Error()}');
 run('labBarrage(1000);state.viewWidth=10000;state.viewHeight=10000;invertProjectiles()');
 assert.equal(run('state.bullets.filter(s=>s.inverted).length'),1000);
});
test('Los relevos anuncian sus disparos, bloquean la dirección y rebotan contra paredes',()=>{
  const run=game();
  run("const p={x:300,y:0};const ring=createEnemy('pulseRing',0,0),gun=createEnemy('twinCannon',0,0),runner=createEnemy('erratic',0,0),ball=createEnemy('rebound',0,0);const step=(enemy,dt,t=p)=>updateAdvancedEnemy(enemy,t,dt,dt,300);for(const e of [ring,gun,runner]){e.shootCd=0;step(e,.01);}");
  assert.ok(run("[ring,gun,runner].every(e=>e.phase==='aim') && !state.enemyBullets.length"));
  run("step(ring,.53);const radial=state.enemyBullets.splice(0);step(gun,.62);step(gun,.24);");
  assert.ok(run("radial.length===ring.pulseCount && [6,8].includes(radial.length) && state.enemyBullets.length===10"));
  run("const start=runner.x;step(runner,.37,{x:-100,y:0});step(runner,.10,{x:-100,y:0});");
  assert.ok(run("runner.x>start+60"));
  run("currentWalls=[{x:32,y:-100,w:30,h:200}];step(ball,.12);const x=ball.x;step(ball,.10)");
  assert.ok(run("ball.boost>0 && ball.x<x-15 && ball.bounced===state.time"));
});
