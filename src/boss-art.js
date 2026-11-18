'use strict';
function drawBossOmen(){
  const omen=state.bossOmen;
  if(!omen)return;
  const age=Math.max(0,state.time-omen.start);
  const worm=omen.kind==='worm',color=worm?'#46ffa5':omen.kind==='singular'?'#ffd265':'#ff477f';
  ctx.save();
  if(age<2.1 && omen.kind!=='singular'){
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
  const label=BOSS_NAMES[omen.kind]+' · '+Math.ceil(Math.max(0,state.bossSpawnTimer/rules.difficulty))+' s';
  ctx.globalAlpha=.95;ctx.textAlign='center';ctx.font='bold 13px system-ui';
  ctx.fillStyle='#10101b';ctx.shadowBlur=0;
  const top=mobileDevice?51:64,w=ctx.measureText(label).width+24;
  ctx.fillRect((W-w)/2,top,w,23);ctx.fillStyle=color;ctx.fillRect((W-w)/2,top,3,23);
  ctx.fillText(label,W/2,top+16);ctx.restore();
}

function drawWorm(b){
  const a=state.arena;
  for(const piece of b.pieces){
    const head=piece.parts[0];ctx.save();
    if(['exit','laneAim','pass'].includes(piece.mode)){
      for(let i=piece.lane;i<piece.lanes.length;i++){
        const lane=piece.lanes[i],next=i===piece.lane;
        if(next){
          ctx.fillStyle=piece.mode==='pass'?'#88ffce48':'#64ffb81c';
          if(piece.horizontal)ctx.fillRect(a.x,lane-piece.laneWidth/2,a.w,piece.laneWidth);
          else ctx.fillRect(lane-piece.laneWidth/2,a.y,piece.laneWidth,a.h);
        }
        ctx.strokeStyle=next?'#acffd4':'#2da777';ctx.globalAlpha=next?.86:.36;
        ctx.lineWidth=next?4:2;ctx.setLineDash(next?[26,7]:[8,13]);
        ctx.shadowColor='#38ff9e';ctx.shadowBlur=next?12:0;
        ctx.beginPath();ctx.moveTo(piece.horizontal?a.x:lane,piece.horizontal?lane:a.y);
        ctx.lineTo(piece.horizontal?a.x+a.w:lane,piece.horizontal?lane:a.y+a.h);ctx.stroke();
      }
    }
    ctx.restore();
    if(piece.mode==='pass')drawAirCut(piece);
    if(piece.mode==='laneAim')continue;
    ctx.save();
    if(piece.mode==='windup'){
      const distance=b.phase===2?365:700;
      ctx.strokeStyle=b.phase===2?'#ffdd76':'#aaffce';ctx.lineWidth=3;ctx.setLineDash([14,8]);
      ctx.beginPath();ctx.moveTo(head.x,head.y);ctx.lineTo(head.x+Math.cos(piece.heading)*distance,head.y+Math.sin(piece.heading)*distance);ctx.stroke();
      ctx.setLineDash([]);
    }
    for(let i=piece.parts.length-1;i>=0;i--){
      const s=piece.parts[i],r=s.size/2;
      ctx.save();ctx.translate(s.x,s.y);
      const next=piece.parts[i-1];
      ctx.rotate(next?Math.atan2(next.y-s.y,next.x-s.x):piece.heading);
      ctx.shadowColor='#29ff99';ctx.shadowBlur=i?6:15;
      ctx.fillStyle=s.hitFlash>0?'#edfff3':s.slowUntil>state.time?'#64cedd':i?'#105c45':'#147856';
      ctx.strokeStyle=piece.mode==='rest'?'#6eb598':'#52fba8';ctx.lineWidth=i?2:3;
      ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
      ctx.fillStyle=i?'#329d70':'#7dffc1';ctx.beginPath();ctx.moveTo(-r*.6,0);
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
function drawAirCut(piece){
  const band=airCutBounds(piece),horizontal=piece.horizontal;
  ctx.save();ctx.translate(band.x,band.y);ctx.fillStyle='#b2ffdf73';ctx.fillRect(0,0,band.w,band.h);
  const length=horizontal?band.w:band.h,width=piece.laneWidth;
  if(!horizontal)ctx.transform(0,1,1,0,0,0);
  ctx.shadowColor='#4effac';ctx.shadowBlur=10;
  for(let i=0;i<8;i++){
    const y=width*i/7;ctx.strokeStyle=i===0||i===7?'#ecfff7':'#8cfbc0';
    ctx.lineWidth=i===0||i===7?3:1;ctx.beginPath();ctx.moveTo(0,y);
    ctx.lineTo(length*.4,y+Math.sin(i)*4);ctx.lineTo(length,y);ctx.stroke();
  }
  ctx.restore();
}
