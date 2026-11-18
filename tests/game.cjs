const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
function game() {
 const ctx=new Proxy({}, {get:(_,k)=>k==='measureText'?()=>({width:30}):String(k).endsWith('Gradient')?()=>({addColorStop(){}}):()=>{}});
 const sandbox={console,URLSearchParams,location:{search:'?seed=42'},performance:{now:()=>0},setTimeout:()=>{},requestAnimationFrame:()=>{},window:{innerWidth:1200,innerHeight:800,addEventListener:()=>{}},document:{getElementById:()=>({getContext:()=>ctx,addEventListener:()=>{}})}};
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
  run("const a=createEnemy('tank',100,0),b=createEnemy('tank',135,0),c=createEnemy('tank',300,0);state.enemies=[a,b,c];state.player.explosive=10;state.player.frost=3;projectileImpact(a,{x:100,y:0,damage:1})");
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
 run('state.bossCycle=[];const order=Array.from({length:10},pickEncounter)');
 assert.ok(run('order.every((id,i)=>!i || id!==order[i-1])'));
 assert.equal(run("rules.disabled=['worm'];pickEncounter()"),'boss');
 assert.equal(run("rules.disabled=['worm','boss'];pickEncounter()"),null);
});
test('Una bala corta el gusano en dos y la victoria llega al eliminar la última bola',()=>{
 const run=game();run("spawnBoss({x:0,y:100},'worm');const worm=state.boss,body=worm.pieces[0].parts,s=body[7];spawnBullet(s.x,s.y,0,900,{damage:s.hp});update_projectileHits()");
 assert.equal(run('worm.pieces.length'),2);
 assert.ok(run('worm.pieces.every(p=>p.parts.length===7) && body[0].maxHp>body[1].maxHp && state.kills===0'));
 run("const [left,right]=worm.pieces;wormWindup(left,false);startWormLines(right);const angle=left.heading;state.player.x=500;updateBoss(.1);render()");
 assert.ok(run("left.heading===angle && left.mode==='windup' && right.mode==='exit'"));
 run('for(const s of bossTargets().slice(1)){s.hp=0;finishTarget(s);}');
 assert.ok(run('state.boss===worm && state.arena'));run('const lastSegment=bossTargets()[0];lastSegment.hp=0;finishTarget(lastSegment)');
 assert.ok(run('state.boss===null && state.kills===1 && state.arena===null'));
});
test('Tres carriles, diez a quince estampidas por trozo y descanso en fase dos',()=>{
 const run=game();run("spawnBoss({x:40,y:20},'worm');const worm=state.boss,piece=worm.pieces[0];startWormLines(piece);const lanes=new Set();for(let i=0;i<1500;i++){if(piece.mode==='pass')lanes.add(piece.lanes[piece.lane]);updateBoss(1/60);if(piece.mode==='curve')break;}");
 assert.equal(run('lanes.size'),3);
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
