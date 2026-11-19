'use strict';
function drawBossOmen(){
  const omen=state.bossOmen;
  if(!omen)return;
  const age=Math.max(0,state.time-omen.start);
  const worm=(omen.group||[omen.kind]).includes('worm'),color=worm?'#46ffa5':omen.kind==='singular'?'#ffd265':'#ff477f';
  ctx.save();
  const group=omen.group||[omen.kind];
  drawGroupOmen(group,age);
  if(age<2.1 && (group.includes('boss')||group.includes('worm'))){
    const t=age/2.1,x=-100+(W+200)*t,y=H*(.48-.13*Math.sin(t*Math.PI));
    ctx.shadowColor=color;ctx.shadowBlur=15;
    if(worm){
      for(let i=8;i>=0;i--){
        const xx=x-i*19,yy=y+Math.sin(age*7-i*.55)*13;
        ctx.fillStyle=i?'#167f59':color;ctx.strokeStyle='#a9ffce';ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(xx,yy,i?10:13,0,TAU);ctx.fill();ctx.stroke();
      }
    }else{
      for(let i=5;i>=0;i--){
        ctx.globalAlpha=i?.2/(i*.55):1;ctx.fillStyle=color;
        ctx.beginPath();ctx.arc(x-i*16,y+i*1.6,26-i,0,TAU);ctx.fill();
      }
      ctx.fillStyle='#ffe3ef';ctx.beginPath();ctx.arc(x-8,y-8,7,0,TAU);ctx.fill();
    }
  }
  const label=(group.length>1?(group.length===2?'ENCUENTRO DOBLE':group.length===3?'ENCUENTRO TRIPLE':'ENCUENTRO DE '+group.length+' JEFES')+' · ':'')+group.map(id=>BOSS_NAMES[id]).join(' + ')+' · '+Math.ceil(Math.max(0,state.bossSpawnTimer/rules.difficulty))+' s';
  ctx.globalAlpha=.95;ctx.textAlign='center';ctx.font='bold 13px system-ui';
  ctx.fillStyle='#10101b';ctx.shadowBlur=0;
  const top=mobileDevice?51:64,w=ctx.measureText(label).width+24;
  ctx.fillRect((W-w)/2,top,w,23);ctx.fillStyle=color;ctx.fillRect((W-w)/2,top,3,23);
  ctx.fillText(label,W/2,top+16,W-24);ctx.restore();
}

function drawWorm(b){
  const a=state.arena;
  for(const piece of b.pieces){
    const head=piece.parts[0];ctx.save();
    if(['exit','laneAim','pass'].includes(piece.mode)){
      drawLaneWarning(piece,a);
    }
    ctx.restore();
    if(piece.mode==='pass')drawAirCut(piece);
    if(piece.mode==='laneAim')continue;
    ctx.save();
    if(piece.mode==='windup'){
      const distance=b.phase===2?365:700;
      ctx.save();ctx.translate(head.x,head.y);ctx.rotate(piece.heading);
      const charge=clamp(1-piece.timer/(b.phase===2?.23:.65),0,1);
      const color=b.phase===2?'#ffd579':'#99ffd5';
      ctx.strokeStyle=color;ctx.lineWidth=1.5;
      ctx.setLineDash([10,12]);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(distance,0);ctx.stroke();ctx.setLineDash([]);
      for(let j=0;j<3;j++)flightChevron(64+j*28-22*charge,14-j*2,color);
      ctx.restore();
    }
    if(piece.mode==='rush'||piece.mode==='zigzag'){
      ctx.save();ctx.translate(head.x,head.y);ctx.rotate(piece.heading);
      const rush=piece.mode==='rush',length=rush?118:69;
      for(const side of [-1,1]){
        ctx.fillStyle=rush?'#a3ffe489':'#52ffac77';
        ctx.beginPath();ctx.moveTo(17,side*21);ctx.quadraticCurveTo(-23,side*47,-length,side*32);
        ctx.quadraticCurveTo(-29,side*35,17,side*21);ctx.fill();
      }
      ctx.restore();
    }
    for(let i=piece.parts.length-1;i>=0;i--){
      const s=piece.parts[i],r=s.size/2;
      if(Math.abs(s.x-state.cam.x)>W/(2*state.cam.zoom)+r+20 ||
          Math.abs(s.y-state.cam.y)>H/(2*state.cam.zoom)+r+20)continue;
      ctx.save();ctx.translate(s.x,s.y);
      const next=piece.parts[i-1];
      ctx.rotate(next?Math.atan2(next.y-s.y,next.x-s.x):piece.heading);
      ctx.shadowColor='#29ff99';ctx.shadowBlur=i?6:15;
      ctx.fillStyle=s.hitFlash>0?'#edfff3':s.slowUntil>state.time?'#64cedd':i?'#105c45':'#147856';
      ctx.strokeStyle=piece.mode==='rest'?'#6eb598':'#52fba8';ctx.lineWidth=i?2:3;
      ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
      const wave=.5+.5*Math.cos(piece.wave*(b.phase===2?19:9)-i*.68);
      ctx.fillStyle=piece.mode==='rest'?'#365b52':b.phase===2 && wave>.76?'#ffe398':
        piece.mode==='zigzag' && wave>.6?'#aeffe5':i?'#329d70':'#7dffc1';ctx.beginPath();ctx.moveTo(-r*.6,0);
      ctx.lineTo(0,-r*.52);ctx.lineTo(r*.35,0);ctx.lineTo(0,r*.52);ctx.closePath();ctx.fill();
      if(!i){
        ctx.fillStyle=piece.mode==='rest'?'#70af98':'#fff4a6';
        for(const side of [-1,1])ctx.fillRect(r*.32,side*r*.48,7,3);
      }
      if(s.hp<s.maxHp){ctx.strokeStyle='#f5e59d';ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(0,0,r+4,-Math.PI/2,-Math.PI/2+TAU*clamp(s.hp/s.maxHp,0,1));ctx.stroke();}
      ctx.restore();
    }
    ctx.restore();
  }
}
function flightChevron(x,r,color){
  ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();
  ctx.moveTo(x-r*.62,-r);ctx.lineTo(x,0);ctx.lineTo(x-r*.62,r);ctx.stroke();
}
function drawLaneWarning(piece,a){
  const horizontal=piece.horizontal,span=horizontal?a.w:a.h,half=piece.laneWidth/2;
  ctx.save();
  ctx.translate(a.x,a.y);if(!horizontal)ctx.transform(0,1,1,0,0,0);
  for(let i=piece.lane;i<piece.lanes.length;i++){
    const y=piece.lanes[i]-(horizontal?a.y:a.x),active=i===piece.lane;
    if(!active){
      ctx.strokeStyle='#4dc8a140';ctx.lineWidth=1;ctx.setLineDash([3,29]);
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(span,y);ctx.stroke();continue;
    }
    const charge=piece.mode==='laneAim'?clamp(1-piece.timer/.64,0,1):0;
    const haze=ctx.createLinearGradient(0,y-half,0,y+half);
    haze.addColorStop(0,'#5df5c43e');haze.addColorStop(.15,'#64eaba0d');
    haze.addColorStop(.85,'#64eaba0d');haze.addColorStop(1,'#5df5c43e');
    ctx.fillStyle=haze;ctx.fillRect(0,y-half,span,2*half);
    ctx.strokeStyle='#a8ffda';ctx.lineWidth=1.3;ctx.setLineDash([13,9]);
    ctx.lineDashOffset=(piece.forward?-1:1)*state.time*46;
    for(const side of [-1,1]){
      ctx.beginPath();ctx.moveTo(0,y+side*half);ctx.lineTo(span,y+side*half);ctx.stroke();
    }
    ctx.setLineDash([]);ctx.save();ctx.translate(piece.forward?0:span,y);ctx.scale(piece.forward?1:-1,1);
    for(let x=35;x<span;x+=140)flightChevron(x+charge*36,6+charge*3,'#a4fbd5b0');
    ctx.restore();
  }
  ctx.restore();
}
function drawAirCut(piece){
  const h=piece.parts[0],band=airCutBounds(piece),half=piece.laneWidth/2;
  const length=piece.horizontal?band.w:band.h;
  // Render in the direction of travel. Clip the wisps and the bow wave to the swept hit area.
  ctx.save();ctx.beginPath();ctx.rect(band.x,band.y,band.w,band.h);ctx.clip();
  ctx.translate(h.x,h.y);ctx.rotate(piece.heading);
  const mist=ctx.createLinearGradient(0,-half,0,half);
  for(const [stop,color] of [[0,'#c2ffe712'],[.12,'#8deec040'],[.46,'#81e4b909'],[.78,'#57dfb227'],[1,'#dcfff218']])mist.addColorStop(stop,color);
  ctx.fillStyle=mist;ctx.fillRect(-length,-half,length+30,2*half);
  const speedPhase=state.time*900;
  for(let i=0;i<14;i++){
    const u=((speedPhase+i*193)%530)/530;
    const x=-u*Math.min(length,1450),side=i%2?1:-1,y=side*(.32+.62*((i*7)%13)/12)*half;
    ctx.strokeStyle=i%3?'#a1ead89c':'#f1fff0c7';ctx.lineWidth=1+i%2;
    ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x-43,y+side*4,x-72-i*5,y+side*6);ctx.stroke();
  }
  for(let i=0;i<3;i++){
    const tip=22-i*25,spread=half*(.75+i*.11);
    ctx.strokeStyle=['#f0fff1','#a2ffe3a8','#72efce66'][i];ctx.lineWidth=3-i*.65;
    ctx.beginPath();ctx.moveTo(tip-95,-spread);
    ctx.bezierCurveTo(tip-17,-spread*.76,tip,-20,tip,0);
    ctx.bezierCurveTo(tip,20,tip-17,spread*.76,tip-95,spread);ctx.stroke();
  }
  ctx.restore();
}
