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
