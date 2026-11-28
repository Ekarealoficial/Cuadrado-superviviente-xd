const {test}=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../room-engine.cjs');
const disabled='normal fast tank shooter invoker teleporter kamikaze dardante juggernaut boss singular fractal clock crown beacon twins heart monolith dawn prism sovereign channel general frontier'.split(' ');
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
 for(const id of ['a','b'])r.snapshot(id).player.invuln=10000;
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
test('Paquetes repetidos o antiguos no repiten acciones ni encolan movimiento',()=>{
 const r=engine({difficulty:1,xp:1,pvp:false,disabled});r.add('a',{name:'A'});
 const action=[{kind:'inventory'}];r.input('a',{stamp:20},action);r.input('a',{stamp:20},action);
 r.input('a',{stamp:19,frames:[[9,.02,1,0,0,false]]},action);r.tick(.033);
 const a=r.snapshot('a');assert.ok(a.inventoryOpen);assert.equal(a.ack,0);
});
test('La furia ofensiva y la armadura defensiva pertenecen a distintos jugadores',()=>{
 const r=engine({difficulty:1,xp:1,pvp:true,disabled});r.add('a',{});r.add('b',{});
 const a=r.snapshot('a'),b=r.snapshot('b');Object.assign(a.player,{x:-55,y:0,armor:50});
 Object.assign(b.player,{x:35,y:0,fury:40});
 r.input('a',{angle:0,fire:true},[]);for(let i=0;i<6;i++)r.tick(1/30);
 assert.equal(r.snapshot('b').halfHearts,7);
 b.player.invuln=0;b.player.armor=20;
 for(let i=0;i<24;i++)r.tick(1/30);
 assert.equal(r.snapshot('b').halfHearts,7);assert.ok(b.player.pulses.some(e=>e.kind==='armor'));
});
test('Dos clientes reciben la misma resistencia y desaparición de una bala grande',()=>{
 const r=engine({difficulty:1,xp:1,pvp:false,disabled});r.add('a',{});r.add('b',{});
 const s=r.snapshot('a');s.player.sizeLevel=2;
 s.enemyBullets.push({x:65,y:0,r:11,vx:0,vy:0,life:10,damage:3});
 r.input('a',{angle:0,fire:true},[]);r.tick(1/30);
 const seen=id=>JSON.parse(JSON.stringify(r.snapshot(id).enemyBullets));
 assert.deepEqual(seen('a'),seen('b'));assert.ok(seen('a')[0].cancelHP<121);
 for(let i=0;i<120;i++)r.tick(1/30);
 assert.deepEqual(seen('a'),[]);assert.deepEqual(seen('b'),[]);
});
test('Una salva compacta conserva IDs, cancelación y trayectorias para dos clientes',()=>{
  const {packHostileShots,unpackHostileShots}=require('../src/shot-wire.js');
  const room=engine({difficulty:1,xp:1,pvp:false,disabled});
  for(const id of ['a','b'])room.add(id,{});
  const pool=room.snapshot('a').enemyBullets;
  for(let i=0;i<500;i++)pool.push({x:i,y:300,r:i%2?6:11,vx:i,vy:-6,life:7,damage:1,...(i%3?{}:{square:true,cancelHP:33,curve:.12})});
  room.tick(1/30);
  for(const id of ['a','b']){
    const raw=room.snapshot(id).enemyBullets;
    const expected=JSON.parse(JSON.stringify(raw,(k,v)=>['prevX','prevY'].includes(k)?undefined:v));
    const packet=JSON.stringify(packHostileShots(raw));
    assert.deepEqual(unpackHostileShots(JSON.parse(packet)),expected);
    assert.ok(packet.length<JSON.stringify(expected).length*.8);
  }
});
test('Segundos perdidos alterna objetivos separados en la simulación de sala',()=>{
  const room=engine({difficulty:3,xp:1,pvp:false,disabled:[...disabled.filter(t=>t!=='clock'),'worm']});
  for(const id of ['a','b']){room.add(id,{});room.snapshot(id).player.invuln=10000;}
  let boss;
  for(let i=0;i<2400&&!boss;i++){room.tick(1/30);boss=room.snapshot('a').boss;}
  assert.equal(boss.kind,'clock');
  const xs=[-200,210];
  for(const [i,id] of ['a','b'].entries())Object.assign(room.snapshot(id).player,{x:xs[i],y:20});
  boss.state='recover';boss.timer=.01;boss.deck=['seconds'];
  for(let i=0;i<75;i++)room.tick(1/30);
  const warnings=id=>room.snapshot(id).boss.events.filter(e=>e.kind==='dial').map(e=>e.origin.x);
  assert.deepEqual(warnings('a'),warnings('b'));
  for(const x of xs)assert.ok(warnings('a').some(v=>Math.abs(v-x)<1));
});

test('La persecución comparte terreno y daño, concede cuatro Dash por participante',()=>{
  const r=engine({difficulty:3,xp:1,pvp:false,disabled:[...disabled.filter(k=>k!=='frontier'),'worm']});
  for(const id of ['a','b']){r.add(id,{});r.snapshot(id).player.invuln=10000;}
  let boss;
  for(let i=0;i<2300&&!boss;i++){r.tick(1/30);boss=r.snapshot('a').boss;}
  assert.equal(boss.kind,'frontier');
  const before=r.snapshot('a').arena.w,sc=r.snapshot('b').specialCards.dash;
  Object.assign(sc,{totalCards:3,maxCharges:3,charges:1,cooldown:100});boss.hp=boss.maxHp*.5;
  r.tick(1/30);assert.equal(boss.state,'transition');assert.equal(r.snapshot('a').arena.chase,undefined);
  for(let i=0;i<120;i++)r.tick(1/30);
  for(const id of ['a','b']){
    assert.equal(r.snapshot(id).arena.chase,boss.id);assert.ok(r.snapshot(id).arena.w>before);
    assert.equal(r.snapshot(id).specialCards.dash.totalCards,id==='a'?4:7);
  }
  assert.equal(sc.charges,5);
  const start=r.snapshot('a').arena.x;
  for(let i=0;i<700;i++)r.tick(1/30);
  assert.ok(r.snapshot('a').arena.x>start+2000);
  assert.equal(r.snapshot('b').arena.x,r.snapshot('a').arena.x);
  assert.equal(r.snapshot('a').specialCards.dash.totalCards,4);
  // The trailing player meets the actual moving wall on the server.
  const a=r.snapshot('a');a.player.x=boss.x;a.player.invuln=0;const hp=a.halfHearts;
  r.tick(1/30);assert.ok(r.snapshot('a').halfHearts<hp);
});

for(const count of [2,4,8,12])test('Impactos autoritativos con '+count+' participantes, latencia y reintentos',()=>{
  for(const rtt of [30,60,120,200,350]){
    const room=engine({xp:1,difficulty:1,disabled,pvp:false});
    const ids=Array.from({length:count},(_,i)=>'jugador'+i);
    for(const id of ids)room.add(id,{name:id});
    const enemy={x:130,y:0,type:'normal',size:20,speed:0,hp:1000,maxHp:1000,wob:0,color:'#faf'};
    room.snapshot(ids[0]).enemies.push(enemy);
    const acked=new Set(),events=new Map();
    const frames=[[1,1/30,0,0,0,true,0]];
    for(let tick=0;tick<30;tick++){
      for(const [i,id] of ids.entries()){
        // Stagger input delivery and retransmit one lost packet per four senders.
        const delay=Math.ceil((rtt/2+(i%3)*12)/33)+(i%4===0?2:0);
        if(tick===delay||tick===delay+2)room.input(id,{stamp:tick,frames},[]);
      }
      room.tick(1/30);
      for(const h of room.snapshot(ids[0]).impacts)events.set(h.seq,h);
      for(const id of ids)if(room.snapshot(id).ack===1)acked.add(id);
    }
    assert.equal(acked.size,count);
    assert.equal(events.size,count);assert.equal(enemy.hp,1000-count);
    assert.equal(new Set([...events.values()].map(h=>h.shooterId)).size,count);
    for(const id of ids)assert.deepEqual(room.snapshot(id).impacts,room.snapshot(ids[0]).impacts);
  }
});
test('Una acción reenviada después de reconectar se confirma una sola vez',()=>{
  const r=engine({xp:1,difficulty:1,disabled});r.add('a',{});
  for(let i=0;i<8;i++){r.input('a',{stamp:i},[{id:1,kind:'inventory'}]);r.tick(1/30);}
  assert.equal(r.snapshot('a').inventoryOpen,true);assert.equal(r.snapshot('a').actionAck,1);
});

test('Arsenal y especiales mantienen su dueño al disparar simultáneamente en sala',()=>{
 const room=engine({xp:1,difficulty:1,disabled,seed:42});
 for(const id of ['a','b','c','d'])room.add(id,{name:id});
 const clients=['a','b','c','d'].map(id=>room.snapshot(id));
 const target={x:230,y:0,type:'tank',size:50,speed:0,hp:10000,maxHp:10000,wob:0,color:'#abc'};
 clients[0].enemies.push(target);
 Object.assign(clients[0].player,{shots:4,fireCdBase:.06,homingChance:1});
 Object.assign(clients[1].player,{shots:2,laserCount:1});
 clients[2].drones.push({lines:3,x:0,y:0,angle:0,cd:0,bob:0});
 Object.assign(clients[3].specialCards.omega,{totalCards:3,maxCharges:1,charges:1});clients[3].slots[0]='omega';
 room.input('a',{angle:0,fire:true},[]);room.input('b',{angle:0,fire:true},[]);
 room.input('d',{angle:0},[{kind:'slot',i:0,id:1}]);
 const shooters=new Set(),shots=new Set();let laser=false,netIds=true;
 for(let t=0;t<120;t++){
   if(t===20)room.input('b',{angle:0,fire:false},[]);
   room.tick(1/30);const s=room.snapshot('c');
   assert.equal(s.enemies[0].hp,room.snapshot('a').enemies[0].hp);
   for(const hit of s.impacts)shooters.add(hit.shooterId);
   netIds&&=new Set(s.bullets.map(x=>x.netId)).size===s.bullets.length;
   for(const q of s.bullets)shots.add(q.style|| (q.drone?'drone':q.homing?'homing':'normal'));
   laser||=s.peers.some(m=>m.name==='b'&&m.lasersFiring.length);
 }
 assert.ok(netIds&&laser&&target.hp<10000);
 assert.ok(shots.has('omega')&&shots.has('drone')&&shots.has('homing'));
 assert.equal(shooters.size,4);assert.equal(room.snapshot('d').specialCards.omega.charges,0);
});
test('Elegir dos veces la misma oferta no cobra la siguiente recompensa',()=>{
 const r=engine({xp:1,difficulty:1,disabled});r.add('a',{});
 r.snapshot('a').orbs.push({x:0,y:0,value:100,life:9,r:8,vx:0,vy:0,pulse:0});r.tick(1/30);
 const s=r.snapshot('a'),first={id:1,kind:'pick',offer:s.offerId,i:0};
 assert.ok(s.cardChoices);r.input('a',{stamp:1},[first]);r.tick(1/30);
 r.input('a',{stamp:2},[first,{...first,id:2}]);r.tick(1/30);
 assert.equal(r.snapshot('a').actionAck,2);assert.equal(r.snapshot('a').upgrades,1);
 assert.equal(r.snapshot('a').pendingLevelUps,s.pendingLevelUps-1);
});
