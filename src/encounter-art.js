'use strict';
function panelSquare(r,ink,angle=0){
  ctx.save();ctx.rotate(angle);ctx.fillStyle='#10101d';ctx.fillRect(-r,-r,2*r,2*r);
  etchedSquare(r,0,ink,3);etchedSquare(r-5,0,ink+'72',1);ctx.restore();
}
function energyLine(p,q,color,width=2){
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
}
function componentArt(q,t,survivor){
  const r=q.size/2;
  ctx.save();ctx.translate(q.x,q.y);
  if(q.role==='Negativo'){
    disk(0,0,r,'#0a1826');
    for(let i=0;i<3;i++)strokeRing(0,0,r-i*7,q.color,3,t*(i%2?1:-1)+i,t*(i%2?1:-1)+i+TAU-.3);
    strokeRing(0,0,13,'#fff',3);
  }else{
    panelSquare(r,q.color,.06*Math.sin(t));
    if(q.role==='Positivo'){
      ctx.fillStyle='#fff5db';ctx.fillRect(-11,-11,22,22);
      for(let i=0;i<4;i++){ctx.save();ctx.rotate(t+i*TAU/4);ctx.fillStyle=q.color;ctx.fillRect(r+5,-4,8,8);ctx.restore();}
    }else{
      const i=q.index;etchedSquare(r*.64,t*(i%2?-1:1),q.color,2);
      for(let j=0;j<=i;j++) {ctx.fillStyle='#fff';ctx.fillRect(-3+(j-i/2)*6,-2,4,4);}
    }
  }
  if(survivor)strokeRing(0,0,r+9,'#fff4cd',2,t,t+5.3);
  ctx.fillStyle='#141422';ctx.fillRect(-r,r+10,q.size,4);ctx.fillStyle=q.color;ctx.fillRect(-r,r+10,q.size*clamp(q.hp/q.maxHp,0,1),4);
  ctx.restore();
}
function encounterBody(b,t,scale=1){
  const r=b.size/2,c=b.color;ctx.save();ctx.translate(b.x,b.y);ctx.scale(scale,scale);
  if(b.kind==='beacon'){
    panelSquare(r,'#bd66ff');etchedSquare(r-9,0,c,4);
    if(b.phase>=3)for(let i=0;i<8;i++){
      const v=(t*.72+i*.618)%1,q=polarPoint({x:0,y:0},r*(1.04+.43*v),i*2.4);
      ctx.fillStyle='#ff637f';ctx.globalAlpha=1-v;ctx.fillRect(q.x,q.y,4,4);
    }
    ctx.globalAlpha=1;
    for(let i=0;i<4;i++){ctx.save();ctx.rotate(i*Math.PI/2);energyLine({x:r-20,y:-r+12},{x:r-12,y:-r+20},'#ffaece',3);ctx.restore();}
    const aperture=35+4*Math.sin(3*t)+Math.max(0,b.phase-1)*2;
    for(let i=0;i<4;i++)strokeRing(0,0,aperture+i*7,i%2?c:'#fff2ff',i===0?6:2,t*(i%2?-1:1)+i,t*(i%2?-1:1)+i+5.8);
    disk(0,0,aperture*.65,b.phase>=2?'#ffc6d5':c);disk(0,0,aperture*.38,'#fff');
    if(b.phase===4)for(let i=0;i<3;i++){ctx.save();ctx.rotate(i*2.2);energyLine({x:19,y:1},{x:27,y:-5},'#fff',2);energyLine({x:27,y:-5},{x:44,y:4},'#fff',2);ctx.restore();}
    for(let i=0;i<9;i++){const a=i*2.4+t*.5,d=30+(i*11+t*-45)%28;energyLine(polarPoint({x:0,y:0},d,a),polarPoint({x:0,y:0},d+7,a),c,1.7);}
  }else if(b.kind==='heart'){
    disk(0,0,r,'#27202b');for(let i=0;i<4;i++){const a=t*(i%2?-1:1)*(.4+b.phase*.3)+i*.5;
      strokeRing(0,0,r-10*i,i%2?'#ff9392':'#bdbbc7',i===1?6:3,a,a+5.7);}
    if(b.phase>=2)for(let i=0;i<4;i++){
      const a=i*Math.PI/2-t;strokeRing(0,0,r+(b.state==='leak'?14+10*Math.sin(t*4):3),'#fff0ef',3,a,a+.48);
    }
    if(b.phase===3)for(let i=0;i<5;i++){const a=i*2.4;
      energyLine(polarPoint({x:0,y:0},r,a),polarPoint({x:0,y:0},r*.64,a+.08),c,3);}
    disk(0,0,27+4*Math.sin(t*5),c);disk(0,0,12,'#fff4e7');
  }else if(b.kind==='monolith'){
    panelSquare(r,'#9aaab7');etchedSquare(r-11,0,'#36646f',3);
    for(let i=0;i<4;i++){
      ctx.save();ctx.rotate(i*Math.PI/2);ctx.fillStyle=c;ctx.fillRect(r-28,r-28,13,13);
      ctx.strokeStyle='#457481';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-r+10,-r+40);ctx.lineTo(-r*.36,-r+40);ctx.lineTo(-r*.16,-r*.37);ctx.lineTo(r*.17,-r*.37);ctx.stroke();ctx.restore();
    }
    etchedSquare(26,Math.PI/4,c,4);etchedSquare(13,Math.PI/4,'#dae9ef',2);
  }
  ctx.restore();
}
function drawEncounter(b){
  const t=b.clock,c=b.color;
  if(b.kind==='twins'&&activeParts(b).length===2){
    const [a,z]=b.parts,m=mixPoint(a,z,.5);m.y+=Math.sin(t*4)*9;
    energyLine(a,m,'#ffa65c89');energyLine(m,z,'#6eeaff89');
  }
  if(b.kind==='heart')for(const q of activeParts(b))energyLine(b,q,q.color+'85',2);
  const landing=b.state==='landing'?clamp(b.age/.78,0,1):1;
  const beat=clamp(1-(t-b.lastBeat)/.21,0,1)||0;
  encounterBody({...b,y:b.y-180*(1-landing)**2},t,1+.035*beat);
  if(b.kind==='beacon'){
    for(let i=0;i<4;i++){const home=emitterPoint(b,i),q=b.posts?mixPoint(home,b.posts[i],clamp(Math.min(b.age-b.postStart,b.postEnd-b.age)/.35,0,1)):home;
      ctx.save();ctx.translate(q.x,q.y);panelSquare(13,'#ec8cff',t+i);disk(0,0,4,'#fff');ctx.restore();}
  }
  for(const q of activeParts(b)){
    componentArt(q,b.phase===3?t*1.6:t,b.kind==='twins'&&b.phase===3);
    if(b.kind==='twins'&&b.state==='absorb'&&b.fallen){
      const absorb=clamp(b.age/1.75,0,1);
      for(let i=0;i<15;i++){const u=(absorb+i/15)%1,v=mixPoint(b.fallen,q,u);v.y+=Math.sin(Math.PI*u)*17*Math.sin(i);
        disk(v.x,v.y,2+2*(1-u),b.fallen.color);}
      strokeRing(b.fallen.x,b.fallen.y,7+26*(1-absorb),b.fallen.color,2);
    }
  }
  for(const e of b.events||[]){
    if(b.age<e.start||b.age>e.end)continue;
    const u=clamp((b.age-e.start)/(e.on-e.start),0,1),q=eventOrigin(b,e);
    if(e.kind==='repair'){
      const part=b.parts[e.index];
      if(b.hp<=b.repairHP-b.maxHp*.055)continue;
      ctx.save();ctx.translate(part.x,part.y);etchedSquare(26,u*2,c,2);
      for(let i=0;i<12;i++){const v=polarPoint({x:0,y:0},65*(1-(u+i/12)%1),i*2.4);ctx.fillStyle=part.color;ctx.fillRect(v.x,v.y,5,5);}ctx.restore();
    }
    if(e.kind==='dash'&&e.fired){
      const pos=e.index<0?b:b.parts[e.index];
      for(let i=1;i<7;i++){const v=mixPoint(pos,e.origin,i*.045);ctx.fillStyle=c+'76';ctx.fillRect(v.x-5,v.y+(i%2?1:-1)*e.width*.36,8,5);}
    }
    if((e.kind==='wave'||e.kind==='volley')&&b.age<e.on&&(b.kind==='heart'||b.kind==='monolith')){
      strokeRing(q.x,q.y,20+u*27,'#fff0e7',2);
    }
    if(e.kind==='block'&&!e.fired){ctx.save();ctx.translate(q.x,q.y-100*(1-u));panelSquare(10+18*u,c,.3*(1-u));ctx.restore();}
    if(e.kind==='ray'&&e.spin&&b.age<e.on){
      const length=Math.min(state.arena.w,state.arena.h)*.36,span=e.spin*(e.end-e.on);
      ctx.save();ctx.setLineDash([5,9]);strokeRing(q.x,q.y,length,c+'88',1.5,Math.min(e.angle,e.angle+span),Math.max(e.angle,e.angle+span));ctx.restore();
    }
    if(e.kind==='path')for(const v of e.points.slice(1,-1)){ctx.save();ctx.translate(v.x,v.y);etchedSquare(6+u*9,t*3,c,2);ctx.restore();}
    if(e.kind==='ray'&&b.age<e.on){strokeRing(q.x,q.y,10+(1-u)*24,c,2);if(e.impact)strokeRing(q.x,q.y,39+u*22,'#ffe6fd',4);}
  }
}
function drawLastSequence(b){
  const t=b.age,d=b.finalLength||5,u=t/d,c=b.color,k=b.kind;
  const collapse=clamp((u-.72)/.28,0,1);
  ctx.save();
  if(k==='heart'){
    for(let i=0;i<4;i++){const since=t-(1.13+i*.83);if(since<0||since>.42)continue;
      const v=polarPoint(b,64,i*2.4);strokeRing(v.x,v.y,4+since*105,'#fff1c2',3);
      for(let j=0;j<6;j++){const spark=polarPoint(v,since*90,j*TAU/6);ctx.fillStyle=c;ctx.fillRect(spark.x,spark.y,5,5);}
    }
  }
  if(k==='fractal'||k==='clock'||k==='crown'){
    ctx.save();ctx.translate(b.x,b.y);const s=Math.max(.09,1-clamp((t-.55)/1.4,0,.75)-collapse*.4);
    ctx.scale(s,s);const spin=k==='clock'?-(Math.max(0,t-.5)**2):t*(1+t);
    patternSilhouette(k,b.size,3,spin,collapse,1,k==='clock'&&t>=1.1);ctx.restore();
    const n=k==='fractal'?4:12;
    for(let i=0;i<n;i++){
      const q=finalNode(b,i,n);ctx.save();ctx.translate(q.x,q.y);
      if(k==='crown'){const pop=clamp((t-4.1-i*.095)*4,0,1);ctx.globalAlpha=1-pop;strokeRing(0,0,9+26*pop,'#fff',3);disk(0,0,6,c);}
      else panelSquare(k==='fractal'?Math.max(2,31*(1-collapse)):6,c,spin*.45+i);
      ctx.restore();
    }
  }else if(k==='twins'){
    const [p,q]=[0,1].map(i=>finalNode(b,i,2));
    energyLine(p,q,'#fff4dd',3);
    [p,q].forEach((v,i)=>{ctx.save();ctx.translate(v.x,v.y);if(i)strokeRing(0,0,24,POLAR[i],6);else panelSquare(24,POLAR[i],t);ctx.restore();});
  }else{
    encounterBody(b,t*(1+t*.54),1-collapse*.93);
    if(k==='beacon')for(const [i,v] of (b.posts||[]).entries()){
      const burst=clamp((t-1.68-i*.53)*3,0,1);ctx.save();ctx.translate(v.x,v.y);ctx.globalAlpha=1-burst;panelSquare(15,c,t);etchedSquare(17+burst*35,t,c,2);ctx.restore();
    }
    if(k==='monolith')for(let i=0;i<4;i++){
      ctx.save();ctx.translate(b.x,b.y);ctx.rotate(i*Math.PI/2);ctx.translate(0,-90-50*collapse);ctx.fillStyle='#648c97';ctx.fillRect(-46,-8,92,16);ctx.restore();
    }
  }
  ctx.save();ctx.translate(b.x,b.y);
  for(let i=0;i<6;i++){
    ctx.save();ctx.rotate(i*2.4);ctx.strokeStyle=i%2?c:'#fff';ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(24,4);ctx.lineTo(32,-2);ctx.lineTo(40+12*Math.sin(t*6+i),4);ctx.stroke();ctx.restore();
  }
  if(collapse)for(let i=0;i<18;i++){
    const q=polarPoint({x:0,y:0},(1-(collapse+i/18)%1)*115,i*2.4);
    ctx.fillStyle=i%3?c:'#fff';ctx.fillRect(q.x,q.y,3,3);
  }
  ctx.restore();ctx.restore();
}
function drawEncounterOmen(kind,left,age,j){
  const c=ENCOUNTER_SPECS[kind].color;
  ctx.save();ctx.translate(W*(.5+Math.sin(j)*.16),H*.49);
  const r=Math.min(W,H)*.32,closing=clamp(1-left/5,0,1);
  for(let i=0;i<8;i++){
    const u=(age*.6+i/8)%1,a=i*TAU/8;
    const q=polarPoint({x:0,y:0},r*(1-u),a);
    ctx.globalAlpha=.18+.52*Math.sin(Math.PI*u);
    if(kind==='beacon'){
      const end=left<3?{x:0,y:0}:polarPoint(q,40+(left<10?110:0),a+.5);
      energyLine(q,end,c,1.7);
    }else if(kind==='twins'){
      const s=Math.sin(age*2+i);disk(q.x+s*19,q.y,3,POLAR[1]);ctx.fillStyle=POLAR[0];ctx.fillRect(q.x-s*19,q.y,6,6);
    }else{ctx.fillStyle=kind==='heart'?'#b1a3ae':'#41555d';ctx.fillRect(q.x,q.y+(kind==='heart'?u*38:0),9+i%4,9+i%4);}
  }
  ctx.globalAlpha=.85;
  if(closing){
    if(kind==='twins'){for(let i=0;i<2;i++){const x=(i?1:-1)*(32+r*(1-closing));disk(x,0,8+closing*8,POLAR[i]);energyLine({x,y:0},{x:0,y:0},POLAR[i]+'88');}}
    else if(kind==='heart'){for(let i=0;i<4;i++){const q=polarPoint({x:0,y:0},r*.7,Math.PI/4+i*Math.PI/2);energyLine(q,{x:0,y:0},c+'99');ctx.fillStyle=c;ctx.fillRect(q.x-5,q.y-5,10,10);}disk(0,0,16*closing,c);}
    else{const size=(kind==='monolith'?75:33)*closing;panelSquare(Math.max(6,size),c);if(kind==='beacon')disk(0,0,Math.max(1,closing*14),'#fff4fc');}
  }
  ctx.restore();
}
