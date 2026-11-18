'use strict';
function cosmicPath(points,closed=false){
  ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
  if(closed)ctx.closePath();
}
function disk(x,y,r,color){
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
}
function accretionDisk(x,y,r,t){
  ctx.save();ctx.translate(x,y);ctx.rotate(-.22);
  ctx.shadowColor='#ffab31';ctx.shadowBlur=15;
  ctx.strokeStyle='#ed951e';ctx.lineWidth=r*.12;
  ctx.beginPath();ctx.ellipse(0,0,r*1.65,r*.37,0,0,TAU);ctx.stroke();
  disk(0,0,r,'#030309');
  ctx.lineWidth=2.2;ctx.strokeStyle='#fff2ba';ctx.stroke();
  ctx.shadowBlur=6;
  for(let i=0;i<3;i++){
    ctx.lineWidth=2+i;ctx.strokeStyle=['#fff6cd','#ffcf61','#d17e27'][i];
    ctx.beginPath();ctx.ellipse(0,0,r*(1.62-i*.1),r*(.37-i*.055),0,0,Math.PI);ctx.stroke();
  }
  for(let i=0;i<9;i++){
    const a=t*1.2+i*2.4;
    disk(Math.cos(a)*r*1.75,Math.sin(a)*r*.44,1.5,'#ffe7a0');
  }
  ctx.restore();
}
function drawSingular(b){
  ctx.save();
  for(const [i,s] of b.trail.entries()){
    const age=b.orbitTime-s.t;ctx.globalAlpha=clamp(1-age/1.65,0,1)*.75;
    disk(s.x+age*Math.sin(i*4)*17,s.y+age*21,2+3*(1-age/1.65),'#ffc753');
  }
  ctx.globalAlpha=1;
  for(const planet of b.planets){
    ctx.strokeStyle='#eec66729';ctx.lineWidth=1;ctx.beginPath();ctx.arc(b.x,b.y,planet.distance,0,TAU);ctx.stroke();
    ctx.shadowColor=planet.tint;ctx.shadowBlur=9;disk(planet.x,planet.y,planet.r,planet.tint);
    ctx.shadowBlur=0;ctx.strokeStyle='#553857';ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(planet.x,planet.y,planet.r*.94,planet.r*.32,-.35,0,Math.PI);ctx.stroke();
    for(const [i,tier] of planet.moons.entries()){
      const pos=moonPosition(planet,i,b.orbitTime);disk(pos.x,pos.y,3+tier*2,'#ffedce');
    }
  }
  const amp=b.state==='final'?9:b.state==='repel'?5:0,t=b.orbitTime;
  accretionDisk(b.x+amp*Math.sin(t*91),b.y+amp*Math.cos(t*113),b.size/2,t);
  if(b.state==='final'){
    ctx.setLineDash([8,6]);ctx.strokeStyle='#ffce70';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(b.x,b.y,165,0,TAU);ctx.stroke();
  }
  ctx.restore();
}
function drawCosmicWorld(){
  for(const r of state.cardRelics||[]){
    ctx.save();ctx.translate(r.x,r.y+3*Math.sin(state.time*3));ctx.rotate(-.12);
    ctx.shadowBlur=13;ctx.shadowColor='#ffdb77';ctx.fillStyle='#44314e';
    ctx.strokeStyle='#ffe69a';ctx.lineWidth=2;
    for(let i=-1;i<=1;i++){ctx.fillRect(i*4-9,i*3-12,18,24);ctx.strokeRect(i*4-9,i*3-12,18,24);}
    ctx.fillStyle='#fff4cc';ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.fillText('3',4,8);ctx.restore();
  }
  for(const z of state.cosmicZones||[]){
    ctx.save();const live=z.age>=z.windup;
    if(z.type==='well'){
      ctx.strokeStyle=live?'#ffb94896':'#ffd78755';ctx.lineWidth=2;ctx.setLineDash([8,8]);
      ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,TAU);ctx.stroke();ctx.setLineDash([]);
      accretionDisk(z.x,z.y,live?32:14+18*z.age/z.windup,z.age*2);
    }else if(z.type==='solar'){
      const pts=solarVertices(z);cosmicPath(pts,true);ctx.fillStyle=live?'#fff4abbc':'#ffbc3630';ctx.fill();
      ctx.lineWidth=live?5:2;ctx.strokeStyle='#ffe59a';ctx.stroke();
      if(live){
        ctx.shadowColor='#ffd84a';ctx.shadowBlur=20;
        const top=z.y-H/state.cam.zoom;
        cosmicPath([{x:z.x-14,y:top},{x:z.x+16,y:top},pts[1],pts[2]],true);
        ctx.fillStyle='#ffdc689c';ctx.fill();ctx.lineWidth=5;ctx.strokeStyle='#fff8bb';
        ctx.beginPath();ctx.moveTo(z.x,top);ctx.lineTo(z.x,z.y);ctx.stroke();
      }
    }else if(z.type==='beam'){
      ctx.lineJoin='round';ctx.lineCap='round';cosmicPath(z.points);
      ctx.strokeStyle=live?'#ffdb79':'#ffe29929';ctx.lineWidth=z.width+5;ctx.stroke();
      ctx.strokeStyle=live?'#080410':'#e8bb68';ctx.lineWidth=live?z.width:2;ctx.stroke();
      if(live){ctx.strokeStyle='#673b5b';ctx.lineWidth=2;ctx.stroke();}
    }else if(z.type==='nova'){
      const t=clamp(z.age/z.duration,0,1);
      ctx.globalAlpha=1-t;disk(z.x,z.y,z.r,'#ffe8a5');
      ctx.strokeStyle='#fffdf2';ctx.lineWidth=6;ctx.beginPath();ctx.arc(z.x,z.y,z.r*t,0,TAU);ctx.stroke();
    }
    ctx.restore();
  }
}
