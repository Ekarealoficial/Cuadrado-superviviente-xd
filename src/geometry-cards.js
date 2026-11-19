'use strict';
const GEOMETRY_NORMALS=[
 ['mini','Miniatura','Reduce el tamaño un 6 % y aumenta la velocidad un 2 %.','#6fffe6','⌗'],
 ['giant','Gigantismo','Aumenta el tamaño un 8 % y el daño de contacto un 12 %.','#ff9e5c','⛶'],
 ['resonance','Resonancia','Cada 12 impactos libera una onda. +12 % de radio y +10 % de daño por copia adicional.','#62e8f2','◎'],
 ['kinetic','Impulso cinético','Tras moverte 2 s, +5 % de daño de bala por copia. Se pierde tras parar medio segundo.','#a3fba2','»'],
 ['chain','Cadena eléctrica','15 % por copia de encadenar una descarga. Cada copia añade un objetivo.','#ffef81','ϟ'],
 ['persist','Balas persistentes','Cada copia aumenta un 15 % la duración y alarga la estela.','#9eaaff','⋙'],
 ['tide','Marea de proyectiles','Cada siete ciclos dispara cinco balas en abanico. +2 por copia adicional.','#73bfff','⋔'],
 ['reaction','Reacción defensiva','Al recibir daño, empuja e hiere alrededor. +15 % de radio y daño por copia adicional.','#b8eaff','◈']
];
const GEOMETRY_SPECIALS=[
 ['crush','Colapso geométrico','Atrae durante 1,5 s y comprime un cuadrado en el puntero. +15 % de tamaño y +20 % de daño por copia.',38,'#ff77cc','⊠'],
 ['army','Ejército de réplicas','Dos réplicas imitan tus disparos durante 6 s. +1 réplica y +0,5 s por copia.',50,'#c190ff','▦'],
 ['anchor','Ancla temporal','Suspende proyectiles en un círculo durante 4 s y los devuelve al expirar. +12 % de radio y +0,5 s por copia.',55,'#79c7ff','◷'],
 ['needles','Corona de agujas','Ocho orbes disparan hacia fuera durante 6 s. +2 orbes y +8 % de daño por copia.',42,'#ffdf7a','✴']
];
function addGeometryCard(p,card){
  p[card.id]=(p[card.id]||0)+1;
  if(card.id==='mini'||card.id==='giant'){
    p.size=30*Math.exp((p.mini||0)*Math.log(.94)+(p.giant||0)*Math.log(1.08));
    if(card.id==='mini')p.speed*=1.02;
    p.scalePulse={kind:card.id,born:state.time};
    settleResizedPlayer(p);fitPlayerInArena(p,state.arena);geometryFX(card.id,p,Math.max(36,p.size*.72));
  }
}
function fitPlayerInArena(p,a){
  if(!a)return;
  const h=p.size/2;
  p.x=2*h>=a.w?a.x+a.w/2:clamp(p.x,a.x+h,a.x+a.w-h);
  p.y=2*h>=a.h?a.y+a.h/2:clamp(p.y,a.y+h,a.y+a.h-h);
}
function geometryFX(kind,origin,r,to){
  const p=state.player;
  (p.geometryFX||=[]).push({kind,x:origin.x,y:origin.y,r,born:state.time,to:to&&{x:to.x,y:to.y}});
}
function areaCard(origin,r,damage,push=0,box=false,exclude=null){
  for(const e of state.enemies.concat(bossTargets())){
    if(e._dying||e===exclude)continue;
    const dx=e.x-origin.x,dy=e.y-origin.y,d=Math.hypot(dx,dy)||1;
    if((box?Math.max(Math.abs(dx),Math.abs(dy)):d)>r+e.size/2)continue;
    if(push && !e.balls)moveWithWalls(e,dx/d*push,dy/d*push,currentWalls);
    expansionHit(e,damage);
  }
}
function chanceCount(chance){return Math.floor(chance)+(gameRandom()<chance%1?1:0);}
function geometryImpact(target,p){
  if(p.resonance){
    p.resonanceHits=((p.resonanceHits||0)+1)%12;
    if(!p.resonanceHits){
      const r=84*(1+.12*(p.resonance-1));geometryFX('resonance',target,r);
      areaCard(target,r,1+.1*(p.resonance-1),0,false,target);bossCue('resonance',target);
    }
  }
  if(!p.chain)return;
  const discharges=chanceCount(.15*p.chain);
  for(let i=0;i<discharges;i++){
    let from=target;const seen=new Set([from]);
    for(let hop=0;hop<p.chain;hop++){
      let next=null,best=185;
      for(const e of state.enemies.concat(bossTargets())){
        if(e._dying||seen.has(e))continue;
        const d=Math.hypot(e.x-from.x,e.y-from.y);if(d<best){best=d;next=e;}
      }
      if(!next)break;seen.add(next);geometryFX('chain',from,0,next);expansionHit(next,1);from=next;
    }
    if(seen.size>1)bossCue('chain',target);
  }
}
function defensiveReaction(p){
  if(!p.reaction)return;
  const scale=1+.15*(p.reaction-1);geometryFX('reaction',p,100*scale);bossCue('reaction',p);
  areaCard(p,100*scale,scale,62);
}
function satellite(p,i,n,r,a){
  const angle=a+i*TAU/n;
  return {x:p.x+Math.cos(angle)*r,y:p.y+Math.sin(angle)*r,angle};
}
function replicaOrbit(p,i,n){return satellite(p,i,n,p.size/2+Math.max(38,n*4),Math.PI/2);}
function geometryVolley(p){
  p.firingCycles=(p.firingCycles||0)+1;
  if(p.tide && p.firingCycles%7===0){
    const n=3+2*p.tide;
    for(let i=0;i<n;i++)spawnBullet(p.x,p.y,p.angle-.55+1.1*i/(n-1),820,{radius:3,damage:1+p.sizeLevel*.75,style:'tide',bounces:p.bounces,homing:p.homingChance>0 && gameRandom()<p.homingChance});
    bossCue('tide',p);
  }
  if(p.army)p.army.queue.push({angle:p.angle,delay:.14});
}
function castGeometry(id,p,n,aim){
  if(id==='crush')p.crush={...aim,age:0,r:110*(1+.15*(n-1)),damage:12*(1+.2*(n-1))};
  if(id==='army')p.army={time:6+.5*(n-1),n:n+1,queue:[]};
  if(id==='anchor')p.anchor={time:4+.5*(n-1),r:120*(1+.12*(n-1)),held:[]};
  if(id==='needles')p.needles={time:6,n:6+2*n,tick:0,damage:1+.08*(n-1),angle:0};
  bossCue(id,p);
}
function updateGeometryCards(p,dt){
  if(p.geometryFX)p.geometryFX=p.geometryFX.filter(z=>state.time-z.born<.65);
  if(p.kinetic){
    if(Math.hypot(p.vx,p.vy)>15){p.movingTime=(p.movingTime||0)+dt;p.stillTime=0;}
    else{p.stillTime=(p.stillTime||0)+dt;if(p.stillTime>.5)p.movingTime=0;}
  }
  if(p.crush){
    const c=p.crush;c.age+=dt;
    if(c.age>=1.5){areaCard(c,c.r,c.damage,0,true);geometryFX('crush',c,c.r);bossCue('crushBeat',c);p.crush=null;}
    else for(const e of state.enemies.concat(bossTargets())){
      if(Math.max(Math.abs(c.x-e.x),Math.abs(c.y-e.y))<c.r)moveWithWalls(e,(c.x-e.x)*dt*.85,(c.y-e.y)*dt*.85,currentWalls);
    }
  }
  if(p.army){
    const a=p.army;a.time-=dt;
    for(const q of a.queue)q.delay-=dt;
    while(a.queue.length && a.queue[0].delay<=0){
      const q=a.queue.shift();
      for(let i=0;i<a.n;i++){const pos=replicaOrbit(p,i,a.n);spawnBullet(pos.x,pos.y,q.angle,800,{radius:3,style:'army',damage:1+p.sizeLevel*.5});}
    }
    if(a.time<=0)p.army=null;
  }
  if(p.anchor){
    const a=p.anchor;a.time-=dt;
    for(const list of [state.enemyBullets,state.enemyDarts]){
      for(let i=list.length-1;i>=0;i--){const s=list[i];if(Math.hypot(s.x-p.x,s.y-p.y)>a.r)continue;
        a.held.push({x:s.x,y:s.y,r:s.r||5,damage:s.damage||1});list.splice(i,1);}
    }
    if(a.time<=0 || state.over){
      for(const s of a.held){
        const angle=Math.atan2(s.y-p.y,s.x-p.x);
        state.bullets.push({...s,vx:650*Math.cos(angle),vy:650*Math.sin(angle),life:2,style:'anchor',bounces:0,dupli:0});
      }
      geometryFX('anchor',p,a.r);bossCue('anchorBeat',p);p.anchor=null;
    }
  }
  if(p.needles){
    const c=p.needles;c.time-=dt;c.tick-=dt;c.angle+=dt*1.45;
    if(c.time<=0){geometryFX('needles',p,55);p.needles=null;}
    else if(c.tick<=0){c.tick+=.48;
      for(let i=0;i<c.n;i++){const pos=satellite(p,i,c.n,p.size/2+45,c.angle);spawnBullet(pos.x,pos.y,pos.angle,490,{radius:3,style:'needles',damage:c.damage});}
      bossCue('needlesBeat',p);
    }
  }
}
