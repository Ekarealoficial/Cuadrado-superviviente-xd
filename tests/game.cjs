const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
function game() {
 const ctx=new Proxy({}, {get:(_,k)=>k==='measureText'?()=>({width:30}):()=>{}});
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
