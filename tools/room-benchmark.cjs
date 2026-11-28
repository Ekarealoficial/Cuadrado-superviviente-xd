// Reproducible local measurement of simulation cost. No network traffic.
const engine=require('../room-engine.cjs');
const {packHostileShots}=require('../src/shot-wire.js');
const {gzipSync}=require('node:zlib');
const {performance}=require('node:perf_hooks');
const disabled='normal fast tank shooter invoker teleporter kamikaze dardante juggernaut tackler splitter cannon frostMage pulseRing erratic twinCannon rebound'.split(' ');
for(const clients of [2,4,8,12]){
  const room=engine({difficulty:1,xp:1,pvp:false,disabled,seed:42});
  for(let i=0;i<clients;i++){
    const id=String(i);room.add(id,{name:id});const s=room.snapshot(id);
    Object.assign(s.player,{invuln:10,shots:3,homingChance:.25,fireCdBase:.12});
    room.input(id,{fire:true,angle:0},[]);
  }
  const s=room.snapshot('0');
  for(let i=0;i<24;i++)s.enemies.push({type:'tank',size:36,speed:40,hp:700,maxHp:700,wob:0,x:400+i%6*50,y:100+(i%4)*60,color:'#fff'});
  for(let i=0;i<600;i++)s.enemyBullets.push({x:i%40*12-230,y:230+Math.floor(i/40)*6,r:5,vx:15,vy:5,life:18,damage:1});
  const samples=[];
  for(let i=0;i<90;i++){const start=performance.now();room.tick(1/30);samples.push(performance.now()-start);}
  samples.sort((a,b)=>a-b);const snap=room.snapshot('0');snap.shotTable=packHostileShots(snap.enemyBullets);delete snap.enemyBullets;
  const packet=Buffer.from(JSON.stringify(snap,(k,v)=>['owner','target','prevX','prevY','tracks'].includes(k)?undefined:v));
  console.log(JSON.stringify({clients,tickMedianMs:+samples[45].toFixed(2),tickP95Ms:+samples[85].toFixed(2),snapshotBytes:packet.length,gzipBytes:gzipSync(packet).length,processRssMiB:Math.round(process.memoryUsage().rss/1048576)}));
}
