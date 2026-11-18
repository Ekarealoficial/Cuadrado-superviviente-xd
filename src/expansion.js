'use strict';
function updateExpansionEnemy(e,p,dt,travel,d){
  if(!['cannon','tackler','frostMage'].includes(e.type))return false;
  const a=Math.atan2(p.y-e.y,p.x-e.x);
  function walk(angle,speed){moveWithWalls(e,Math.cos(angle)*speed*travel,Math.sin(angle)*speed*travel,currentWalls);}
  e.hitFlash=Math.max(0,e.hitFlash-dt);
  e.shootCd-=dt;
  if(e.type==='tackler'){
    e.phase ||= 'group';
    if(e.phase==='group'){
      const ally=enemyGrid.query(e.x,e.y,360).find(v=>v!==e && v.type==='tackler');
      walk(ally?Math.atan2(ally.y-e.y,ally.x-e.x):a,e.speed);
      if(e.shootCd<=0 && d<700){e.remaining=4+Math.floor(gameRandom()*2);e.phase='aim';e.heading=a;e.shootCd=.42;}
    }else if(e.phase==='aim'){
      if(e.shootCd<=0){e.phase='rush';e.shootCd=.19;}
    }else{
      walk(e.heading,880);
      if(e.shootCd<=0){
        if(--e.remaining){e.phase='aim';e.heading=a;e.shootCd=.32;}
        else{e.phase='group';e.shootCd=2.4;}
      }
    }
  }else{
    if(d>420)walk(a,e.speed);
    else if(d<250)walk(a,-e.speed*.65);
    if(e.type==='cannon'){
      if(!e.charging && d<720 && e.shootCd<=0){e.charging=true;e.heading=a;e.shootCd=1.15;}
      if(e.charging && e.shootCd<=0){
        const dx=Math.cos(e.heading),dy=Math.sin(e.heading);
        state.enemyBullets.push({x:e.x+dx*30,y:e.y+dy*30,vx:dx*350,vy:dy*350,r:13,life:3,damage:3});
        spawnParticles(e.x+dx*29,e.y+dy*29,12,e.color);Sfx.play('explode',100);
        e.charging=false;e.shootCd=3.5;
      }
    }else if(e.shootCd<=0 && d<700){
      const start=gameRandom()*TAU;
      for(let i=0;i<4;i++){
        const r=i?gameRand(60,140):0,ang=start+i*TAU/3;
        state.iceZones.push({x:p.x+r*Math.cos(ang),y:p.y+r*Math.sin(ang),age:0});
      }
      e.shootCd=5.5;
    }
  }
  if(d>Math.max(W,H)+900)state.enemies.splice(state.enemies.indexOf(e),1);
  return true;
}
function inversionVisible(b){
  return Math.abs(b.x-state.cam.x)<=(state.viewWidth||W)/(2*state.cam.zoom) &&
    Math.abs(b.y-state.cam.y)<=(state.viewHeight||H)/(2*state.cam.zoom);
}
function invertProjectiles(){
  const p=state.player;
  const visible=inversionVisible;
  for(const b of state.bullets)if(visible(b)){b.homing=true;b.inverted=true;}
  for(const bomb of state.bossBombs.filter(b=>!b.exploded && visible(b))){
    spawnBullet(bomb.x,bomb.y,p.angle,520,{homing:true,radius:12,damage:5});
    state.bossBombs.splice(state.bossBombs.indexOf(bomb),1);
  }
  for(const ball of state.boss?.balls||[])if(ball.state==='flying' && visible(ball)){
    spawnBullet(ball.x,ball.y,Math.atan2(-ball.vy,-ball.vx),600,{homing:true,radius:16,damage:7});
    ball.state='returning';
  }
  state.enemyBullets=state.enemyBullets.filter(b=>{
    if(!visible(b))return true;
    state.bullets.push({...b,vx:-b.vx,vy:-b.vy,inverted:true,homing:true,damage:b.damage||1,bounces:0,dupli:0,venom:p.venom||0});
    return false;
  });
  state.enemyDarts=state.enemyDarts.filter(d=>{
    if(!visible(d))return true;
    state.darts.push({type:'explosive',inverted:true,x:d.x,y:d.y,state:'follow',bob:0,angle:d.angle,target:null});
    return false;
  });
}
function activateExpansion(id){
  const sc=state.specialCards[id],p=state.player;
  if(!sc?.charges)return;
  sc.charges--;if(sc.cooldown<=0)sc.cooldown=sc.cooldownMax;
  const n=sc.totalCards,aim=getWorldMouse(),a=Math.atan2(aim.y-p.y,aim.x-p.x);
  p.cast={id,born:state.time};
  if(id==='kame'){
    (p.beam ||= []).push({a,end:state.time+.45});
  }else if(id==='activeHeal'){
    if(state.halfHearts>=state.maxHalfHearts)state.blueHealth+=n+1;
    else state.halfHearts=Math.min(state.maxHalfHearts,state.halfHearts+n+1);
  }else if(id==='reverse')invertProjectiles();
  else if(id==='plasma')p.plasma={r:62+12*(n-1),damage:5+3*(n-1),end:state.time+6};
  else state.stopUntil=Math.max(state.stopUntil,state.time+2+n);
  spawnParticles(p.x,p.y,22,SPECIAL_CARDS.find(c=>c.id===id).color);
  Sfx.play(id==='kame'?'laser':'blink',80);
}
function expansionHit(e,damage){
  if(e._dying)return;
  e.hp-=damage*attackMultiplier(e);e.hitFlash=.14;
  if(e.hp<=0){if(e===state.boss)killBoss();else killEnemy(state.enemies.indexOf(e));}
}
function updateExpansion(dt,worldStep){
  const p=state.player;
  if(p.plasma?.end<=state.time)p.plasma=null;
  if(state.stopUntil>state.time){
    for(const b of p.beam||[])b.end+=dt;
    return;
  }
  if(p.beam){
    p.beam=p.beam.filter(b=>b.end>state.time);
    for(const beam of p.beam){
      const targets=state.enemies.slice();if(state.boss)targets.push(state.boss);
      for(const e of targets)if(laserHits(e.x,e.y,e.size/2,p.x,p.y,beam.a,32,1100))expansionHit(e,95*dt);
    }
  }
  if(worldStep){
    for(const z of state.iceZones)z.age+=dt;
    state.iceZones=state.iceZones.filter(z=>z.age<2.45);
  }
  for(const z of state.iceZones)if(z.age>=2 && z.age<2.13 && Math.hypot(z.x-p.x,z.y-p.y)<45+p.size/2 && !p.plasma)
    p.iceUntil=state.time+1.25;
}
function repelPlasma(){
  const p=state.player,s=p.plasma;if(!s)return;
  for(const e of state.boss?[...state.enemies,state.boss]:state.enemies.slice()){
    const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy),r=s.r+e.size/2;
    if(d>=r)continue;
    e.x=p.x+(d?dx/d:1)*r;e.y=p.y+(d?dy/d:0)*r;
    if(!(e.plasmaHit>state.time)){e.plasmaHit=state.time+.35;expansionHit(e,s.damage);}
  }
  for(const b of [...state.enemyBullets,...(state.boss?.balls||[]).filter(ball=>ball.state==='flying')]){
    reflectPlasmaShot(p,s,b);
  }
}
function reflectPlasmaShot(p,s,b){
  const dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy),r=s.r+b.r;
  if(d>=r)return false;
  const nx=d?dx/d:1,ny=d?dy/d:0,dot=nx*b.vx+ny*b.vy;
  if(dot<0){b.vx-=2*dot*nx;b.vy-=2*dot*ny;}
  b.x=p.x+nx*r;b.y=p.y+ny*r;
  s.flare={a:Math.atan2(ny,nx),end:state.time+.18};
  b.prevX=b.x;b.prevY=b.y;
  return true;
}
