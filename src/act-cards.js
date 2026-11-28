'use strict';
const ACT_NORMALS=[
 ['refract','Refracción cinética','Cada rebote en una pared aumenta el daño de esa bala un 8 % por copia.','#f9fbff','◇'],
 ['compression','Compresión balística','Cada 150 px de trayectoria añaden un 6 % de daño por copia.','#ffce67','»'],
 ['capacitor','Acumulador de energía','Tras 2 s de fuego continuo, +5 % de daño por copia. Pierdes la carga al parar 0,7 s.','#ebed64','▣'],
 ['saturation','Saturación de combate','+4 % de daño por copia y por enemigo o jefe a menos de 280 px.','#ef849f','◉'],
 ['returnShot','Retorno balístico','20 % de retorno por copia. La vuelta gana daño y cada retorno garantizado adicional lo potencia.','#5dffef','↶'],
 ['dashPulse','Pulso de esquiva','El Dash emite una onda de daño y cancelación. +10 % de radio y +8 % de daño por copia adicional.','#8ce5ff','◎'],
 ['survival','Impulso de supervivencia','Tras recibir daño, +5 % de velocidad por copia durante 2 s más 0,15 s por copia.','#81f5a2','≫']
];
const ACT_SPECIALS=[
 ['nullArc','Cortina de anulación','Lanza un arco que golpea y desgasta proyectiles. Cada copia añade un arco y amplía su frente.',42,'#83fffa','◗'],
 ['omega','Cañón omega','Carga un cuadrado explosivo durante un segundo. +12 % de tamaño y +18 % de daño por copia adicional.',48,'#ff9374','▣'],
 ['resNet','Red de resonancia','Tres nodos enlazados persiguen enemigos durante 5 s. +1 nodo y +8 % de daño por copia adicional.',50,'#cb99ff','△'],
 ['starTide','Marea estelar','Los bordes cargan durante 1 s y disparan cuatro oleadas al puntero. Cada copia añade una oleada y daño.',60,'#9ad8ff','✧']
];
function releaseWeaponControl(p,dt,fire){
  if(!p.capacitor)return;
  if(fire){p.fireTime=(p.fireTime||0)+dt;p.fireGap=0;}
  else {p.fireGap=(p.fireGap||0)+dt;if(p.fireGap>.7)p.fireTime=0;}
}
function capacitorGain(p){return p.fireTime>=2?1+.05*(p.capacitor||0):1;}
function wearProjectile(shot,area){shot.cancelHP=(shot.cancelHP??shot.r**2)-area;shot.cancelHit=state.time;return shot.cancelHP<=0;}
function pulseOnDash(p){
  if(!p.dashPulse)return;
  const radius=72*(1+.1*(p.dashPulse-1)),power=1+.08*(p.dashPulse-1);
  geometryFX('dashPulse',p,radius);areaCard(p,radius,3*power);
  state.enemyBullets=state.enemyBullets.filter(s=>Math.hypot(s.x-p.x,s.y-p.y)>radius+s.r||!wearProjectile(s,36*power));
}
const returnSurfaces=new WeakMap();
function beginReturn(b,p,surface=null){
  if(!p.returnShot||b.returned||b.style==='omega')return false;
  const extra=chanceCount(.2*p.returnShot);if(!extra)return false;
  if(surface)returnSurfaces.set(b,surface);
  b.returned=true;b.life=2.2;b.style='returnShot';b.homing=false;
  b.damage=Math.min(Number.MAX_VALUE,b.damage*(1+.08*p.returnShot)*extra);
  const angle=angleTo(b,p)+.7;b.vx=Math.cos(angle)*760;b.vy=Math.sin(angle)*760;return true;
}
function actCast(id,p,n,aim){
  const cast={id,n,aim:point(aim),age:0,next:0,sent:0,angle:angleTo(p,aim),nodes:[],arcs:[]};
  if(id==='starTide'){
    const a=state.arena||{x:p.x-W/2,y:p.y-H/2,w:W,h:H};
    for(let j=0;j<12;j++){const side=j%4,t=(Math.floor(j/4)+.5)/3;
      cast.nodes.push({x:a.x+a.w*[t,1,t,0][side],y:a.y+a.h*[0,t,1,t][side]});}
    cast.next=1;
  }
  (p.actCasts||=[]).push(cast);
}
const arcHits=new WeakMap();
function advanceArc(c,arc,dt){
  const old=arc.radius;arc.radius+=810*dt;
  const within=e=>{
    const dx=e.x-arc.x,dy=e.y-arc.y,d=Math.hypot(dx,dy),r=e.r||e.size/2||0;
    return d+r>=old-6&&d-r<=arc.radius+6&&(dx*Math.cos(c.angle)+dy*Math.sin(c.angle))>=d*Math.cos(arc.spread);
  };
  const seen=arcHits.get(arc);
  for(const e of state.enemies.concat(bossTargets()))if(!seen.has(e)&&within(e)){seen.add(e);expansionHit(e,7);}
  state.enemyBullets=state.enemyBullets.filter(s=>{if(seen.has(s)||!within(s))return true;seen.add(s);return !wearProjectile(s,100);});
}
function updateActCast(c,p,dt){
  c.age+=dt;
  if(c.id==='nullArc'){
    if(c.sent<c.n&&c.age>=c.next){c.sent++;c.next+=.14;const arc={...point(p),radius:0,spread:Math.min(1.5,.55+.04*c.n)};c.arcs.push(arc);arcHits.set(arc,new WeakSet());}
    for(const a of c.arcs)advanceArc(c,a,dt);c.arcs=c.arcs.filter(a=>a.radius<720*(1+.035*c.n));
    return c.sent<c.n||!!c.arcs.length;
  }
  if(c.id==='omega'){
    if(c.age<1)return true;
    const radius=16*(1+.12*(c.n-1));spawnSkillShot(p,angleTo(p,c.aim),1100,radius,26*(1+.18*(c.n-1)),'omega');
    bossCue('omegaFire',p);return false;
  }
  if(c.id==='starTide'){
    if(c.age>=c.next){for(const [i,q] of c.nodes.entries()){
      const phase=i*TAU/c.nodes.length+c.sent*.48;
      const focus=c.sent%2?{x:c.aim.x+(i%2?36:-36),y:c.aim.y+(i%2?36:-36)}:polarPoint(c.aim,38,phase);
      const a=angleTo(q,focus);spawnSkillShot(q,a,610,4,2*(1+.08*(c.n-1)),'starTide');}
      bossCue('starSalvo',p);c.next+=.25;c.sent++;}return c.sent<c.n+3;
  }
  const targets=state.enemies.concat(bossTargets()).filter(e=>!e._dying&&e.state!=='final');
  targets.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));
  const n=c.n+2;
  for(let i=0;i<n;i++){
    const target=targets[i%targets.length]||c.aim,dest=polarPoint(target,Math.min(52,12+(target.size||40)*.33)+i%3*3,c.age*1.3+i*TAU/n);
    const q=c.nodes[i]||=point(p);q.x+=(dest.x-q.x)*Math.min(1,dt*7);q.y+=(dest.y-q.y)*Math.min(1,dt*7);
  }
  if(c.age>=c.next){
    for(const e of targets)if(c.nodes.some((a,i)=>{const b=c.nodes[(i+1)%n];return bulletEntry({prevX:a.x,prevY:a.y,x:b.x,y:b.y},e,e.size/2+5)!==Infinity;}))expansionHit(e,2*(1+.08*(c.n-1)));
    c.next+=.28;
  }
  return c.age<5;
}
function spawnSkillShot(q,a,speed,r,damage,style){
  state.bullets.push({...point(q),vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r,damage,style,life:3,bounces:0,dupli:0});
}
function omegaBurst(b){
  if(b.style!=='omega')return;
  geometryFX('omega',b,b.r*4);areaCard(b,b.r*4,b.damage*.7);bossCue('omegaFire',b);
}
function updateActCards(p,dt){
  if(p.actCasts)p.actCasts=p.actCasts.filter(c=>updateActCast(c,p,dt));
  if(p.saturation && state.time>=(p.nextScan||0)){
    const close=e=>Math.hypot(e.x-p.x,e.y-p.y)<=280;
    p.nearby=state.enemies.filter(close).length+livingBosses().filter(b=>close(b)||b.parts?.some(q=>q.hp>0&&close(q))||b.pieces?.some(piece=>piece.parts.some(close))).length;
    p.nextScan=state.time+.1;
  }
}
