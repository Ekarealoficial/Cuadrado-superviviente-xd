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
  ctx.save();ctx.scale(1,.86);
  for(let i=0;i<4;i++){
    ctx.strokeStyle=['#a14d187c','#ff982b','#ffeeb2','#d9ab68'][i];
    ctx.lineWidth=[r*.13,r*.060,2.4,1][i];ctx.beginPath();
    ctx.ellipse(0,0,r*(1.04+i*.04),r*(1.21+i*.025),0,Math.PI+.05,TAU-.05);ctx.stroke();
  }
  ctx.restore();disk(0,0,r,'#030309');
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
    const age=b.orbitTime-s.t;
    if(age>=1.65)continue;
    ctx.globalAlpha=clamp(1-age/1.65,0,1)*.75;
    disk(s.x+age*Math.sin(i*4)*17,s.y+age*21,2+3*(1-age/1.65),'#ffc753');
  }
  ctx.globalAlpha=1;
  for(const planet of b.planets){
    ctx.strokeStyle='#eec66729';ctx.lineWidth=1;ctx.beginPath();ctx.arc(b.x,b.y,planet.distance,0,TAU);ctx.stroke();
    ctx.shadowColor=planet.tint;ctx.shadowBlur=9;disk(planet.x,planet.y,planet.r,planet.tint);
    ctx.shadowBlur=0;
    const night=ctx.createRadialGradient(planet.x-planet.r*.48,planet.y-planet.r*.42,1,planet.x,planet.y,planet.r);
    night.addColorStop(0,'#ffffe19c');night.addColorStop(.6,'#19223e19');night.addColorStop(1,'#160f38bf');disk(planet.x,planet.y,planet.r,night);
    ctx.strokeStyle='#dec5beab';ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(planet.x,planet.y,planet.r*.94,planet.r*.32,-.35,0,Math.PI);ctx.stroke();
    if(planet.moons.length){
      ctx.strokeStyle=planet.tint;ctx.lineWidth=1.4;ctx.beginPath();
      ctx.arc(planet.x,planet.y,planet.r+15,b.orbitTime*3,b.orbitTime*3+TAU*.82);ctx.stroke();
    }
    for(const [i,tier] of planet.moons.entries()){
      const pos=moonPosition(planet,i,b.orbitTime);disk(pos.x,pos.y,3+tier*2,'#ffedce');
    }
  }
  if(b.state==='attract')drawGravityStreams(b.x,b.y,b.size*.99,b.orbitTime*1.4,'#ffc36d9e',5);
  if(b.state==='repel'||b.state==='final'){
    const final=b.state==='final',charge=clamp(1-b.timer/(final?2.1:.58),0,1);
    for(let i=0;i<10;i++){
      const a=i*TAU/10+b.orbitTime*.7,r=b.size*(.83+.12*Math.sin(charge*15+i));
      ctx.strokeStyle=final?'#ff886e':'#ffe8ad';ctx.lineWidth=2;ctx.beginPath();
      ctx.moveTo(b.x+r*Math.cos(a),b.y+r*Math.sin(a));
      ctx.lineTo(b.x+(r+9+charge*19)*Math.cos(a),b.y+(r+9+charge*19)*Math.sin(a));ctx.stroke();
    }
  }
  const amp=b.state==='final'?9:b.state==='repel'?5:0,t=b.orbitTime;
  const scale=b.state==='compress'?b.timer/.15:b.state==='blink'?clamp((1.12-b.timer)/.13,.035,1):b.state==='final'?clamp(b.timer/.5,.025,1):1;
  accretionDisk(b.x+amp*Math.sin(t*91),b.y+amp*Math.cos(t*113),b.size/2*Math.max(.015,scale),b.state==='final'?t*6:t);
  if(b.state==='compress')drawInfall(b.x,b.y,100,1-scale,20);
  if(b.state==='final' && b.timer<.5){ctx.strokeStyle='#fffadc';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(b.x,b.y,132*scale,28*scale,-.22,0,TAU);ctx.stroke();}
  if(b.state==='final'){
    const white=clamp(1-b.timer/.5,0,1);
    ctx.save();ctx.translate(b.x,b.y);ctx.rotate(-.22);
    for(let j=0;j<4;j++){ctx.strokeStyle=white>.2?'#fff8de':'#ffc66b';ctx.lineWidth=2+j;const k=(.2+j*.22)*scale;
      ctx.beginPath();ctx.ellipse(0,0,126*k,29*k,t*(.25+j*.1),t*13+j,t*13+j+3.7);ctx.stroke();}
    ctx.restore();
  }
  ctx.restore();
}
function drawCosmicWorld(){
  for(const r of state.cardRelics||[]){
    ctx.save();ctx.translate(r.x,r.y+3*Math.sin(state.time*3));ctx.rotate(-.12);
    ctx.shadowBlur=13;ctx.shadowColor='#ffdb77';ctx.fillStyle='#44314e';
    ctx.strokeStyle='#ffe69a';ctx.lineWidth=2;
    for(let i=-1;i<=1;i++){ctx.fillRect(i*4-9,i*3-12,18,24);ctx.strokeRect(i*4-9,i*3-12,18,24);}
    ctx.fillStyle='#fff4cc';ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.fillText('★',4,8);ctx.restore();
  }
  for(const cue of state.bossCues||[])drawSingularCue(cue,state.time-cue.time);
  for(const z of state.cosmicZones||[]){
    ctx.save();const live=z.age>=z.windup;
    if(z.type==='well'){
      drawHostileWell(z);
    }else if(z.type==='solar'){
      const pts=solarVertices(z);cosmicPath(pts,true);ctx.fillStyle=live?'#fff4abbc':'#ffbc3630';ctx.fill();
      ctx.lineWidth=live?5:2;ctx.strokeStyle='#ffe59a';ctx.stroke();
      const charge=clamp(z.age/z.windup,0,1);
      for(const v of pts){
        ctx.strokeStyle='#fff1be';ctx.lineWidth=2;ctx.beginPath();
        ctx.moveTo(v.x,v.y);ctx.lineTo(z.x+(v.x-z.x)*(1-charge*.6),z.y+(v.y-z.y)*(1-charge*.6));ctx.stroke();
      }
      if(live){
        const impact=clamp((z.age-z.windup)/(z.duration-z.windup),0,1);
        ctx.save();ctx.globalAlpha=1-impact;ctx.shadowColor='#ffbd32';ctx.shadowBlur=13;
        const height=H/viewZoom()+110,beam=ctx.createLinearGradient(z.x-20,0,z.x+20,0);
        beam.addColorStop(0,'#ff9b2600');beam.addColorStop(.38,'#ffcf46');beam.addColorStop(.52,'#ffffe5');beam.addColorStop(1,'#ff9b2600');
        ctx.fillStyle=beam;ctx.fillRect(z.x-20,z.y-height,40,height);
        for(let i=0;i<10;i++){
          const a=i*TAU/10+z.angle,length=(24+impact*68)*(i%2?.8:1.1);
          ctx.strokeStyle=i%2?'#ffa647':'#fff4af';ctx.lineWidth=2;ctx.beginPath();
          ctx.moveTo(z.x+Math.cos(a)*length*.54,z.y+Math.sin(a)*length*.54);ctx.lineTo(z.x+Math.cos(a)*length,z.y+Math.sin(a)*length);ctx.stroke();
        }ctx.restore();
      }
    }else if(z.type==='beam'){
      drawVoidBeam(z);
    }else if(z.type==='nova'){
      const t=clamp(z.age/z.duration,0,1);
      orbitalBlast(z.x,z.y,z.r,t,48);
      ctx.globalAlpha=1-t;const glow=ctx.createRadialGradient(z.x,z.y,1,z.x,z.y,z.r);
      glow.addColorStop(0,'#fffbe0');glow.addColorStop(.22,'#ffc057');glow.addColorStop(.83,'#e05b3433');glow.addColorStop(1,'#ffdd8922');disk(z.x,z.y,z.r,glow);
      for(let i=0;i<18;i++){
        const a=i*TAU/18,rad=z.r*Math.sqrt(t);ctx.strokeStyle=i%2?'#ffe5a4':'#fe9851';ctx.lineWidth=i%3+1;
        ctx.beginPath();ctx.moveTo(z.x+rad*.57*Math.cos(a),z.y+rad*.57*Math.sin(a));
        ctx.lineTo(z.x+rad*Math.cos(a),z.y+rad*Math.sin(a));ctx.stroke();
      }
      ctx.strokeStyle='#fffdf2';ctx.lineWidth=6;ctx.beginPath();ctx.arc(z.x,z.y,z.r*t,0,TAU);ctx.stroke();
    }
    ctx.restore();
  }
}

function drawGravityStreams(x,y,r,t,color,arms){
  ctx.save();ctx.translate(x,y);ctx.strokeStyle=color;ctx.lineWidth=1.6;
  for(let i=0;i<arms;i++){
    ctx.beginPath();
    for(let j=0;j<=18;j++){
      const u=j/18,rad=r*(1-.67*u),a=TAU*i/arms+t+u*u*1.6;
      const px=rad*Math.cos(a),py=rad*Math.sin(a)*.77;
      if(j)ctx.lineTo(px,py);else ctx.moveTo(px,py);
    }
    ctx.stroke();
  }
  ctx.restore();
}
function drawSingularCue(cue,age){
  const t=clamp(age/.54,0,1);
  if(t>=1)return;
  ctx.save();ctx.translate(cue.x,cue.y);ctx.globalAlpha=1-t;
  if(cue.name==='voidBlink'){
    if(t>.27 && t<.48)disk(0,0,9*(1-t),'#fff');
  }else if(cue.name==='massEject'||cue.name==='lunarVolley'||cue.name==='orbitRise'){
    const lunar=cue.name==='lunarVolley';
    ctx.strokeStyle=lunar?'#d2cbff':'#ffdc8e';ctx.lineWidth=4*(1-t)+1;
    for(let i=0;i<8;i++){
      const a=i*TAU/8+.18;ctx.beginPath();ctx.arc(0,0,75+Math.sqrt(t)*(lunar?165:196),a,a+.45);ctx.stroke();
    }
  }else if(cue.name==='wormBreak'||cue.name==='wormRest'){
    const split=cue.name==='wormBreak';ctx.fillStyle=split?'#bbffe0':'#8dbaa9';
    for(let i=0;i<8;i++){
      ctx.save();ctx.rotate(i*TAU/8);ctx.translate(25+t*(split?64:30),0);
      ctx.beginPath();ctx.moveTo(5,0);ctx.lineTo(-9,-2);ctx.lineTo(-3,3);ctx.fill();ctx.restore();
    }
  }
  ctx.restore();
}

function drawInfall(x,y,r,t,count){
  for(let i=0;i<count;i++){
    const u=(i*.618+t)%1,a=i*2.4+t*3+u*2,d=(1-u)*r;
    const px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;
    ctx.fillStyle=['#ffce63','#ff934b','#fff1bc'][i%3];
    if(i%2)ctx.fillRect(px-2,py-2,4,4);else disk(px,py,2,ctx.fillStyle);
  }
}
function orbitalBlast(x,y,r,t,count){
  ctx.save();ctx.translate(x,y);ctx.globalAlpha=1-t;
  for(let i=0;i<count;i++){
    const a=i*2.39996+Math.sin(i)*t*.42,d=r*(.46+.52*(i*.618%1))*Math.sqrt(t);
    ctx.save();ctx.rotate(a);ctx.translate(d,0);ctx.rotate(i+t*5);
    ctx.fillStyle=i%3?'#ffc357':'#fff8db';ctx.fillRect(-2,-2,3+i%6,2+i%4);ctx.restore();
  }
  for(let i=0;i<3;i++){ctx.strokeStyle=['#fff3ca','#ffbf58','#ff8939'][i];ctx.lineWidth=1+(1-t)*(4-i);
    ctx.beginPath();ctx.arc(0,0,Math.max(.01,r*(1-.18*i)*Math.sqrt(t)),0,TAU);ctx.stroke();}
  if(t<.18)disk(0,0,25*(1-t/.18),'#fffbe9');ctx.restore();
}
function drawHostileWell(z){
  if(z.age>=z.off){orbitalBlast(z.x,z.y,z.r,(z.age-z.off)/(z.duration-z.off),42);return;}
  const charge=clamp((z.age-(z.off??z.duration)+.4)/.4,0,1),born=clamp(z.age/z.windup,.02,1),t=z.age+charge*1.25;
  ctx.lineWidth=1;ctx.strokeStyle='#d2974b64';ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,TAU);ctx.stroke();
  for(let i=0;i<8;i++){
    const a=i*TAU/8+t*(i%2?.8:-.55);
    ctx.globalAlpha=.25+.7*Math.abs(Math.sin(t*3+i));ctx.strokeStyle=i%2?'#ffdb85':'#ff963c';ctx.lineWidth=2+i%3;
    ctx.beginPath();ctx.arc(z.x,z.y,z.r*(.87+.11*(i%2))*(1-charge*.67),a,a+.46);ctx.stroke();
  }
  ctx.globalAlpha=1;drawGravityStreams(z.x,z.y,z.r*.84,t*2,'#d68c488e',3);
  drawInfall(z.x,z.y,z.r,t,30);
  accretionDisk(z.x+Math.sin(t*98)*charge*4,z.y,32*born*(1-charge*.92),t*3);
  if(charge>.4)disk(z.x,z.y,3+Math.abs(Math.sin(t*75))*5,'#fff');
}
function drawVoidBeam(z){
  const p=z.points,active=z.age>=z.windup && z.age<(z.off??z.duration),fade=z.off==null?0:clamp((z.age-z.off)/(z.duration-z.off),0,1);
  ctx.lineJoin=ctx.lineCap='round';ctx.globalAlpha=1-fade;cosmicPath(p);
  if(z.age<z.windup){
    ctx.strokeStyle='#f4d281';ctx.lineWidth=2;ctx.stroke();
    drawInfall(p[0].x,p[0].y,105,z.age*2,22);return;
  }
  for(const [w,color] of [[z.width+19,'#55288377'],[z.width+6,'#ba803f99'],[z.width,'#ffdc7a'],[z.width-7,active?'#10091b':'#764c7d']]){
    ctx.strokeStyle=color;ctx.lineWidth=w*(1-fade*.98);ctx.stroke();
  }
  for(let i=1;i<p.length;i++){
    const a=p[i-1],b=p[i],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
    for(let j=0;j<3;j++){
      ctx.strokeStyle=j?'#a479e2':'#fff2c8';ctx.lineWidth=j?1:2;ctx.beginPath();
      for(let k=0;k<=8;k++){const u=k/8,w=Math.sin(u*Math.PI)*Math.sin(z.age*38+i+j*2+u*9)*(12+j*6);
        const x=a.x+dx*u-dy/len*w,y=a.y+dy*u+dx/len*w;if(k)ctx.lineTo(x,y);else ctx.moveTo(x,y);}
      ctx.stroke();
    }
    const u=(z.age*4+i*.31)%1;disk(a.x+dx*u,a.y+dy*u,3,'#fffbea');
    disk(a.x,a.y,4+3*Math.sin(z.age*26+i),'#dbb3ff');
    if(fade)drawInfall(a.x,a.y,32,fade,7);
  }
  const pulse=clamp((z.age-z.windup)/.2,0,1);
  if(pulse<1)orbitalBlast(p[0].x,p[0].y,80,pulse,12);
}
