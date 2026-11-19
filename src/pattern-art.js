'use strict';
function strokeRing(x,y,r,color,width,start=0,end=TAU){
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.arc(x,y,Math.max(.01,r),start,end);ctx.stroke();
}
function etchedSquare(r,angle,color,width){
  ctx.save();ctx.rotate(angle);ctx.lineWidth=width;ctx.strokeStyle=color;ctx.strokeRect(-r,-r,r*2,r*2);ctx.restore();
}
function patternSilhouette(kind,size,phase,t,death=0,phaseMix=1,hideHands=false){
  const r=size/2,ink=PATTERN_BOSSES[kind].color;
  ctx.shadowColor=ink;ctx.shadowBlur=8;
  if(kind==='fractal'){
    ctx.fillStyle='#110a19';ctx.fillRect(-r,-r,size,size);etchedSquare(r,0,ink,4);
    for(let i=0;i<4;i++){
      ctx.save();ctx.rotate(i*Math.PI/2);ctx.strokeStyle='#fff0f9';ctx.lineWidth=5;ctx.beginPath();
      ctx.moveTo(-r+17,-r);ctx.lineTo(-r,-r);ctx.lineTo(-r,-r+17);ctx.stroke();ctx.restore();
    }
    for(let i=0;i<3;i++){ctx.save();const a=t*(i%2?-.9:1.1)+i*2.09;
      if(phase>=2)ctx.translate(Math.cos(a)*r*.64*phaseMix,Math.sin(a)*r*.64*phaseMix);
      etchedSquare(r*(.60-i*.16),a+(phase===3?.15*Math.sin(t*9+i):0),i%2?'#fff1ff':ink,2+i);ctx.restore();}
  }else if(kind==='clock'){
    disk(0,0,r,phase===3?'#66502a':'#142244');
    for(let i=0;i<3;i++){strokeRing(0,0,r*(1-i*.13),i===1?'#8aa4d7':ink,i===1?2:4,t*.3*i,t*.3*i+TAU-.10*i);}
    for(let i=0;i<12;i++){
      ctx.save();ctx.rotate(i*TAU/12+(phase>1?t*.46:0));
      ctx.fillStyle=i%3?'#e6b758':'#fff6d6';const orbit=(r-7+(phase>1?21*phaseMix:0))*(1-death);
      ctx.fillRect(orbit-4,-3,9,6);ctx.restore();
    }
    if(!hideHands)for(let i=0;i<2;i++){ctx.save();ctx.rotate((i?-.57:1.38)*t+i);ctx.fillStyle=i?'#fff3b3':ink;ctx.fillRect(-7,-3,r*(i?.55:.83),6);ctx.restore();}
    disk(0,0,7,'#ffecb6');
  }else{
    strokeRing(0,0,r,phase===3?'#ff89da':'#c494ff',7);
    strokeRing(0,0,r-6,'#fff3ff',2);
    if(phase>=2)for(let i=0;i<4;i++)strokeRing(0,0,r*.77,'#ddc7ff',4,i*Math.PI/2-t,i*Math.PI/2+1.1-t);
    if(Math.sin(t*3)>.3){ctx.strokeStyle='#e5b6ff82';ctx.lineWidth=1;
      for(let i=0;i<3;i++){const a=t+i*2.1;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.74,Math.sin(a)*r*.74);ctx.lineTo(Math.cos(a+2.4)*r*.74,Math.sin(a+2.4)*r*.74);ctx.stroke();}}
  }
}
function drawPatternBoss(b){
  const t=b.clock,m=b.state,age=b.age;
  ctx.save();
  for(const s of patternShapes(b)){
    const ink=m==='refraction'?'#bd8bff':m==='link'?'#f4c9ff':b.color;
    ctx.save();ctx.strokeStyle=ink;ctx.fillStyle=s.live?ink+'90':b.color+'20';ctx.lineWidth=s.live?4:1.6;
    if(s.kind==='line'){
      ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.xx,s.yy);ctx.strokeStyle=ink+'41';ctx.lineWidth=s.width;ctx.stroke();
      if((b.kind==='beacon'||m==='link')&&s.live){ctx.strokeStyle=ink+'24';ctx.lineWidth=s.width*1.5;ctx.stroke();}
      ctx.lineWidth=s.live?s.width*.78:2;ctx.strokeStyle=ink;ctx.stroke();
      if(s.live){ctx.lineWidth=s.width*.27;ctx.strokeStyle='#fff8ff';ctx.stroke();for(let i=0,n=b.kind==='beacon'||m==='link'?5:1;i<n;i++){
          const u=(t*1.3+i/n)%1;disk(s.x+(s.xx-s.x)*u,s.y+(s.yy-s.y)*u,2.2,'#fff');}}
    }else if(s.kind==='sector')strokeRing(s.x,s.y,s.r,ink,s.live?s.width:2,s.from,s.to);
    else if(s.kind==='arc')strokeRing(s.x,s.y,s.r,b.color,s.live?s.width:2,s.angle+s.gap,s.angle+TAU-s.gap);
    else if(s.kind==='box'){ctx.fillRect(s.x-s.r,s.y-s.r,2*s.r,2*s.r);ctx.strokeRect(s.x-s.r,s.y-s.r,s.r*2,s.r*2);}
    else{disk(s.x,s.y,s.r,ctx.fillStyle);strokeRing(s.x,s.y,s.r,b.color,2);
      const a=(s.progress??(age-s.index*.09))*TAU;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x+Math.cos(a)*s.r,s.y+Math.sin(a)*s.r);ctx.stroke();}
    ctx.restore();
  }
  drawArenaEvents(b);
  if(m==='final'){drawLastSequence(b);ctx.restore();return;}
  if(ENCOUNTER_SPECS[b.kind]){drawEncounter(b);ctx.restore();return;}
  if(m==='lunge'){
    const pts=Array.from({length:27},(_,i)=>motionPoint(b,i/26));
    if(pts.length){ctx.strokeStyle=b.color+'aa';ctx.lineWidth=2;ctx.setLineDash([6,6]);cosmicPath(pts);ctx.stroke();ctx.setLineDash([]);}
  }
  if(b.overlap==='replicas')for(let i=0;i<b.marks.length;i++){const q=replicaPoint(b,i);ctx.save();ctx.globalAlpha=.4;ctx.translate(q.x,q.y);patternSilhouette('fractal',54,1,t-i);ctx.restore();}
  if(m==='stars')for(const [i,q] of b.marks.entries()){const out=clamp((age-3.55-i*.04)*5,0,1);ctx.globalAlpha=1-out;strokeRing(q.x,q.y,12+7*out,b.color,2);disk(q.x,q.y,3,'#fff');}ctx.globalAlpha=1;
  if(m==='collapse' && b.timer<.8){const u=clamp(1-b.timer/.8,0,1);ctx.save();ctx.translate(b.x,b.y);
    for(let i=0;i<4;i++)etchedSquare(8+(70+i*37)*(1-u),u*.18,b.color,2);
    if(u>.5)strokeRing(0,0,(u-.5)*580,'#ffb2e6',4);ctx.restore();}
  if(m==='petals' && b.beat===3){const a=state.arena;ctx.fillStyle='#f6c9ff';ctx.fillRect(a.x,a.y+23,a.w,3);}
  if(b.kind==='fractal')for(const q of b.trail){const u=1-(t-q.t)/.45;if(u<=0)continue;ctx.globalAlpha=u*.18;ctx.strokeStyle=b.color;ctx.strokeRect(q.x-48,q.y-48,96,96);}ctx.globalAlpha=1;
  ctx.save();ctx.translate(b.x,b.y);
  if(m==='pendulum'||m==='rewind'){
    const rail=b.events?.find(e=>e.kind==='rail'&&age>=e.on&&age<=e.end);
    if(rail){ctx.rotate(b.angle||0);ctx.scale(1.16,.89);ctx.rotate(-(b.angle||0));}
  }
  const charge=m==='transition'||m==='chime'&&age<1.2||m==='flower'&&age<1.5;
  if(charge){const k=1+.045*Math.sin(t*42);ctx.scale(k,k);strokeRing(0,0,b.size*.66,b.color,3);}
  const beat=clamp(1-(t-(b.lastBeat??-1))/.18,0,1);
  if(beat)ctx.scale(1+beat*.035,1-beat*.027);
  patternSilhouette(b.kind,b.size,b.phase,charge?t*4:t,0,m==='transition'?clamp(age/(b.kind==='fractal'?1.5:1),0,1):1);
  if(b.phase===3 && b.kind!=='crown'){
    ctx.strokeStyle=b.kind==='clock'?'#fff2bd':'#ffecff';ctx.lineWidth=2;
    for(let i=0;i<3;i++){const r=b.size*.42;ctx.save();ctx.rotate(i*TAU/3+.2);ctx.beginPath();ctx.moveTo(r,0);ctx.lineTo(r*.69,5);ctx.lineTo(r*.56,-3);ctx.lineTo(r*.35,7);ctx.stroke();ctx.restore();}
  }
  if(m==='inverse'&&age>=2.4&&age<2.9 || m==='petals'&&b.beat===3)strokeRing(0,0,b.size/2+5,'#fff',5);
  if(beat)strokeRing(0,0,b.size*(.52+.18*(1-beat)),b.color,beat*3);

  if(b.hitFlash>0){ctx.strokeStyle='#fff';ctx.lineWidth=5;if(b.kind==='fractal')ctx.strokeRect(-81,-81,162,162);else strokeRing(0,0,b.size/2,'#fff',5);}
  if(m==='lunge'&&age>.94){for(let i=0;i<4;i++){ctx.save();ctx.rotate(i*TAU/4);ctx.translate(65+34*Math.sin((age-.94)*7),0);etchedSquare(18,t,b.color,3);ctx.restore();}}
  ctx.restore();
  if(b.kind==='crown')for(let i=0,n=b.phase===1?8:12;i<n;i++){const q=orbitNode(b,i,n,t),s=m==='flower'?clamp(1-age/1.5,.04,1):1;
    const x=b.x+(q.x-b.x)*s,y=b.y+(q.y-b.y)*s;strokeRing(x,y,8,'#fff6ff',2);disk(x,y,4,b.color);}
  ctx.restore();
}
function drawGroupBars(x,y,w){
  const bosses=livingBosses(),cols=w<200?1:2,cell=w/cols;
  ctx.save();ctx.font='bold 10px system-ui';ctx.textAlign='left';ctx.textBaseline='top';
  bosses.forEach((b,i)=>{
    const xx=x+i%cols*cell,yy=y+Math.floor(i/cols)*19;
    ctx.fillStyle='#101221e8';ctx.fillRect(xx,yy,cell-2,18);
    ctx.fillStyle=b.color;ctx.fillText(BOSS_NAMES[b.kind]+' · F'+b.phase,xx+4,yy+1,cell-8);
    ctx.fillRect(xx+3,yy+14,(cell-8)*clamp(b.hp/b.maxHp,0,1),2);
  });ctx.restore();
}
function drawGroupOmen(group,age){
  const left=Math.max(0,state.bossSpawnTimer/rules.difficulty);
  for(const [j,kind] of group.entries()){
    if(ENCOUNTER_SPECS[kind]){drawEncounterOmen(kind,left,age,j);continue;}
    const spec=PATTERN_BOSSES[kind];if(!spec)continue;
    ctx.save();ctx.strokeStyle=spec.color;ctx.lineWidth=2;
    for(let i=0;i<7;i++){
      const t=(age*(.55+(20-left)*.04)+i*.67)%1,cycle=Math.floor(age*.6+i*.67);
      const x=W*(.5+.44*Math.sin(cycle*7.3+i*8+j)),y=H*(.5+.42*Math.sin(cycle*5.8+i*2+j));
      ctx.save();ctx.translate(x,y);ctx.globalAlpha=(1-t)*.8;
      if(kind==='fractal')for(let k=0;k<4;k++){ctx.rotate(Math.PI/2);ctx.strokeRect(t*20,t*20,8,8);}
      else{strokeRing(0,0,7+t*23,spec.color,1.5);if(kind==='clock'){ctx.rotate(t*TAU);ctx.fillStyle=spec.color;ctx.fillRect(0,0,17,2);}
        else for(let k=0;k<8;k++){ctx.rotate(TAU/8);disk(12+t*25,0,2,spec.color);}}
      ctx.restore();
    }
    if(left<(kind==='clock'?5:3)){
      const r=8+left*32;ctx.translate(W*(.5+(group.length>1?.27*Math.cos(j*TAU/group.length):0)),H*.48);
      if(kind==='fractal')etchedSquare(r,age*.4,spec.color,3);
      else{strokeRing(0,0,r,spec.color,3);if(kind==='clock'){for(let i=0;i<12;i++){ctx.rotate(TAU/12);ctx.fillStyle=spec.color;ctx.fillRect(r-4,0,8,4);}ctx.rotate(age*8);ctx.fillRect(0,-2,r,4);}}
    }ctx.restore();
  }
}

function drawBossRemnants(){
  for(const z of state.remnants||[]){
    const t=clamp((state.time-z.born)/2,0,1);
    ctx.save();ctx.translate(z.x,z.y);ctx.globalAlpha=(1-t)**2;
    const count=z.kind==='clock'?12:48;
    for(let i=0;i<count;i++){
      const a=i*TAU/count+(z.kind==='fractal'?.15*Math.sin(i):0);
      const r=(37+Math.sqrt(t)*180)*(z.kind==='crown'?.58+.4*Math.cos(a*8):.8+.2*Math.sin(i*17));
      ctx.save();ctx.rotate(a);ctx.translate(r,0);ctx.rotate(i+t*(i%2?3:-2));
      if(z.kind==='crown')disk(0,0,2+i%4,i%3?z.color:'#fff');
      else{ctx.fillStyle=i%3?z.color:'#fff';ctx.fillRect(-3,-3,z.kind==='fractal'?6:14,5);}
      ctx.restore();
    }
    if(t<.6){
      ctx.globalAlpha=(1-t/.6)*.88;
      if(['fractal','monolith','twins'].includes(z.kind))for(let i=0;i<3;i++)etchedSquare(18+t*(380+130*i),0,i%2?z.color:'#fff',3);
      if(z.kind==='crown')for(let i=0;i<12;i++){const a=i*TAU/12;strokeRing(80*t*Math.cos(a),80*t*Math.sin(a),12+135*t,i%2?z.color:'#fff',3);}
      if(z.kind==='clock')for(let i=0;i<12;i++){const p=polarPoint({x:0,y:0},100,i*TAU/12);strokeRing(p.x,p.y,4+t*41,'#fff1ac',2);}
    }
    if(t<.35)strokeRing(0,0,22+t*630,z.color,3);ctx.restore();
  }
}
