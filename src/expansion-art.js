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
function drawExpansionWorld(){
  if(state.stopUntil>state.time){
    const cam=state.cam,w=W/cam.zoom,h=H/cam.zoom;
    ctx.save();ctx.translate(cam.x-w/2,cam.y-h/2);ctx.fillStyle='#29244c38';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#e3cc7950';ctx.lineWidth=1.5;
    for(let i=0;i<8;i++){
      const x=w*((i*.618+.12)%1),y=i%2?h:0,dir=i%2?-1:1;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+13,y+dir*25);
      ctx.lineTo(x+7,y+dir*37);ctx.lineTo(x+32,y+dir*68);ctx.stroke();
    }
    ctx.restore();
  }
  for(const z of state.iceZones||[]){
    ctx.save();ctx.translate(z.x,z.y);const t=Math.min(z.age/2,1);
    ctx.fillStyle='#43afff25';ctx.beginPath();ctx.arc(0,0,45,0,TAU);ctx.fill();
    ctx.shadowColor='#6adaff';ctx.shadowBlur=10;neonRing(45,'#76ceff',2);
    neonRing(45-31*t,'#dcffff',2,-Math.PI/2,-Math.PI/2+TAU*t);
    if(t>.65)shard(0,-Math.max(0,2-z.age)*150,8+6*t,30,'#67caff');
    if(t===1){for(let i=0;i<6;i++){ctx.rotate(TAU/6);shard(0,22+(z.age-2)*48,3,9,'#a4edff');}}
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
