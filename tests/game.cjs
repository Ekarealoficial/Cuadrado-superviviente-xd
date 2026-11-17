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
test('one reward per gained level',()=>{const run=game();assert.equal(run('gainXp(100); state.pendingLevelUps'),run('state.level-1'));});
test('boss keeps phase two balls on a large hit',()=>{const run=game();assert.equal(run('spawnBoss();state.boss.hp=300;updateBoss(1/60);state.boss.balls.length'),4);assert.equal(run('state.boss.phase'),3);});
test('later bosses scale with difficulty and encounters',()=>{const run=game();assert.equal(run('spawnBoss();killBoss();state.enemyHpMult=2;spawnBoss();state.boss.maxHp'),3000);});
test('simulation and renderer smoke test',()=>{const run=game();run('for(let i=0;i<600;i++){update(1/60);render();}');});
test('seed produces identical simulation',()=>{const a=game(),b=game();const code='for(let i=0;i<600;i++)update(1/60);JSON.stringify(state.enemies.map(e=>[e.type,e.x,e.y]))';assert.equal(a(code),b(code));});
test('spatial query includes negative coordinates',()=>{const run=game();assert.equal(run('enemyGrid.rebuild([{x:-1,y:-1}]);enemyGrid.query(0,0,10).length'),1);});
test('every card can be applied',()=>{const run=game();run('for(const card of [...CARD_TYPES,...SPECIAL_CARDS])applyCard(card);for(let i=0;i<120;i++){update(1/60);render();}');});
test('blink validates full body and final arena position',()=>{const run=game();assert.equal(run('getChunk=()=>({walls:[{x:85,y:-100,w:100,h:200}]});state.specialCards.blink.charges=1;mouse.x=W/2+80;mouse.y=H/2;tryBlink();aabbOverlapBox(state.player.x,state.player.y,30,{x:85,y:-100,w:100,h:200})'),false);});
test('normal dart applies half damage to a detached ball',()=>{const run=game();assert.equal(run('spawnBoss();const ball=state.boss.balls[0];ball.state="flying";ball.x=100;ball.y=100;state.darts=[{type:"normal",x:100,y:100,state:"hunt",target:ball}];update_darts(0);state.boss.hp'),1199.5);});
