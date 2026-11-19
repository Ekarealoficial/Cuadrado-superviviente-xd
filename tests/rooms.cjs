const {test}=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../room-engine.cjs');
const disabled='normal fast tank shooter invoker teleporter kamikaze dardante juggernaut boss singular fractal clock crown'.split(' ');
for(const pvp of [false,true])test('Combate compartido con PvP '+pvp,()=>{
  const game=engine({difficulty:1,xp:1,pvp,disabled});
  game.add('a',{name:'Azul',color:'#3399ff'});
  game.add('b',{name:'Rojo',color:'#ee3333'});
  game.input('b',{d:true},[]);
  for(let i=0;i<15;i++)game.tick(1/30);
  game.input('b',{},[]);
  game.input('a',{dx:500,dy:0,fire:true},[]);
  for(let i=0;i<100;i++)game.tick(1/30);
  const a=game.snapshot('a'),b=game.snapshot('b');
  assert.equal(a.time,b.time);
  assert.equal(a.peers[0].x,b.player.x);
  assert.equal(a.peers[0].name,'Rojo');
  assert.equal(b.halfHearts<8,pvp);
  assert.equal(b.enemies.length,0);
});
test('En una sala los menús dejan avanzar enemigos, balas y daño',()=>{
  const room=engine({difficulty:1,xp:1,disabled,pvp:false});
  room.add('a',{name:'A',color:'#ffffff'});
  room.add('b',{name:'B',color:'#ff0000'});
  room.input('a',{fire:true,angle:.4},[]);
  room.tick(1/30);
  const a=room.snapshot('a'),b=room.snapshot('b');
  b.player.backShots=2;
  b.shields.push({x:0,y:0,hp:4,maxHp:4});
  a.enemies.push({x:0,y:0,type:'normal',size:30,speed:50,hp:100,maxHp:100,wob:0,color:'#fff'});
  const shot=a.bullets[0],x=shot.x;
  room.input('a',{},[{kind:'inventory'}]);
  room.input('b',{},[{kind:'inventory'}]);
  room.tick(1/30);
  assert.ok(room.snapshot('a').inventoryOpen && room.snapshot('a').time>a.time && shot.x>x);
  assert.ok(room.snapshot('a').halfHearts<a.halfHearts);
  const peer=room.snapshot('a').peers[0];
  assert.equal(peer.backShots,2);
  assert.equal(peer.shields.length,1);
  assert.ok(Number.isFinite(peer.angle));
  room.input('a',{},[{kind:'inventory'}]);
  a.orbs.push({x:0,y:0,value:100,life:10,pulse:0,r:6,vx:0,vy:0});
  room.tick(1/30);
  const cards=room.snapshot('a');
  assert.ok(cards.cardChoices);
  room.tick(1/30);
  assert.ok(room.snapshot('a').time>cards.time && shot.x>x);
});
test('Tras un atasco de red, los jugadores ven la dirección reciente sin reproducir segundos de entradas',()=>{
  const r=engine({difficulty:1,xp:1,disabled,pvp:false});
  r.add('a',{name:'A'});r.add('b',{name:'B'});
  r.input('a',{frames:[]},[]);
  for(let i=0;i<8;i++)r.tick(1/30);
  const frames=Array.from({length:120},(_,i)=>[i+1,1/60,i<105?-1:1,0,0,false]);
  for(let i=0;i<120;i+=40)r.input('a',{frames:frames.slice(i,i+40)},[]);
  r.tick(1/30);
  const local=r.snapshot('a'),remote=r.snapshot('b');
  assert.equal(local.ack,120);
  assert.ok(local.player.x>0);
  assert.equal(remote.peers[0].x,local.player.x);
});
test('Tiempo roto y hechizos se comparten entre los miembros de la sala',()=>{
 const r=engine({difficulty:1,xp:1,disabled,pvp:false});
 r.add('a',{name:'A'});r.add('b',{name:'B'});
 const a=r.snapshot('a');a.slots[0]='timeBreak';a.specialCards.timeBreak.totalCards=1;a.specialCards.timeBreak.charges=1;
 a.enemyBullets.push({x:90,y:100,vx:120,vy:0,life:3,r:6});
 r.input('a',{},[{kind:'slot',i:0}]);r.tick(1/30);
 const other=r.snapshot('b');assert.ok(other.stopUntil>other.time);assert.equal(other.enemyBullets[0].x,90);
 assert.equal(other.peers[0].cast.id,'timeBreak');
 for(let i=0;i<92;i++)r.tick(1/30);
 assert.ok(r.snapshot('b').enemyBullets[0].x>90);
});
test('La sala comparte aviso, segmentos y fase del Gusano Esmeralda',()=>{
 const r=engine({difficulty:3,xp:1,disabled,pvp:false});
 for(const id of ['a','b'])r.add(id,{name:id,color:'#abe'});
 for(let i=0;i<905;i++)r.tick(1/30);
 const omen=r.snapshot('a').bossOmen;
 assert.equal(omen.kind,'worm');assert.deepEqual(r.snapshot('b').bossOmen,omen);
 for(let i=0;i<600;i++)r.tick(1/30);
 const boss=r.snapshot('a').boss;assert.equal(boss.kind,'worm');
 assert.ok(150/3-omen.start>19.95 && 150/3-omen.start<=20.01);
 const segment=boss.pieces[0].parts[6];
 segment.hp=0;segment.venomTime=1;segment.venomDps=1;
 r.tick(1/30);
 for(const p of boss.pieces)for(const s of p.parts)s.hp=s.maxHp*.2;
 r.tick(1/30);
 const observed=r.snapshot('b').boss;
 assert.equal(observed.phase,2);assert.equal(observed.pieces.length,2);
 assert.ok(observed.pieces.every(p=>p.mode==='windup' && p.dashes>=10 && p.dashes<=15));
});
test('Dos jugadores ven las singularidades del aviso y las reliquias tienen un solo propietario',()=>{
 const r=engine({difficulty:3,xp:1,disabled:[...disabled.filter(k=>k!=='singular'),'worm'],pvp:false});
 for(const id of ['a','b'])r.add(id,{name:id,color:'#fff'});
 for(let i=0;i<905;i++)r.tick(1/30);
 const a=r.snapshot('a'),b=r.snapshot('b');
 assert.equal(a.bossOmen.kind,'singular');assert.equal(a.cosmicZones.length,2);assert.deepEqual(a.cosmicZones,b.cosmicZones);
 a.cardRelics.push({x:a.player.x,y:a.player.y});r.tick(1/30);
 const rewards=['a','b'].map(id=>r.snapshot(id).bonusPicks).sort();
 assert.deepEqual(rewards,[0,1]);assert.equal(r.snapshot('b').cardRelics.length,0);
});
test('Los dos integrantes de una dupla dañan a los dos jugadores y mueren de forma independiente',()=>{
 const r=engine({difficulty:3,xp:1,disabled:[...disabled.filter(id=>id!=='fractal' && id!=='clock'),'worm'],pvp:false});
 for(const id of ['a','b']){r.add(id,{name:id});r.snapshot(id).player.invuln=10000;}
 function until(condition,limit=2300){for(let i=0;i<limit;i++){if(condition(r.snapshot('a')))return;r.tick(1/30);}assert.fail('El encuentro no avanzó');}
 function finish(b){b.hp=.01;b.venomTime=.5;b.venomDps=10;}
 for(let i=0;i<2;i++){until(s=>s.boss);finish(r.snapshot('a').boss);until(s=>!s.boss);}
 until(s=>s.extraBosses.length===1);
 const s=r.snapshot('a'),group=[s.boss,...s.extraBosses];
 assert.equal(s.bossEncounters,3);assert.equal(s.groupSize,2);assert.equal(group[0].maxHp,group[1].maxHp);
 for(const b of group){
   const other=group.find(o=>o!==b);other.state='recover';other.timer=5;
   Object.assign(b,{state:b.kind==='fractal'?'cuts':'hands',age:1,timer:2,beat:1,angle:0,vertical:true,offset:100});
   const x=b.kind==='fractal'?s.arena.x+100:b.x+100*Math.cos(.18),y=b.kind==='fractal'?s.arena.y+140:b.y+100*Math.sin(.18);
   const hp=['a','b'].map(id=>r.snapshot(id).halfHearts);
   for(const id of ['a','b'])Object.assign(r.snapshot(id).player,{x,y,invuln:0});
   r.tick(1/30);
   for(const [i,id] of ['a','b'].entries())assert.equal(r.snapshot(id).halfHearts,hp[i]-2);
 }
 finish(group[0]);until(s=>s.extraBosses.length===0);assert.ok(r.snapshot('b').arena);
 finish(group[1]);until(s=>!s.boss);assert.equal(r.snapshot('b').arena,null);
});
test('El ancla de un jugador suspende las balas compartidas y devuelve proyectiles visibles a ambos',()=>{
 const r=engine({difficulty:1,xp:1,disabled,pvp:false});
 for(const id of ['a','b'])r.add(id,{name:id});
 const a=r.snapshot('a');a.slots[0]='anchor';Object.assign(a.specialCards.anchor,{totalCards:1,charges:1,maxCharges:1});
 a.enemyBullets.push({x:40,y:0,vx:-30,vy:0,r:6,life:.1});
 r.input('a',{},[{kind:'slot',i:0}]);r.tick(1/30);
 assert.equal(r.snapshot('b').peers[0].anchor.held.length,1);assert.equal(r.snapshot('b').enemyBullets.length,0);
 for(let i=0;i<121;i++)r.tick(1/30);
 assert.ok(r.snapshot('b').bullets.some(s=>s.style==='anchor'&&s.vx>0));assert.equal(r.snapshot('a').player.anchor,null);
});
