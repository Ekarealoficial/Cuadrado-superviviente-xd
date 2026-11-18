'use strict';
function neonRing(r,color,width=2,start=0,end=TAU){
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.arc(0,0,r,start,end);ctx.stroke();
}
function shard(x,y,w,h,color){
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y-h);ctx.lineTo(x+w,y);ctx.lineTo(x,y+h*.6);ctx.lineTo(x-w,y);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#eaffff';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y-h);ctx.lineTo(x+w,y);ctx.lineTo(x,y+h*.6);ctx.stroke();
}
function drawExpansionEnemy(e,r){
  if(!['cannon','frostMage','splitter','tackler'].includes(e.type))return;
  ctx.save();ctx.translate(e.x,e.y);ctx.shadowColor=e.color;ctx.shadowBlur=9;
  if(e.type==='splitter'){
    ctx.rotate(e.wob+state.time*.5);neonRing(r*.78,'#113c2d',3);
    for(let i=0;i<3;i++){ctx.rotate(TAU/3);shard(r*.38,0,r*.18,r*.33,'#0b583d');}
  }else if(e.type==='frostMage'){
    ctx.rotate(state.time*.75);for(let i=0;i<6;i++){ctx.rotate(TAU/6);shard(0,-r*.8,3,8,'#b6f7ff');}
    shard(0,0,6,12,'#25649e');
  }else{
    ctx.rotate(e.heading??Math.atan2(state.player.y-e.y,state.player.x-e.x));
    if(e.type==='cannon'){
      const charge=e.charging?clamp(1-e.shootCd/1.15,0,1):0;
      ctx.fillStyle='#492635';ctx.fillRect(-6,-8,r+16,16);
      ctx.fillStyle='#ffe8a4';ctx.fillRect(r+5,-6,6,12);
      for(let i=0;i<5;i++){ctx.fillStyle=i<charge*5?'#fff5af':'#a25d34';ctx.fillRect(i*5-3,-4,3,8);}
      if(e.charging){ctx.translate(r+12,0);neonRing(3+9*charge,'#ffd08c',3);ctx.fillStyle='#fff9d5';ctx.fillRect(-3,-3,6,6);}
    }else{
      if(e.phase==='aim'){ctx.setLineDash([8,7]);ctx.strokeStyle='#ffb77f';ctx.beginPath();ctx.moveTo(r,0);ctx.lineTo(168,0);ctx.stroke();ctx.setLineDash([]);}
      if(e.phase==='rush'){ctx.fillStyle='#ff885c77';ctx.beginPath();ctx.moveTo(-5,-10);ctx.lineTo(-52,0);ctx.lineTo(-5,10);ctx.fill();}
      for(let i=-7;i<=0;i+=7){ctx.strokeStyle='#60243d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(i,-7);ctx.lineTo(i+7,0);ctx.lineTo(i,7);ctx.stroke();}
    }
  }
  ctx.restore();
}
let fracture=null;
function makeFracture(start,end){
  const rng=makeRng(hash2D(Math.round(start*1000),Math.round(end*1000)));
  const paths=[],times=[0],steps=Math.max(5,Math.min(40,Math.ceil((end-start)*2.8)));
  let duration=0;
  for(let i=0;i<steps;i++){duration+=.4+rng();times.push(duration);}
  for(let i=1;i<times.length;i++)times[i]/=duration;
  const count=6+Math.floor(rng()*4),rotation=rng()*TAU;
  for(let j=0;j<count;j++){
    const angle=rotation+TAU*(j+rng()*.84)/count,dx=Math.cos(angle),dy=Math.sin(angle);
    const edge=.51/Math.max(Math.abs(dx),Math.abs(dy)),n=7+Math.floor(rng()*6);
    const points=[{x:dx*edge,y:dy*edge,at:0}];
    let bend=0,at=rng()*.17;
    for(let k=1;k<=n;k++){
      const t=k/n;
      bend=.6*bend+(rng()-.5)*.11;
      const offset=Math.sin(t*Math.PI)*bend,x=dx*edge*(1-t)-dy*offset,y=dy*edge*(1-t)+dx*offset;
      at+=.45+rng();
      points.push({x,y,at,branch:k<n && rng()<.45?{x:x+(rng()-.5)*.11,y:y+(rng()-.5)*.13}:null});
    }
    for(const p of points)p.at/=at;
    paths.push(points);
  }
  return {start,end,paths,times,step:-1};
}
function fractureShake(){
  const end=state.stopUntil,start=state.stopStarted||0,left=end-state.time;
  if(!end || left<-.18){fracture=null;return 0;}
  if(!fracture || fracture.start!==start || fracture.end!==end)fracture=makeFracture(start,end);
  const progress=clamp(1-left/(end-start||1),0,1);
  let step=fracture.step;
  while(step+1<fracture.times.length && fracture.times[step+1]<=progress)step++;
  if(step!==fracture.step){fracture.step=step;Sfx.play('timeCrack');}
  const elapsed=state.time-(start+fracture.times[step]*(end-start));
  return (3+progress*5)*clamp(1-elapsed/.13,0,1);
}
function drawTimeFractures(){
  if(!fracture)return;
  const left=fracture.end-state.time,fade=clamp(1+left/.18,0,1);
  const reach=fracture.times[fracture.step];
  ctx.save();ctx.translate(W/2,H/2);
  ctx.fillStyle='#332649';ctx.globalAlpha=.12*fade;ctx.fillRect(-W/2,-H/2,W,H);
  ctx.globalAlpha=.75*fade;ctx.shadowColor='#ffc46b';ctx.shadowBlur=6;
  ctx.strokeStyle='#ffdf9a';ctx.lineWidth=1.35;ctx.beginPath();
  for(const points of fracture.paths){
    const origin=points[0];ctx.moveTo(origin.x*W,origin.y*H);
    for(const p of points.slice(1)){
      if(p.at>reach)break;
      ctx.lineTo(p.x*W,p.y*H);
      if(p.branch){ctx.lineTo(p.branch.x*W,p.branch.y*H);ctx.moveTo(p.x*W,p.y*H);}
    }
  }
  ctx.stroke();ctx.globalAlpha=fade;ctx.textAlign='center';ctx.fillStyle='#fff2c9';
  ctx.font='bold 13px system-ui';
  if(left>0)ctx.fillText(left.toFixed(1)+' s',0,-Math.min(W,H)*.12);
  ctx.restore();
}
function drawExpansionWorld(){
  for(const z of state.iceZones||[]){
    ctx.save();ctx.translate(z.x,z.y);const t=Math.min(z.age/ICE_FALL,1);
    ctx.shadowColor='#60cfff';ctx.shadowBlur=9;
    if(t<1){
      ctx.fillStyle=t>.74?'#80eaff52':'#43afff29';ctx.beginPath();ctx.arc(0,0,45,0,TAU);ctx.fill();
      neonRing(45,'#76ceff',2);neonRing(6+39*(1-t),'#efffff',2);
      const y=-140*(1-t*t*t);
      ctx.fillStyle='#95eaff77';ctx.fillRect(-3,y-38,6,36);
      shard(0,y,10+4*t,31,'#67caff');
    }else{
      const u=clamp((z.age-ICE_FALL)/ICE_BURST,0,1),spread=Math.sqrt(u);
      ctx.globalAlpha=1-u;neonRing(8+52*spread,'#e6ffff',5*(1-u)+1);
      ctx.shadowBlur=12;
      for(let i=0;i<12;i++){
        ctx.save();ctx.rotate(i*TAU/12+z.x*.03);
        shard(0,10+(i%2?54:38)*spread,3+2*(1-u),11-5*u,i%2?'#a9f8ff':'#509aff');ctx.restore();
      }
      ctx.fillStyle='#f0ffff';ctx.fillRect(-13,-2,26,4);ctx.fillRect(-2,-13,4,26);
    }
    ctx.restore();
  }
}
function drawExpansionCast(p){
  ctx.save();ctx.translate(p.x,p.y);
  if(p.iceUntil>state.time){ctx.strokeStyle='#9fefff';ctx.lineWidth=3;ctx.strokeRect(-19,-19,38,38);shard(-18,12,4,9,'#65cfff');}
  for(const b of p.beam||[]){
    if(b.end<=state.time)continue;
    ctx.save();ctx.rotate(b.a);ctx.shadowColor='#28cfff';ctx.shadowBlur=20;
    const pulse=1+.18*Math.sin(state.time*90);
    for(const [w,c] of [[34,'#2189ff80'],[19,'#61eaff'],[7,'#ffffff']]){
      ctx.fillStyle=c;ctx.fillRect(8,-w*pulse/2,1092,w*pulse);
    }
    for(let i=0;i<7;i++){const x=(i*157+state.time*750)%1100;ctx.strokeStyle='#c9ffff';ctx.beginPath();ctx.ellipse(x,0,4,20*pulse,0,0,TAU);ctx.stroke();}
    ctx.restore();
  }
  if(p.plasma?.end>state.time){
    const r=p.plasma.r;ctx.save();
    if(p.plasma.flare?.end>state.time){
      const a=p.plasma.flare.a;ctx.shadowColor='#6affbe';ctx.shadowBlur=16;
      neonRing(r+3,'#efffff',6,a-.34,a+.34);
    }
    ctx.rotate(state.time*.9);
    ctx.fillStyle='#38efb010';ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();
    ctx.shadowColor='#36ffb4';ctx.shadowBlur=12;neonRing(r,'#a5ffdf',2);
    for(let i=0;i<8;i++){ctx.rotate(TAU/8);neonRing(r-4,'#38cfaf',3,0,.5);ctx.fillStyle='#ddffed';ctx.fillRect(r-3,-3,6,6);}
    ctx.restore();
  }
  const cast=p.cast,t=cast?(state.time-cast.born)/.65:1;
  if(t>=0 && t<1){
    ctx.save();const card=SPECIAL_CARDS.find(c=>c.id===cast.id);ctx.globalAlpha=1-t;
    ctx.shadowColor=card.color;ctx.shadowBlur=14;neonRing(20+t*(cast.id==='reverse'?240:60),card.color,3);
    if(cast.id==='activeHeal'){for(let i=0;i<5;i++){const x=(i-2)*11,y=-18-t*35+Math.sin(i)*5;ctx.fillStyle=card.color;ctx.fillRect(x-4,y-1,8,3);ctx.fillRect(x-1,y-4,3,8);}}
    ctx.restore();
  }
  if(state.stopUntil>state.time && p===state.player){
    ctx.shadowColor='#ffda74';ctx.shadowBlur=9;neonRing(58,'#ffc75f',2);
    for(let i=0;i<12;i++){ctx.rotate(TAU/12);ctx.fillStyle='#fff0ba';ctx.fillRect(50,-1,6,2);}
    ctx.rotate(-(state.stopUntil-state.time)*2);ctx.fillRect(26,-1,23,2);
  }
  ctx.restore();
}
