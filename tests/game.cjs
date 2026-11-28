const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
function game() {
 const ctx=new Proxy({}, {get:(_,k)=>k==='arc'?(_x,_y,r)=>assert.ok(Number.isFinite(r) && r>=0):k==='measureText'?()=>({width:30}):String(k).endsWith('Gradient')?()=>({addColorStop(){}}):()=>{}});
 const sandbox={console,URLSearchParams,location:{search:'?seed=42'},performance:{now:()=>0},setTimeout:()=>{},requestAnimationFrame:()=>{},window:{innerWidth:1200,innerHeight:800,addEventListener:()=>{}},document:{createElement:()=>({getContext:()=>ctx}),getElementById:()=>({getContext:()=>ctx,addEventListener:()=>{}})}};
 vm.createContext(sandbox);
 const html=fs.readFileSync('index.html','utf8');
 for(const [,file] of html.matchAll(/src="([^"]+)"/g)) vm.runInContext(fs.readFileSync(file.split('?')[0],'utf8'),sandbox,{filename:file});
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
 const sequence=()=>game()("rules.disabled=Object.keys(ENCORE);JSON.stringify(Array.from({length:1026},pickEncounter))");
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

for(const kind of ['dawn','prism','sovereign','channel','general','frontier']){
  test('Todas las fases, ataques y desenlace de '+kind,()=>{
    const run=game();
    run("playMode='sandbox';lab.god=true;spawnBoss({x:40,y:-120},'"+kind+"');const b=state.boss;const moves=sandboxPhases(b);");
    for(const [index,list] of JSON.parse(run('JSON.stringify(moves)')).entries()){
      run('setSandboxPhase(b,'+(index+1)+');');
      for(const move of list){
        run("sandboxAttack(b,'"+move+"')");
        assert.ok(run('b.events.length>0 && Number.isFinite(b.timer)'),move);
        run("for(let i=0;i<650&&b.state!=='recover';i++){update(1/30);if(i%12===0)render();}");
        assert.ok(run("b.state==='recover' && !state.over && Number.isFinite(b.x)&&state.enemyBullets.every(s=>Number.isFinite(s.x+s.y+s.vx+s.vy))"),move);
      }
    }
    run("clearSandboxShots();killBoss(b);killBoss(b);");
    assert.ok(run("b.state==='final'&&!state.cardRelics.length&&b.finalLength>=6"));
    run("let danger=false;for(let i=0;i<600&&state.boss;i++){update(1/30);danger ||=state.enemyBullets.length>0||state.enemies.some(e=>e.master===b.id)||patternShapes(b).some(s=>s.live);if(i%9===0)render();}killBoss(b,true);");
    assert.ok(run("danger&&!state.boss&&!state.arena&&state.completedEncounters===1&&state.cardRelics.length+state.bonusPicks===2&&!state.enemies.some(e=>e.master===b.id)&&!state.enemyBullets.some(s=>s.source===b.id)"));
  });
}
test('Dieciséis jefes recorren 65535 encuentros distintos con memoria constante',()=>{
  const run=game();
  assert.ok(run("(()=>{const seen=new Set();let size=0;for(let i=0;i<65535;i++){const g=pickEncounter(),key=g.join('+');if(g.length<size||seen.has(key)||state.bossCycle.length>3)return false;size=g.length;seen.add(key);}return size===16&&pickEncounter().length===16;})()"));
});
test('Las capas del Faro persisten al cambiar el ataque principal y comparten el paso seguro',()=>{
  const run=game();run("spawnBoss(null,'beacon');const b=state.boss;beginPattern(b,'sweep');sideScore(b,'emitters');sideScore(b,'curtain');const first=b.layers[0];");
  assert.equal(run('b.layers.length'),2);
  run("for(let i=0;i<36;i++)updateBoss(1/60,b);const age=first.age;beginPattern(b,'tracking');");
  assert.ok(run("first===b.layers[0]&&first.age===age"));
  run("for(let i=0;i<120;i++){updateBoss(1/60,b);const p={...beaconPassage(b,b.age),size:30};if(patternShapes(b).some(s=>s.live&&patternTouches(s,p)))throw Error('se cerró la abertura');}");
});
test('Hora Cero clásico mantiene su sector circular y puede entrar desde fuera de la arena',()=>{
  const run=game();run("spawnBoss(null,'clock');const b=state.boss;setSandboxPhase(b,3);beginPattern(b,'zero');const original=b.events[0].kind;beginPattern(b,'zeroClassic');const e=b.events[0];");
  assert.ok(run("original==='perimeter'&&e.kind==='classicRing'&&e.r>=Math.hypot(state.arena.w,state.arena.h)/2"));
  run("for(let i=0;i<90;i++){updateBoss(1/60,b);update_enemyProjectiles(1/60);}");
  assert.ok(run("state.enemyBullets.some(s=>s.entersArena)&&state.enemyBullets.some(s=>s.streak&&!s.entersArena)"));
});
test('Repetir fase del sandbox acumula cuatro Dash solo una vez y restaura el corredor',()=>{
  const run=game();run("playMode='sandbox';spawnEncounter(['frontier','heart']);const [b,other]=livingBosses();const card=SPECIAL_CARDS.find(c=>c.id==='dash');applyCard(card);applyCard(card);state.specialCards.dash.charges=1;const w=state.arena.w;setSandboxPhase(b,2);chaseGift();setSandboxPhase(b,2);chaseGift();");
  assert.ok(run("state.specialCards.dash.totalCards===6&&state.specialCards.dash.charges===5&&state.slots.includes('dash')&&state.arena.w>w&&!state.cardChoices"));
  run("const start=state.arena.x;for(let i=0;i<900;i++){state.player.x=b.x+260;updateChase(b,1/30);}setSandboxPhase(b,1);");
  assert.ok(run("state.arena.x>start+1200&&!state.arena.chase&&state.arena.w===w&&livingBosses().includes(other)"));
});

test('Dos finales nuevos conservan la arena y entregan cada botín una vez',()=>{
  const run=game();run("playMode='sandbox';lab.god=true;spawnEncounter(['general','frontier']);const [g,f]=livingBosses();setSandboxPhase(f,2);chaseGift();killBoss(g);killBoss(f);");
  const ok=run("(()=>{let partial=false,redeemed=0;for(let i=0;i<900&&state.boss;i++){if(state.cardChoices){if(state.bonusPicks)redeemed++;pickCard(state.cardChoices[0]);}update(1/30);if(livingBosses().length===1){partial=true;if(!state.arena||state.completedEncounters)return false;}}return partial&&!state.arena&&!state.boss&&state.completedEncounters===1&&state.cardRelics.length+state.bonusPicks+redeemed===4;})()");
  assert.equal(ok,true);
});
test('Cada esquina intersecta al menos un radio ofensivo del Hora Cero original',()=>{
  const run=game();run("spawnBoss(null,'clock');const b=state.boss;setSandboxPhase(b,3);beginPattern(b,'zeroClassic');");
  assert.ok(run("(()=>{const a=state.arena,c=patternOrigin();return [a.x,a.x+a.w].every(x=>[a.y,a.y+a.h].every(y=>b.events.some(e=>e.kind==='classicRing'&&e.angles.some(theta=>Math.cos(theta-angleTo(c,{x,y}))>.99998))));})()"));
});
test('Las invocaciones mantienen propietario y caducidad en un encuentro con dos invocadores',()=>{
  const run=game();run("playMode='sandbox';lab.god=true;spawnEncounter(['sovereign','sovereign']);const [a,b]=livingBosses();for(const c of [a,b]){beginPattern(c,'portals');for(let j=0;j<65;j++)updateBoss(1/60,c);}const before=state.score;const own=state.enemies.findIndex(e=>e.master===a.id);killEnemy(own);");
  assert.ok(run("state.score===before&&state.enemies.some(e=>e.master===a.id)&&state.enemies.some(e=>e.master===b.id)"));
  run("killBoss(a,true);");assert.ok(run("!state.enemies.some(e=>e.master===a.id)&&state.enemies.every(e=>e.master===b.id)&&state.arena"));
});

test('Extras conserva el laboratorio y Boss Rush empieza en control manual',()=>{
  const html=fs.readFileSync('index.html','utf8');
  const home=html.split('<div id="home">')[1].split('</div>')[0];
  assert.match(home,/id="extrasButton"/);assert.doesNotMatch(home,/id="sandbox"/);
  for(const id of ['sandbox','rushButton'])assert.match(html.split('<section id="extras"')[1].split('</section>')[0],new RegExp('id="'+id+'"'));
  assert.match(html,/<input type="checkbox" id="botPlay">/);
  assert.match(html,/id="labTool"/);
});
test('Selección ponderada reproducible sin exclusiones en solo y rush',()=>{
  const run=game();
  for(const mode of ['solo','rush']){
    run("playMode='"+mode+"'");
    const count=run(`(()=>{
      if(Object.keys(BOSS_NAMES).some(id=>!BOSS_DIFFICULTY[id]))return -1;
      let easy=0,hard=0,distinct=new Set();
      for(let seed=0;seed<400;seed++){
        state=newState();randomState=seed;const first=pickEncounter()[0];distinct.add(first);
        if(BOSS_DIFFICULTY[first]<=2)easy++;
        if(BOSS_DIFFICULTY[first]>=5)hard++;
        const others=new Set([first,...Array.from({length:15},()=>pickEncounter()[0])]);
        if(others.size!==16)return -2;
        state=newState();randomState=seed;if(pickEncounter()[0]!==first)return -3;
      }
      return easy>5*hard && distinct.size>6 && hard>0;
    })()`);
    assert.equal(count,true);
  }
});
test('Boss Rush recorre 3 individuales, 3 duplas y 1 trío, cobra cuatro reliquias por jefe y espera la elección',()=>{
  const run=game();
  run("playMode='rush';rules.disabled=Object.keys(BOSS_NAMES).filter(k=>!['boss','fractal','clock'].includes(k));beginRush(false)");
  const groups=[];
  for(const size of [1,1,1,2,2,2,3,3]){
    const group=JSON.parse(run('JSON.stringify(state.rush.group)'));groups.push(group.join('+'));assert.equal(group.length,size);
    run('updateRushSchedule(5);globalThis.constituents=livingBosses()');
    for(let i=0;i<size;i++){
      run('killBoss(constituents['+i+'],true);killBoss(constituents['+i+'],true);updateRushSchedule(.01)');
      assert.equal(run('state.cardRelics.length'),4*(i+1));
      assert.equal(run('!!state.arena'),i<size-1);
      assert.equal(run('state.rush.phase'),i<size-1?'battle':'reward');
    }
    run('state.cardRelics.forEach(r=>Object.assign(r,point(state.player)));collectCardRelics();updateRushSchedule(20)');
    assert.equal(run('state.rush.phase'), 'reward');assert.equal(run('state.bonusPicks'),size*4);
    run("state.orbs.forEach(o=>Object.assign(o,point(state.player)));update_experience(0);while(state.cardChoices){if(state.bonusPicks){state.cardChoices[0]={...CARD_TYPES.find(c=>c.id==='multi')};}else{state.cardChoices[0]={...CARD_TYPES.find(c=>c.id==='size')};}pickCard(state.cardChoices[0]);}updateRushSchedule(.01)");
    assert.equal(run('state.rush.timer'),5);assert.equal(run('state.player.shots'),1+4*run('state.rush.defeated'));
  }
  assert.equal(new Set(groups.slice(0,7)).size,7);
  run("rules.disabled=Object.keys(BOSS_NAMES);");assert.equal(run('beginRush(false)'),false);
});
test('El final jugable retrasa la recompensa y el planificador respeta inventario y cuenta inicial',()=>{
  const run=game();
  run("playMode='rush';rules.disabled=Object.keys(BOSS_NAMES).filter(k=>k!=='clock');beginRush(false);state.bossSpawnTimer=0;state.spawnTimer=0;update(1);state.inventoryOpen=true;update(6)");
  assert.ok(run('state.rush.timer===2&&!state.boss&&!state.enemies.length'));
  run('state.inventoryOpen=false;updateRushSchedule(2);killBoss();');
  assert.ok(run("state.boss.state==='final'&&!state.rush.defeated&&!state.cardRelics.length"));
  run('updateRushSchedule(10);for(let i=0;state.boss&&i<1200;i++)updateBoss(1/60,state.boss)');
  assert.ok(run('!state.boss&&state.rush.defeated===1&&state.cardRelics.length===4'));
});
test('Zoom táctil local conserva puntería, dirección del dash y simulación de cámara',()=>{
  const run=game();
  run('adjustLens(8);updateLens(1/60);');
  assert.ok(run('viewZoom()>1&&viewZoom()<1.6&&state.cam.zoom===1'));
  run("Object.assign(state.cam,{x:20,y:-55,zoom:.75});mouse.x=W/2+120*viewZoom();mouse.y=H/2+15*viewZoom();state.specialCards.dash.charges=1;tryDash()");
  assert.ok(run('Math.abs(getWorldMouse().x-140)<1e-8&&Math.abs(getWorldMouse().y+40)<1e-8&&Math.abs(state.player.dashAngle-Math.atan2(-40,140))<1e-8'));
  run("state.arena={chase:1};state.player.size=120;");assert.equal(run('viewZoom()'),.75);
  run('restart()');assert.equal(run('localLens.value+localLens.target'),2);
});
test('Bot evalúa un rayo anunciado, carga el láser y usa habilidades y cartas reales',()=>{
  const run=game();
  run("playMode='rush';rules.disabled=Object.keys(BOSS_NAMES).filter(k=>k!=='beacon');beginRush(true);updateRushSchedule(3);state.bossLasers.push({x:-500,y:0,angle:0,width:80,state:'warmup',warmup:.35,active:1});");
  assert.ok(run('Math.abs(rushBotControl().y)>.3'));
  run("state.cardChoices=[CARD_TYPES.find(c=>c.id==='greed'),SPECIAL_CARDS.find(c=>c.id==='kame')];state.bonusPicks=1;botPickUpgrade();state.rush.nextPlan=0;rushBotControl()");
  assert.ok(run("state.slots.includes('kame')&&state.player.beam.length&&state.specialCards.kame.charges===0&&!state.cardChoices&&!state.bonusPicks"));
  run("state.player.laserCount=1;let released=false;for(let i=0;i<240&&!released;i++){updateRushFrame(1/30);released=state.lasersFiring.length>0}");
  assert.ok(run("released&&Math.hypot(state.player.x,state.player.y)>10&&!mouse.down"));
});
test('La persecución mantiene los regalos, el bot busca la abertura y puede gastar Dash',()=>{
  const run=game();
  run("playMode='rush';rules.disabled=Object.keys(BOSS_NAMES).filter(k=>k!=='frontier');beginRush(true);updateRushSchedule(3);const frontier=state.boss;frontier.hp=frontier.maxHp*.49;for(let i=0;i<100;i++)updateBoss(1/60,frontier);chaseGift();");
  assert.ok(run("state.arena.chase&&state.specialCards.dash.totalCards===4"));
  run(`state.player.x=frontier.x+125;const gateX=state.player.x+180;
    for(const [y,ry] of [[-60,150],[310,100]]){
      panel(frontier,frontier.age,{x:gateX,y},{x:gateX-60,y},24,ry,.45,1.2,{jaw:true});
    }
    const door=botChaseGoal();rushBotControl()`);
  assert.ok(run('door.x>state.player.x&&door.y===150&&state.player.dashTimer>0&&state.specialCards.dash.charges===3'));
  run('killBoss(frontier,true)');assert.ok(run('!state.arena&&state.rush.defeated===1'));
});
test('Reintentar reinicia progreso, mazo, estado del bot y pantalla de derrota',()=>{
  const run=game();
  run("playMode='rush';beginRush(true);updateRushSchedule(3);applyCard(CARD_TYPES.find(c=>c.id==='multi'));damagePlayer(100);");
  assert.ok(run("state.over&&rushResults().at(-1)[1]==='Bot Play'"));
  run('beginRush(true)');assert.ok(run('!state.over&&state.rush.round===1&&state.rush.bot&&!state.boss&&state.player.shots===1&&!state.cardRelics.length&&!state.rush.intent'));
});
test('Las dieciséis fichas se presentan y ejecutan su primer patrón en Boss Rush',()=>{
  const run=game();
  const roster=JSON.parse(run('JSON.stringify(Object.keys(BOSS_NAMES))'));
  for(const id of roster){
    run("playMode='rush';rules.disabled=Object.keys(BOSS_NAMES).filter(k=>k!=="+JSON.stringify(id)+");beginRush(true);");
    run('for(let i=0;i<255&&!state.over;i++){updateRushFrame(1/30);if(i%60===0)render()}');
    assert.equal(run('state.rush.lastGroup?.[0]'),id);
    assert.ok(run('state.player.volley>0&&Number.isFinite(state.rush.intent.aim.x)'),id);
    assert.ok(run('state.enemies.every(e=>e.master)'),id);
  }
});
test('XP anticipada y reliquias usan presupuestos independientes, incluso en la muerte final',()=>{
  const run=game();
  run("playMode='rush';rules.disabled=Object.keys(BOSS_NAMES).filter(k=>k!=='clock');beginRush(false);updateRushSchedule(3);const b=state.boss;const budget=b.rushXp;b.hp=b.maxHp*.6;updateRushSchedule(.1);const earned=b.awardedXp;updateRushSchedule(.1);");
  assert.ok(run('b.awardedXp===earned&&earned>0&&state.cardRelics.length===0'));
  run('killBoss(b,true);killBoss(b,true)');
  assert.ok(run('state.cardRelics.length===4&&Math.abs(earned+state.orbs.reduce((a,o)=>a+o.value,0)-budget)<1e-6'));
});
test('Bot Play conserva el mismo combate a distintas frecuencias de pantalla',()=>{
  function observe(hz){
    const run=game();
    return run("playMode='rush';beginRush(true);for(let i=0;i<"+(hz*6)+";i++)advanceRush(1/"+hz+");JSON.stringify([state.player,state.rush.group,state.enemyBullets,state.boss.hp,state.halfHearts])");
  }
  assert.equal(observe(60),observe(90));assert.equal(observe(60),observe(120));
});
test('Un dardo normal golpea y elimina a un soldado invocado sin detener la simulación',()=>{
  const run=game();
  run("spawnEncounter(['sovereign']);openPortal(state.boss,{role:'soldier',origin:{x:0,y:120}},0);const soldier=state.enemies[0];soldier.hp=2;state.darts=[{type:'normal',...point(soldier),state:'hunt',target:soldier}];update_darts(0)");
  assert.equal(run('soldier.hp'),1);run('update_darts(0)');
  assert.ok(run('!state.enemies.includes(soldier)&&state.bossActive'));
});
test('Director ponderado recorre cada etapa exacta con uno, dos, tres y dieciséis tipos',()=>{
  const run=game();
  for(const n of [1,2,3,16]){
    const valid=run(`(()=>{
      playMode='rush';state=newState();rules.disabled=Object.keys(BOSS_NAMES).slice(${n});
      for(let size=1;size<=${n};size++){
        const seen=new Set();
        for(let i=0;i<chooseCount(${n},size);i++){
          const group=pickEncounter(),key=group.join();
          if(group.length!==size||new Set(group).size!==size||seen.has(key)||group.some(id=>rules.disabled.includes(id)))return false;
          seen.add(key);
        }
      }
      return pickEncounter().length===${n} && state.encounterTiers.length<=100;
    })()`);
    assert.equal(valid,true,'roster '+n);
  }
});
test('Las primeras selecciones individuales y de grupo son más accesibles entre 360 semillas',()=>{
  const run=game();
  const result=JSON.parse(run(`JSON.stringify((()=>{
    const first=[],last=[],overall=new Set();
    for(let seed=1;seed<=360;seed++){
      randomState=seed;state=newState();playMode='solo';
      rules.disabled=Object.keys(BOSS_NAMES).filter(k=>!['boss','monolith','fractal','beacon','prism','frontier'].includes(k));
      for(let stage=1;stage<=3;stage++){
        const n=chooseCount(6,stage);
        for(let i=0;i<n;i++){
          const group=pickEncounter(),d=groupRating(group);
          if(i===0){first[stage-1]=(first[stage-1]||0)+d;if(stage===2)overall.add(group.join());}
          if(i===n-1)last[stage-1]=(last[stage-1]||0)+d;
        }
      }
    }
    return [first,last,overall.size];
  })())`));
  for(let i=0;i<3;i++)assert.ok(result[0][i]/360+1<result[1][i]/360);
  assert.ok(result[2]>3);
  const draw="state=newState();randomState=253;Array.from({length:30},()=>pickEncounter().join('+')).join('|')";
  assert.equal(run(draw),run(draw));
});
test('Un encuentro comparte un perfil; proyectiles, recuperación y densidad escalan sin acortar avisos',()=>{
  const run=game();
  run("playMode='solo';const group=['prism','beacon'];const baseline=encounterDifficulty(group);state.completedEncounters=16;state.groupSize=2;spawnEncounter(group);const [a,b]=livingBosses()");
  assert.ok(run('a.difficulty===b.difficulty && a.difficulty.shot>baseline.shot && a.difficulty.hp<4 && a.difficulty.recovery<1'));
  run("makeScore(b);volley(b,0,b,20,100,0);const e=b.events[0];patternShot(b,b,0,100);state.extraBosses.push(createPatternBoss('clock',point(b),500));update_enemyProjectiles(.01)");
  assert.ok(run('e.count>20&&e.on===.18&&state.enemyBullets[0].vx===100*b.difficulty.shot'));
  run("state.groupSize=3;const trio=encounterDifficulty(['clock','prism','beacon']);state.completedEncounters=1e12;state.groupSize=12;const marathon=encounterDifficulty(group)");
  assert.ok(run('trio.shot>a.difficulty.shot&&Object.values(marathon).every(Number.isFinite)&&marathon.threat>10'));
});
test('La misma elección antigua no vuelve a aplicarse incluso si la oferta repite carta',()=>{
  const run=game();run("gameRandom=()=>0;state.bonusPicks=2;openCardSelection();const old=state.cardChoices[0];pickCard(old);pickCard(old)");
  assert.ok(run('state.bonusPicks===1&&state.upgrades===1&&state.cardChoices[0]!==old'));
  run('pickCard(state.cardChoices[0]);pickCard(old)');
  assert.ok(run('!state.cardChoices&&!state.bonusPicks&&!state.pendingLevelUps&&state.upgrades===2'));
});
test('El laboratorio mide impactos y críticos, admite lotes y mantiene sus herramientas locales',()=>{
  const run=game();run("playMode='sandbox';applyLoadout({multi:20,fire:15,size:10,bounce:30,critical:1,venom:2});const dummy=trainingDummy(200,true);gameRandom=()=>0;projectileImpact(dummy,{...point(dummy),damage:3,venom:2});update_contactDamage(.1)");
  assert.ok(run('state.player.shots===21&&state.player.bounces===30&&dummy.training.total===6&&dummy.training.hits===1&&dummy.training.critical>=1&&dummy.training.procs===1&&dummy.hp===200'));
  run("resetMeters();state.labDifficulty={stage:3,encounter:50,threat:12};spawnEncounter(['monolith','beacon']);clearSandboxCards()");
  assert.ok(run('livingBosses().every(b=>b.difficulty.threat===12&&b.difficulty.density>1)&&state.player.shots===1&&!state.upgrades&&dummy.training.total===0'));
  run("playMode='solo';applyLoadout({multi:10});trainingDummy(100,true)");
  assert.equal(run('state.player.shots===1&&state.enemies.length===0'),true);
});
test('Asedio espera la última baja e introduce élites y un encuentro real en la décima oleada',()=>{
  const run=game();run("playMode='siege';beginExtra('siege');const m=state.extra;updateExtra(1.1)");
  assert.ok(run('m.wave===1&&state.enemies.length===4'));
  run('updateExtra(8)');assert.equal(run('m.wave'),1);
  assert.ok(run(`(()=>{for(let w=1;w<=9;w++){
    while(m.remaining)updateExtra(.6);
    if(w===5&&!state.enemies.some(e=>['tackler','splitter','cannon'].includes(e.type)))return false;
    state.enemies=[];updateExtra(.1);if(m.cleared!==w)return false;updateExtra(3.01);
  }return m.wave===10&&state.bossActive;})()`));
  run('killBoss(state.boss,true);updateExtra(.1)');
  assert.ok(run('m.cleared===10&&m.bosses===1&&state.cardRelics.length===2'));
});
test('Contrarreloj pausa el reloj, invoca cuatro hitos y registra la puntuación al expirar',()=>{
  const run=game();run("playMode='trial';beginExtra('trial');const m=state.extra;state.inventoryOpen=true;update(5);state.inventoryOpen=false;state.cardChoices=[];update(5)");
  assert.equal(run('state.time'),0);run('state.cardChoices=null');
  for(const minute of [2,4,6,8]){
    run('state.time='+minute+'*60-.01;update(.02);killBoss(state.boss,true)');
    assert.equal(run('m.milestones'),minute/2);
  }
  run("state.time=599.99;state.score=67890;globalThis.localStorage=new Map();localStorage.getItem=localStorage.get.bind(localStorage);localStorage.setItem=localStorage.set.bind(localStorage);update(.02);extraResults(m)");
  assert.ok(run("state.time===600&&m.won&&state.over&&localStorage.get('cs.trial.best')==='67890'"));
  run("beginExtra('trial');damagePlayer(1000)");assert.ok(run('state.over&&!state.extra.won&&state.score===0'));
});
test('Caos alterna seis reglas, activa peligros reales y retira cada modificador sin deriva',()=>{
  const run=game();run("playMode='chaos';beginExtra('chaos');const m=state.extra;const observed=new Set();const base=state.player.fireCdBase;state.enemies=[createEnemy('tank',40,40)]");
  assert.ok(run(`(()=>{for(let i=0;i<6;i++){
    state.time=m.nextChange;updateExtra(.1);observed.add(m.modifier);
    if(m.modifier==='gravity'&&m.zones.length!==3)return false;
    if(m.modifier==='laser'&&!m.rays.length)return false;
    if(m.modifier==='rain'&&!state.enemyBullets.some(s=>s.chaos))return false;
    if(m.modifier==='energy'){shootDue(state.player,1,.01);if(state.player.fireCd>=base)return false;}
    state.time=m.until+.01;updateExtra(.01);
    if(m.modifier||m.rays.length||m.zones.length||state.enemyBullets.some(s=>s.chaos))return false;
  }return observed.size===6&&m.modifiers===6&&state.player.fireCdBase===base;})()`));
});
test('Las cartas conservan estadísticas y ciclos con 1, 10, 50, 100 y 1000 copias',()=>{
  const run=game();
  for(const n of [1,10,50,100,1000]){
    run(`playMode='sandbox';state=newState();applyLoadout(Object.fromEntries(['multi','back','fire','size','bounce','homing','persist','tide','dupli','explosive','chain','resonance','rayolaser','mini','giant','critical','vampirism','regen','armor','army','needles','reverse','timeBreak','anchor','plasma','frames','kame','dash','blink','thunderRain','gravity','crush'].map(id=>[id,${n}])));state.player.firingCycles=6;shoot(state.player.shots);`);
    assert.ok(run(`state.player.shots===${n+1}&&state.player.backShots===${n}&&state.bullets.every(s=>Number.isFinite(s.r+s.damage+s.life)&&s.bounces===${n})&&state.bullets.some(s=>s.style==='tide')`));
    assert.ok(run(`Math.abs(Math.log(state.player.size/30)-${n}*(Math.log(.94)+Math.log(1.08)))<1e-10&&Object.values(state.specialCards).every(s=>Number.isFinite(s.charges+s.cooldown))`));
  }
  run("state.bullets=[];state.player.firingCycles=0;shootDue(state.player,state.player.shots-1,1/60);fireLasers(.2);render()");
  assert.ok(run('state.bullets.length>0&&state.bullets.every(s=>Number.isFinite(s.damage))&&Number.isFinite(state.lasersFiring[0].damage)'));
});
test('Especiales concurrentes, duplicados cinéticos y proyectiles devueltos conservan su propietario y daño',()=>{
  const run=game();run("playMode='sandbox';applyLoadout({army:1,multi:2,rayolaser:1,anchor:1,reverse:1,frames:1,plasma:1,timeBreak:1,kinetic:10});const p=state.player;p.movingTime=2;activateExpansion('army');shoot(2);updateGeometryCards(p,.16);fireLasers(.4);");
  assert.ok(run("state.bullets.filter(s=>s.style==='army').length===4&&state.lasersFiring.filter(l=>l.origin).length===2"));
  run("const shot=state.bullets[0];shot.dupli=1;const before=shot.damage;reboundFromTarget(shot,{x:0,y:0},{x:0,y:0},10);const copy=state.bullets.at(-1)");
  assert.equal(run('copy.damage'),run('before'));
  run("activateExpansion('anchor');state.enemyBullets=[{x:1,y:1,r:11,damage:3,vx:50,vy:0},{x:240,y:0,r:6,vx:10,vy:0}];updateGeometryCards(p,.01);activateExpansion('reverse');activateExpansion('plasma');activateExpansion('timeBreak');state.slots[0]='frames';useSlot(0);update(.1)");
  assert.ok(run('p.frameTime>0&&p.plasma&&p.anchor.held.length===0&&state.stopUntil>state.time&&state.bullets.some(s=>s.inverted)'));
  run("state.stopUntil=0;state.enemyBullets=[{x:2,y:0,r:11,damage:3}];p.anchor.time=.05;updateGeometryCards(p,.1)");
  assert.ok(run("state.bullets.some(s=>s.style==='anchor'&&s.r===11&&s.damage===3)&&!p.anchor"));
});
test('Tres jefes acelerados comparten la arena con mil tiros y el bot predice sus velocidades físicas',()=>{
  const run=game();run("playMode='rush';beginRush(true);state.completedEncounters=70;state.groupSize=3;spawnEncounter(['clock','crown','beacon']);state.rush.phase='battle';const b=state.boss;for(let i=0;i<1000;i++)patternShot(b,b,i*TAU/1000,300);");
  assert.ok(run('Math.abs(Math.hypot(state.enemyBullets[0].vx,state.enemyBullets[0].vy)-300*b.difficulty.shot)<1e-8'));
  run('for(let i=0;i<12;i++){advanceRush(1/60);if(i%3===0)render()}');
  assert.ok(run('state.rush.intent && Number.isFinite(state.player.x+state.player.y)&&state.enemyBullets.every(s=>Number.isFinite(s.x+s.y))'));
});
test('El director mantiene la advertencia y el arco del barrido al acelerar también su colisión',()=>{
  const run=game();run("playMode='solo';state.completedEncounters=55;spawnEncounter(['beacon']);const b=state.boss;makeScore(b);ray(b,1,.8,2,b,0,25,{spin:1});const e=b.events[0];");
  assert.ok(run('e.on===1.8&&e.end-e.on<2&&Math.abs((e.end-e.on)*e.spin-2)<1e-8'));
  run('b.age=e.on+.16;const actual=scoreShapes(b).find(s=>s.kind==="line"&&s.live);');
  assert.ok(run('Math.abs(angleTo(actual,{x:actual.xx,y:actual.yy})-.16*e.spin)<1e-6'));
});
test('Cinética, Marea y Ejército cuentan ciclos lógicos de cadencia agrupada',()=>{
  const run=game();run("playMode='sandbox';applyLoadout({fire:100,army:1,multi:1,tide:1});const p=state.player;activateExpansion('army');const cycles=Math.floor(.02/p.fireCdBase);shootDue(p,2,.02)");
  assert.ok(run('p.firingCycles===cycles%7&&p.army.queue.reduce((s,q)=>s+q.cycles,0)===cycles'));
  assert.equal(run("Math.round(state.bullets.filter(s=>s.style==='tide').reduce((s,b)=>s+b.damage,0))"),run('5*Math.floor(cycles/7)'));
});
test('Los efectos especiales y sus temporizadores funcionan con acumulaciones grandes',()=>{
  const run=game();
  for(const n of [1,10,50,100,1000]){
    run(`playMode='sandbox';state=newState();applyLoadout(Object.fromEntries(['frames','anchor','reverse','timeBreak','crush','kame','plasma','activeHeal','dash','blink','thunderRain','chain','fury','giant','mini','size','needles'].map(id=>[id,${n}])));
      state.halfHearts=3;
      {
        const p=state.player;state.slots=['frames','thunderRain','dash','blink','timeBreak'];
        useSlot(0);useSlot(1);useSlot(2);globalThis.blinkBefore=state.specialCards.blink.charges;globalThis.blinked=tryBlink();useSlot(4);
        activateExpansion('crush');activateExpansion('anchor');activateExpansion('plasma');activateExpansion('kame');activateExpansion('needles');
        update(.05);render();
      }`);
    assert.ok(run(`state.player.frameTime<10+2*(${n}-1)&&state.player.plasma.end>state.time&&state.player.anchor.time>0&&state.player.crush.r>0&&
       state.thunderRain.active&&state.player.needles.n===6+2*${n}&&state.specialCards.dash.cooldown>0&&state.specialCards.blink.charges===blinkBefore-Number(blinked)&&(!blinked||state.specialCards.blink.cooldown>0)&&
       state.player.beam.every(b=>Number.isFinite(b.end))&&state.stopUntil>state.time&&Object.values(state.player).every(v=>typeof v!=='number'||Number.isFinite(v))`));
  }
});
test('Gigantismo y Miniatura por separado permiten dibujar, apuntar y simular mil copias',()=>{
  const run=game();
  for(const id of ['mini','giant']){
    run(`playMode='sandbox';state=newState();applyLoadout({${id}:1000,blink:1,dash:1});state.slots=['blink','dash'];spawnBoss({x:100,y:-120},'frontier');state.boss.phase=2;enterChase(state.boss);beginPattern(state.boss,'gates');
      chaseBeat(state.boss,'gates',0);useSlot(0);useSlot(1);update(1/60);render()`);
    assert.ok(run('Number.isFinite(state.player.x+state.player.y+state.player.size+viewZoom())&&state.player.size>0'));
    assert.ok(run('state.boss.events.filter(e=>e.kind==="panel").every(e=>e.rx>=0&&e.ry>=0)'));
  }
});
test('Al avanzar de ronda se conserva la poción sobrante y se cobra la XP antes de la cuenta atrás',()=>{
  const run=game();run("playMode='rush';rules.disabled=Object.keys(BOSS_NAMES).filter(k=>k!=='boss');beginRush(false);updateRushSchedule(3);killBoss();updateRushSchedule(.01);state.cardRelics=[];const potion=state.potions[0];updateRushSchedule(10)");
  assert.equal(run('state.rush.phase'),'reward');
  run('state.orbs.forEach(o=>Object.assign(o,point(state.player)));update_experience(0);while(state.cardChoices)pickCard(state.cardChoices[0]);updateRushSchedule(.01);updateRushSchedule(5)');
  assert.ok(run('state.rush.round===2&&state.rush.phase==="battle"&&state.potions.includes(potion)&&state.rush.defeated===1&&state.upgrades>0'));
});

test('Un disparo anticipado se detiene visualmente sin escribir vida y se reconcilia una vez',()=>{
 const run=game();run("state.selfId=3;const dummy=createEnemy('tank',50,0);state.enemies=[dummy];const hp=dummy.hp;const shot={x:0,y:0,r:4,volley:7,lane:0};predictContact(shot,100,0,10)");
 assert.ok(run('shot.occluded && dummy.hp===hp && impactLights.length===1'));
 run("const packet={bullets:[],impacts:[{seq:1,volley:7,lane:0,contact:1,shooterId:3,x:42,y:0}]};reconcileContacts(packet,100);reconcileContacts(packet,120)");
 assert.ok(run('impactLights.length===1 && impactLights[0].confirmed && !pendingContacts.size'));
 run("shot.volley=8;predictContact(shot,100,0,200);const real={...shot,shooterId:3,x:80};reconcileContacts({bullets:[real]},650)");
 assert.ok(run('real.blendFrom && !pendingContacts.size && dummy.hp===hp'));
});

test('Configuración de partida conserva semilla cero, amenaza y reloj proporcional',()=>{
 const run=game();run("rules={...rules,seed:0,intensity:3,duration:5};beginExtra('trial');state.time=61;updateTrial(state.extra)");
 assert.ok(run('state.bossActive && state.threat>=3 && state.extra.duration===300'));
 run('state.time=300;updateTrial(state.extra)');assert.ok(run('state.extra.won && state.over'));
});

test('Acto I: rebotes y recorrido real, fuego sostenido y resistencia en el Dash',()=>{
 const run=game();run("const p=state.player;Object.assign(p,{refract:2,compression:1,capacitor:3,dashPulse:2});const b={x:10,y:0,vx:150,vy:0,r:4,life:4,damage:10};advanceBullet(b,p,1);reflectBulletOffWall(b,{x:161,y:-10,w:5,h:20})");
 assert.ok(Math.abs(run('b.damage')-10*1.06*1.16)<1e-8);
 assert.equal(run('releaseWeaponControl(p,2,true);capacitorGain(p)'),1.15);assert.equal(run('releaseWeaponControl(p,.71,false);capacitorGain(p)'),1);
 assert.ok(run('state.enemyBullets=[{x:1,y:0,r:17}];pulseOnDash(p);state.enemyBullets[0].cancelHP<289 && state.enemyBullets[0].cancelHP>0'));
});
test('Compresión calcula el daño hasta el primer punto de contacto dentro del paso',()=>{
 const run=game();
 run("const p=state.player;p.compression=1;const e=createEnemy('tank',30,0);e.size=20;e.hp=100;state.enemies=[e];const b={x:0,y:0,r:4,damage:10,vx:300,vy:0,distance:120,life:3};state.bullets=[b];advanceBullet(b,p,.2);update_projectileHits(.2)");
 assert.equal(run('b.distance'),136);assert.equal(run('e.hp'),90);
});
test('Las cuatro especiales del acto consumen su carga y terminan, sin dejar redes ni arcos',()=>{
 const run=game();
 run("for(const [i,[id]] of ACT_SPECIALS.entries()){applyCard(SPECIAL_CARDS.find(c=>c.id===id));state.slots[i]=id;useSlot(i);useSlot(i);}");assert.equal(run('state.player.actCasts.length'),4);
 run("for(let i=0;i<360;i++){state.time+=1/60;updateActCards(state.player,1/60);if(i%25===0)render();}");
 assert.ok(run("state.player.actCasts.length===0 && state.bullets.some(b=>b.style==='omega') && state.bullets.filter(b=>b.style==='starTide').length===48"));
});
test('Diario UTC reproducible, duelo con final y persecución con puertas y cuatro Dash',()=>{
 const run=game();assert.ok(run("JSON.stringify(dailyChallenge(new Date('2026-03-09T23:00Z')))===JSON.stringify(dailyChallenge(new Date('2026-03-09T01:00Z')))"));
 run("playMode='duel';rules.boss='clock';beginExtra('duel');state.boss.hp=0;updateBoss(.01,state.boss);updateExtra(.01)");assert.ok(run('!state.over'));
 run("playMode='pursuit';beginExtra('pursuit');state.player.invuln=100;for(let i=0;i<650;i++){state.player.x+=2;update(1/60);if(i%60===0)render();if(state.cardChoices)pickCard(state.cardChoices[0]);}");
 assert.ok(run('state.extra.beat>=4 && state.extra.distance>=900 && state.specialCards.dash.totalCards>=4 && state.arena.x>0'));
});

test('Bot experto compara rutas con giro sin alterar las estadísticas del jugador',()=>{
 const run=game();run("playMode='rush';rules.botSkill='Experto';rules.botVision=true;beginRush(true);const health=state.halfHearts;spawnEncounter(['beacon','prism']);for(let i=0;i<45;i++)updateRushFrame(1/60)");
 assert.ok(run("state.rush.routes.length===4 && state.rush.intent.fire && state.player.speed===320 && state.halfHearts<=health"));
});

test('La colisión continua incluye el movimiento relativo y excluye saltos de teletransporte',()=>{
  const run=game();
  assert.equal(run("bulletEntry({prevX:0,prevY:0,x:30,y:0},{x:15,y:30},5)"),Infinity);
  assert.ok(run("sweptTargetEntry({prevX:0,prevY:0,x:30,y:0},{x:15,y:-30},{x:15,y:30},5)<1"));
  assert.equal(run("sweptTargetEntry({prevX:0,prevY:0,x:30,y:0},{x:15,y:-300},{x:15,y:300},5)"),Infinity);
  assert.equal(run("const body={x:0,y:0};rememberPosition(body,0);body.x=200;rememberPosition(body,.1);state.time=.2;combatPosition(body,.2).x"),200);
});
test('El historial de actos y las preferencias toleran el bloqueo del almacenamiento',()=>{
  const run=game();assert.ok(run('ACTS.length>=1 && ACTS.at(-1).version==="1.0.0"'));
  assert.equal(run("writeLocal('a',123);readLocal('a',5)"),5);
});

test('Diario conserva la secuencia en escritorio, móvil y diferentes tasas de refresco',()=>{
 const first=game(),second=game(),scenario="playMode='daily';beginExtra('daily');state.player.invuln=1000;";
 first(scenario+"W=1200;H=800;for(let i=0;i<360;i++)advanceDaily(1/60)");
 second(scenario+"W=390;H=844;for(let i=0;i<720;i++)advanceDaily(1/120)");
 const signature='JSON.stringify([state.time,randomState,state.enemies.map(q=>[q.type,q.x,q.y]),state.extra.day])';
 assert.equal(first(signature),second(signature));assert.equal(second('W'),390);assert.equal(second('H'),844);
});
test('Cartas del Acto I acumulables, retorno de un solo recorrido y saturación por jefe',()=>{
 const run=game();run("playMode='sandbox';const p=state.player;spawnEncounter(['twins']);const boss=state.boss;Object.assign(boss,{x:0,y:0});for(const e of boss.parts)Object.assign(e,{x:20,y:0});");
 for(const total of [1,10,50,100,1000]){
   run("for(const row of ACT_NORMALS){const c=CARD_TYPES.find(c=>c.id===row[0]);while((p[c.id]||0)<"+total+")applyCard(c);}p.nextScan=0;updateActCards(p,0);");
   assert.equal(run('p.nearby'),1);assert.ok(run('Number.isFinite(attackMultiplier())'));
 }
 run("const b={x:100,y:0,damage:3,r:4};");assert.equal(run('beginReturn(b,p)'),true);assert.equal(run('beginReturn(b,p)'),false);
 assert.ok(run('Number.isFinite(b.damage)&&b.damage>3'));
});

test('Confirmación WebSocket adelanta el daño autoritativo y una instantánea antigua no lo deshace',()=>{
 const run=game();run("state.selfId=4;const enemy=createEnemy('tank',50,0);enemy.netId=91;state.enemies=[enemy];const q={x:0,y:0,r:5,volley:3,lane:0,shooterId:4};state.bullets=[q];previewShots=[{...q}];const result={seq:1,time:1,shooterId:4,targetId:91,volley:3,lane:0,contact:1,hp:2,damage:5,x:40,y:0,ended:true};presentConfirmedContacts([result],15,state)");
 assert.ok(run('enemy.hp===2&&q.occluded&&previewShots[0].occluded&&confirmedDamage.length===1'));
 run("const old={time:.95,bullets:[{...q,occluded:false}],enemies:[{netId:91,hp:7}]};reconcileContacts(old,30);reconcileContacts({time:1,bullets:[],impacts:[result]},60)");
 assert.ok(run('old.enemies[0].hp===2&&old.bullets[0].occluded&&confirmedDamage.length===1&&!earlyContacts.size'));
});

test('Todos los recursos de código del menú solicitan la misma versión publicada',()=>{
 const html=fs.readFileSync('index.html','utf8'),version=require('../package.json').version;
 const files=Array.from(html.matchAll(/(?:src|href)="((?:src\/[^"]+\.js|menu\.css)[^"]*)"/g),match=>match[1]);
 assert.ok(files.length>1);
 for(const file of files)assert.ok(file.endsWith('?v='+version),file);
});
