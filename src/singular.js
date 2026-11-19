'use strict';
const SOLAR_RADIUS=Math.sqrt(8*Math.PI*45**2/(3*Math.sqrt(3)));
const ORBITS=[174,230,286,342],PLANET_TINTS=['#ed985d','#77def8','#bda0ff','#a3d792'];
const MASS_WAVES=10,MASS_PER_WAVE=22,MASS_INTERVAL=.74;
const cosmicHits=new WeakMap(),finalCredit=new WeakMap();
function createSingular(pos,hp){
  return {kind:'singular',id:state.bossEncounters,...pos,size:160,hp,maxHp:hp,color:'#ffcb62',
    phase:1,balls:[],planets:[],absorbed:[],trail:[],orbitTime:0,state:'drift',timer:1.7,ambient:2.4,deck:[]};
}
function cosmicShot(x,y,angle,speed,tier,extra={}){
  state.enemyBullets.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
    life:6,r:[6,11,17][tier-1],damage:tier,tint:['#fff1ac','#ffb648','#ff7545'][tier-1],...extra});
}
function randomTier(){return 1+Math.floor(gameRandom()*3);}
function aimAtPlayer(x,y){return Math.atan2(state.player.y-y,state.player.x-x);}
function arenaSpot(padding){
  const a=state.arena;
  return {x:gameRand(a.x+padding,a.x+a.w-padding),y:gameRand(a.y+padding,a.y+a.h-padding)};
}
function addPlanets(b){
  if(b.planets.length)return;
  b.planets=ORBITS.map((distance,i)=>({distance,angle:i*TAU/4,x:b.x+Math.cos(i*TAU/4)*distance,
    y:b.y+Math.sin(i*TAU/4)*distance,r:12+2*i,tint:PLANET_TINTS[i],moons:[]}));
}
function incomingMass(b){
  bossCue('massPull',b);b.state='attract';b.absorbed=[];
  b.massWaves=MASS_WAVES-1;b.timer=MASS_INTERVAL;emitMassWave(b);
}
function emitMassWave(b){
  const a=state.arena;
  for(let i=0;i<MASS_PER_WAVE;i++){
    const vertical=gameRandom()<.5,side=gameRandom()<.5?-38:38;
    const x=vertical?a.x+(side>0?a.w:0)+side:gameRand(a.x,a.x+a.w);
    const y=vertical?gameRand(a.y,a.y+a.h):a.y+(side>0?a.h:0)+side;
    const speed=Math.hypot(x-b.x,y-b.y)/gameRand(1.6,3.4);
    cosmicShot(x,y,Math.atan2(b.y-y,b.x-x),speed,randomTier(),{source:b.id,inward:b.id,life:5});
  }
}
function advanceInward(shot,dt){
  const boss=state.boss?.id===shot.inward?state.boss:state.extraBosses.find(b=>b.id===shot.inward);
  if(boss?.state!=='attract'){delete shot.inward;return false;}
  const dx=boss.x-shot.x,dy=boss.y-shot.y,dist=Math.hypot(dx,dy),speed=Math.hypot(shot.vx,shot.vy);
  if(dist<boss.size/2+speed*dt){boss.absorbed.push(shot.damage);return true;}
  shot.vx=dx/dist*speed;shot.vy=dy/dist*speed;return false;
}
function solarVolley(source){
  const p=source?bossPrey({id:source}):state.player;bossCue('solarCharge',p);
  for(let i=0;i<3;i++){
    const a=i*TAU/3+gameRand(-.6,.6),r=i?gameRand(115,200):0;
    state.cosmicZones.push({type:'solar',source,x:p.x+r*Math.cos(a),y:p.y+r*Math.sin(a),
      angle:gameRand(0,TAU),age:0,windup:.68,duration:.98});
  }
}
function summonWells(n,source){
  const p=source?bossPrey({id:source}):state.player,start=gameRand(0,TAU);bossCue('voidWell',p);
  for(let i=0;i<n;i++){
    const a=start+i*TAU/n,r=gameRand(70,145);
    state.cosmicZones.push({type:'well',source,off:3.15,x:p.x+r*Math.cos(a),y:p.y+r*Math.sin(a),r:158,age:0,windup:.52,duration:3.8});
  }
}
function blinkBeam(b){
  b.state='compress';b.timer=.15;bossCue('voidBlink',b);
}
function openBeam(b){
  Object.assign(b,arenaSpot(230));bossCue('beamCharge',b);
  const target=bossPrey(b),a=Math.atan2(target.y-b.y,target.x-b.x),dx=Math.cos(a),dy=Math.sin(a),length=Math.hypot(state.arena.w,state.arena.h);
  const points=[{x:b.x,y:b.y}];
  const targetDistance=Math.hypot(b.x-target.x,b.y-target.y);
  for(let d=120;d<length+160;d+=150){
    const bend=gameRand(-80,80)*clamp(Math.abs(targetDistance-d)/220,0,1);points.push({x:b.x+d*dx-bend*dy,y:b.y+d*dy+bend*dx});
  }
  state.cosmicZones.push({type:'beam',source:b.id,points,width:100,age:0,windup:.48,off:.86,duration:1.08});
  b.state='blink';b.timer=1.12;b.remaining--;
}
function startSingularAttack(b,attack){
  if(attack==='attract'){incomingMass(b);return;}
  if(attack==='blink' && !canCoverArena(b)){b.state='drift';b.timer=.32;b.deck.push('blink');return;}
  if(attack==='blink'){b.remaining=4+Math.floor(gameRandom()*3);blinkBeam(b);return;}
  if(attack==='solar'){solarVolley(b.id);b.state='solar';b.timer=.95;return;}
  bossCue('lunarAim',b);b.state='lunar';b.timer=.85;
  for(const planet of b.planets)planet.moons=Array.from({length:4},randomTier);
}
function startSingularFinal(b){
  b.hp=0;b.phase=3;b.state='final';b.timer=2.1;b.burstCd=0;
  finalCredit.set(b,state);addPlanets(b);
  for(const planet of b.planets){
    cosmicShot(planet.x,planet.y,aimAtPlayer(planet.x,planet.y),530,3,
      {tint:planet.tint,r:planet.r+4,planet:true,source:b.id});
  }
  b.planets=[];bossCue('starCollapse',b);state.shake=Math.max(10,state.shake);
}
function updateSingular(b,dt){
  b.hitFlash=Math.max(0,(b.hitFlash||0)-dt);b.timer-=dt;b.orbitTime+=dt;
  if(b.state==='final'){
    b.burstCd-=dt;
    if(b.burstCd<=0){
      b.burstCd=.12;
      for(let i=0;i<4;i++)cosmicShot(b.x,b.y,gameRand(0,TAU),gameRand(240,540),randomTier(),{source:b.id});
    }
    if(b.timer<=0){
      state.enemyBullets=state.enemyBullets.filter(s=>s.source!==b.id);
      state.cosmicZones=state.cosmicZones.filter(z=>z.source!==b.id);
      bossCue('starNova',b);state.cosmicZones.push({type:'nova',x:b.x,y:b.y,r:310,age:0,windup:0,duration:.82});
      const active=state;state=finalCredit.get(b)||active;killBoss(b,true);state=active;
    }
    return;
  }
  if(b.hp<=b.maxHp*.5 && b.phase===1){b.phase=2;addPlanets(b);bossCue('orbitRise',b);b.deck=[];}
  if(b.hp<b.maxHp*.3)b.phase=3;
  for(const [i,planet] of b.planets.entries()){
    planet.angle+=dt*(i%2?-1:1)*(.66+.12*i);
    planet.x=b.x+Math.cos(planet.angle)*planet.distance;
    planet.y=b.y+Math.sin(planet.angle)*planet.distance;
  }
  if(b.phase===3){
    b.ambient-=dt;
    if(b.ambient<=0){solarVolley(b.id);summonWells(1,b.id);b.ambient=3.8;}
  }
  b.trailCd=(b.trailCd||0)-dt;
  if(b.trailCd<=0){
    b.trailCd=.09;b.trail.push({x:b.x+gameRand(-18,18),y:b.y+gameRand(-18,18),t:b.orbitTime});
    if(b.trail.length>17)b.trail.shift();
  }
  if(b.state==='compress'){if(b.timer<=0)openBeam(b);return;}
  if(b.state==='drift'){
    const t=b.orbitTime,p=bossPrey(b),a=Math.atan2(p.y-b.y,p.x-b.x)+.9*Math.sin(t*1.3);
    b.x=clamp(b.x+Math.cos(a)*125*moveTime(b,dt),state.arena.x+b.size/2,state.arena.x+state.arena.w-b.size/2);
    b.y=clamp(b.y+Math.sin(a)*125*moveTime(b,dt),state.arena.y+b.size/2,state.arena.y+state.arena.h-b.size/2);
    if(b.timer<=0){
      if(!b.deck.length)b.deck=b.phase>1?['attract','solar','blink','lunar']:['attract','solar','blink'];
      startSingularAttack(b,b.deck.splice(Math.floor(gameRandom()*b.deck.length),1)[0]);
    }
    return;
  }
  if(b.state==='attract'){
    if(b.massWaves>0){
      if(b.timer<=0){emitMassWave(b);b.massWaves--;b.timer+=MASS_INTERVAL;}
      return;
    }
    if(!state.enemyBullets.some(shot=>shot.inward===b.id)){b.state='repel';b.timer=.58;bossCue('massHold',b);}
    return;
  }
  if(b.timer>0)return;
  if(b.state==='repel'){
    for(const tier of b.absorbed)cosmicShot(b.x,b.y,gameRand(0,TAU),gameRand(290,520),tier,{source:b.id});
    b.absorbed=[];state.shake=Math.max(10,state.shake);bossCue('massEject',b);
  }else if(b.state==='blink' && b.remaining){blinkBeam(b);return;}
  else if(b.state==='lunar'){
    bossCue('lunarVolley',b);
    for(const planet of b.planets){
      for(const [i,tier] of planet.moons.entries()){
        const pos=moonPosition(planet,i,b.orbitTime);
        cosmicShot(pos.x,pos.y,aimAtPlayer(pos.x,pos.y)+(i-1.5)*.065,370+40*tier,tier,{tint:planet.tint,source:b.id});
      }
      planet.moons=[];
    }
  }
  b.state='drift';b.timer=1.45;
}
function planetContact(b,p){
  if(p.invuln>0 || b.state==='final')return;
  for(const planet of b.planets){
    if(visibleContact(planet,p,planet.r+p.size/2)){
      damagePlayer(1);break;
    }
  }
}
function moonPosition(planet,i,time){
  const a=i*TAU/4+time*4;
  return {x:planet.x+Math.cos(a)*(planet.r+15),y:planet.y+Math.sin(a)*(planet.r+15)};
}
function solarVertices(z){
  return Array.from({length:3},(_,i)=>({x:z.x+SOLAR_RADIUS*Math.cos(z.angle+i*TAU/3),y:z.y+SOLAR_RADIUS*Math.sin(z.angle+i*TAU/3)}));
}
function segmentDistance(p,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
function cosmicContact(z,p){
  const r=p.size/2;
  if(z.type==='beam')return z.points.slice(1).some((pt,i)=>segmentDistance(p,z.points[i],pt)<=z.width/2+r);
  if(z.type==='solar'){
    const v=solarVertices(z);
    return v.every((a,i)=>{const b=v[(i+1)%3];return (b.x-a.x)*(p.y-a.y)>=(b.y-a.y)*(p.x-a.x);}) ||
      v.some((a,i)=>segmentDistance(p,a,v[(i+1)%3])<=r);
  }
  return Math.hypot(p.x-z.x,p.y-z.y)<(z.type==='well'?36:z.r)+r;
}
function pullIntoWells(p,dt,walls){
  for(const z of state.cosmicZones||[]){
    if(z.type!=='well'||z.age<z.windup||z.age>=z.off)continue;
    const dx=z.x-p.x,dy=z.y-p.y,d=Math.hypot(dx,dy);
    if(d>0 && d<z.r){const pull=Math.min(d,dt*195*(1-d/z.r))/d;moveWithWalls(p,dx*pull,dy*pull,walls);}
  }
}
function updateCosmicZones(dt,worldStep){
  for(let i=state.cosmicZones.length-1;i>=0;i--){
    const z=state.cosmicZones[i];
    if(worldStep){
      const before=z.age;z.age+=dt;
      if(z.type==='well' && before<z.off-.4 && z.age>=z.off-.4)bossCue('wellFuse',z);
      if(before<z.off && z.age>=z.off){
        bossCue(z.type==='beam'?'beamDecay':'wellBurst',z.points?.[0]||z);
        if(z.type==='well')state.shake=Math.max(state.shake,5);
      }
      if(before<z.windup && z.age>=z.windup){
        if(z.type==='solar')bossCue('solarStrike',z);
        if(z.type==='beam'){bossCue('voidBeam',z.points[0]);state.shake=Math.max(state.shake,6);}
      }
    }
    if(z.age>=z.duration){if(worldStep)state.cosmicZones.splice(i,1);continue;}
    if(z.age<z.windup || z.age>=z.off || z.type==='nova')continue;
    if(z.type==='solar' && z.age<z.windup+.06)state.shake=Math.max(state.shake,8);
    if(!cosmicContact(z,state.player))continue;
    const hits=cosmicHits.get(z)||new WeakSet();
    if(z.type!=='well' && hits.has(state.player))continue;
    hits.add(state.player);cosmicHits.set(z,hits);
    damagePlayer(z.type==='well'?1:z.type==='nova'?3:2);
  }
}
