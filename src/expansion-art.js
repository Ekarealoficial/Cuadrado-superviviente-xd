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
// Screen-space fractures meet at the same instant as the simulation resumes.
function drawTimeFractures(){
  const end=state.stopUntil,left=end-state.time;
  if(!end || left<=-.18)return;
  const progress=clamp(1-left/Math.max(.01,end-(state.stopStarted||0)),0,1);
  const reach=.05+.95*progress,fade=clamp(1+left/.18,0,1);
  const short=Math.min(W,H);
  ctx.save();ctx.translate(W/2,H/2);
  ctx.fillStyle='#332649';ctx.globalAlpha=.12*fade;ctx.fillRect(-W/2,-H/2,W,H);
  ctx.globalAlpha=.65*fade;ctx.shadowColor='#ffc46b';ctx.shadowBlur=5;
  ctx.strokeStyle='#ffdf9a';ctx.lineWidth=1.35;ctx.beginPath();
  for(let ray=0;ray<8;ray++){
    const a=(ray+.31)*TAU/8,dx=Math.cos(a),dy=Math.sin(a);
    const edge=Math.min(W/(2*Math.abs(dx)),H/(2*Math.abs(dy)));
    let x=dx*edge,y=dy*edge;ctx.moveTo(x,y);
    for(let k=1;k<=8;k++){
      const t=k/8, ripple=Math.sin(k*12.3+ray*2.7)*Math.sin(Math.PI*t)*short*.05;
      const nx=dx*edge*(1-t)-dy*ripple,ny=dy*edge*(1-t)+dx*ripple;
      const fraction=clamp(8*reach-k+1,0,1);
      ctx.lineTo(x+(nx-x)*fraction,y+(ny-y)*fraction);
      if(fraction<1)break;
      if(k%3===2){
        ctx.lineTo(nx-dy*short*.036+dx*short*.025,ny+dx*short*.036+dy*short*.025);
        ctx.moveTo(nx,ny);
      }
      x=nx;y=ny;
    }
  }
  ctx.stroke();ctx.globalAlpha=fade;ctx.textAlign='center';
  ctx.font='bold 13px system-ui';ctx.fillStyle='#fff2c9';
  if(left>0)ctx.fillText(left.toFixed(1)+' s',0,-short*.12);
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
