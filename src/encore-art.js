'use strict';
function neonText(str,x,y,ink,size,width){
  ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+size+'px monospace';
  ctx.lineWidth=Math.max(2,size*.21);ctx.strokeStyle='#110d1b';ctx.strokeText(str,x,y,width);ctx.fillStyle=ink;ctx.fillText(str,x,y,width);ctx.restore();
}
function iris(x,y,r,ink,t){
  disk(x,y,r,'#151326');strokeRing(x,y,r,ink,3);strokeRing(x,y,r*.72,ink+'a4',2,t,t+4.8);
  disk(x,y,r*.38,ink);disk(x-r*.09,y-r*.12,r*.14,'#ffffff');
}
function cracked(r,t,n,ink){
  for(let i=0;i<n;i++){
    ctx.save();ctx.rotate(i*2.4);ctx.beginPath();ctx.moveTo(r*.97,0);ctx.lineTo(r*.72,5);ctx.lineTo(r*.65,-2);ctx.lineTo(r*.4,5+2*Math.sin(t*5));ctx.lineWidth=2;ctx.strokeStyle=ink;ctx.stroke();ctx.restore();
  }
}
function paintHazardPanel(s,ink){
  ctx.save();ctx.translate(s.x,s.y);const x=s.rx,y=s.ry;
  ctx.fillStyle=s.censor?'#15131d86':s.live?ink+'86':ink+'1d';ctx.fillRect(-x,-y,2*x,2*y);
  ctx.strokeStyle=s.live?ink:'#ffd0be';ctx.lineWidth=s.live?3:1.5;ctx.strokeRect(-x,-y,2*x,2*y);
  if(s.ad||s.censor)neonText(s.ad?'PUBLICIDAD':'▰ CENSURA',0,0,ink,12,x*1.8);
  if(s.jaw||s.soldier){ctx.fillStyle=ink;for(let i=-1;i<=1;i++)ctx.fillRect(-x+3,clamp(i*y*.6,-y,y),x*.31,3);}
  ctx.restore();
}
function drawScoreDetails(b){
  const t=b.age,ink=b.color;
  for(const e of b.events||[]){
    if(t<e.start||t>e.end+.06)continue;
    const q=e.origin,u=clamp((t-e.start)/(e.on-e.start||1),0,1);
    if((e.kind==='ray'||e.kind==='stroke')&&t<e.on){
      strokeRing(q.x,q.y,7+(1-u)*15,e.ink||ink,2,-Math.PI/2,-Math.PI/2+TAU*u);
      if(e.studio)iris(q.x,q.y,13,ink,t);
    }else if(['node','portal','halo','command'].includes(e.kind)){
      const r=e.r||24;ctx.save();ctx.translate(q.x,q.y);
      strokeRing(0,0,r*(.7+.3*u),ink,3,t*1.8,t*1.8+5.5);
      for(let j=0;j<4;j++)etchedSquare(r*(.72+.14*(j%2)),j*.39+t*(j%2?.72:-.72),ink+'a9',1);
      if(e.kind==='portal')disk(0,0,r*.43,'#160b29');ctx.restore();
    }else if(e.kind==='classicRing'&&t<e.on){
      // The original sector skips 15 of its 60 angular positions.
      const a=state.arena,diagonal=Math.hypot(a.w,a.h);
      for(const ang of e.angles){
        const dx=Math.cos(ang),dy=Math.sin(ang);
        const r=Math.min(diagonal,Math.abs(dx)<1e-6?Infinity:((dx>0?a.x+a.w:a.x)-q.x)/dx,Math.abs(dy)<1e-6?Infinity:((dy>0?a.y+a.h:a.y)-q.y)/dy);
        const v=polarPoint(q,Math.max(0,r-6),ang);
        energyLine(v,polarPoint(v,-14-15*u,ang),'#f8d66b67',1.6);
      }
      strokeRing(q.x,q.y,e.r*(1-.8*u),ink+'a1',2,e.angle+TAU/6,e.angle+11*TAU/12);
    }else if(e.kind==='offering'){const pos=eventPosition(e,t);energyLine(q,pos,ink+'67',3);disk(pos.x,pos.y,e.r,ink);}
    if(e.kind==='panel'&&t<e.on){
      energyLine(q,e.to,ink+'55',2);ctx.save();ctx.setLineDash([3,6]);ctx.strokeStyle=ink+'84';ctx.strokeRect(e.to.x-e.rx,e.to.y-e.ry,2*e.rx,2*e.ry);ctx.restore();
    }
    if(e.kind==='burst'&&t<e.on&&e.count>=8)strokeRing(q.x,q.y,4+u*12,e.ink||ink,1.5);
  }
}
function motherBody(b,t,d){
  const black=b.phase>=3,r=49+3*Math.sin(t*2),fold=(1-.6*d)*(.91+.09*Math.cos(t*2));
  for(const s of [-1,1])for(let wing=0;wing<4;wing++){
    ctx.beginPath();ctx.moveTo(s*15,0);
    for(let j=1;j<=15;j++){
      const u=j/15,x=s*(24+u*(135-wing*16))*fold,y=-12+u*(-87+wing*32)+17*Math.sin(u*3+t*1.5+wing)-28*Math.sin(Math.PI*u);
      ctx.lineTo(x,y);
      if(j%2){ctx.fillStyle=j%3?'#fff2c9':'#ffc959';const w=(9-4*u)*(1-d*.8);ctx.fillRect(x-w/2,y-w/2,w,w);}
    }ctx.strokeStyle=wing%2?'#fff1dbb0':'#ffcf747d';ctx.lineWidth=1.6;ctx.stroke();
  }
  for(let j=0;j<15;j++){
    const x=(j-7)*5.8,y=63+21*Math.cos(j*2+t),z=x+Math.sin(j+t)*11;
    ctx.beginPath();ctx.moveTo(x,-5);ctx.quadraticCurveTo(z+12,40,z,y);ctx.strokeStyle='#fff4e78a';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#ffdc95';ctx.fillRect(z-2,y,4,4);
  }
  for(let j=0;j<4;j++){const a=t*(j%2?.44:-.68)+j;strokeRing(0,-10,61+j*6,j%2?'#ffe5a2':'#efb34a',j%2?2:4,a,a+5.9-j*.22);}
  ctx.save();ctx.scale(.79,1.12);disk(0,-8,r,black?'#191025':'#fff9e7');strokeRing(0,-8,r,'#ffd588',3);ctx.restore();
  for(let i=0;i<3;i++)etchedSquare(8+i*5,t*.2+i*.8,black?'#e7c5ff':'#c58b39',1.6);
  if(b.phase===4||d)cracked(46,t,6,'#fff9e8');
}
function prismaticBody(b,t,d){
  for(let i=0;i<6;i++){
    const ink=PRISM_COLORS[i],a=i*TAU/6+t*.68;
    ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(Math.cos(a)*154,Math.sin(a)*85,Math.cos(a+.76)*181,Math.sin(a+.76)*129,Math.cos(a+.98)*70,Math.sin(a+.98)*89);
    ctx.strokeStyle=ink+'5d';ctx.lineWidth=9-4*d;ctx.stroke();ctx.lineWidth=1.4;ctx.strokeStyle=ink;ctx.stroke();
  }
  for(let i=0;i<30;i++){
    const a=t*(b.phase===2?1.2:.68)+TAU*i/30,r=57+10*Math.cos(5*a-t)+d*(22+i%4*11);
    ctx.save();ctx.rotate(a);ctx.translate(r,0);ctx.rotate(.78+t*.5);ctx.fillStyle=d>.75?'#fff8ff':PRISM_COLORS[i%6];ctx.fillRect(-4,-4,8+i%3,8+i%3);ctx.restore();
  }
  disk(0,0,37,'#f9f1ff');for(let i=0;i<6;i++)strokeRing(0,0,42,PRISM_COLORS[i],3,t+i*TAU/6,t+(i+.89)*TAU/6);
  etchedSquare(13,t*.38,'#ad7fd5',2);
}
function conjurerBody(b,t,d){
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2+t*(.5+b.phase*.18+d*3),r=(b.phase>1?134:88)*(1-Math.max(0,d-.64)*2.6),q=polarPoint({x:0,y:0},r,a);
    energyLine({x:0,y:0},q,PRISM_COLORS[i]+'96',2);ctx.save();ctx.translate(q.x,q.y);panelSquare(15,PRISM_COLORS[i],a);ctx.restore();
  }
  disk(0,0,53,'#150b24');for(let j=0;j<3;j++)strokeRing(0,0,52+8*j,b.phase===3?'#e970a9':'#bb8afa',2+j%2,-t+j*2,-t+j*2+5);
  for(let j=0;j<24;j++){const a=t*(j%2?.6:-.7)+j*2.4,q=polarPoint({x:0,y:0},8+j%9*4,a);disk(q.x,q.y,1+j%3,'#cb93ff');}
  for(let i=0;i<12;i++){ctx.save();ctx.rotate(i*TAU/12+t*.4);ctx.translate(69,0);etchedSquare(4,i*.62,'#f1c5ff',1.3);ctx.restore();}
  if(b.phase>2||d)cracked(51,t,6,'#ff98cc');
}
function studioFeed(b,t){
  // A clipped second world view. Draw only objects in its field of view.
  const p=state.player,ox=p.x,oy=p.y,scale=.28;
  ctx.save();ctx.beginPath();ctx.rect(-63,-42,126,72);ctx.clip();
  ctx.fillStyle='#0f2031';ctx.fillRect(-63,-42,126,72);
  ctx.translate(0,-5);ctx.scale(scale,scale);ctx.translate(-ox,-oy);
  ctx.strokeStyle='#344456';ctx.lineWidth=2;
  for(let x=Math.floor((ox-230)/64)*64;x<ox+230;x+=64)energyLine({x,y:oy-135},{x,y:oy+135},'#344456',2);
  for(let y=Math.floor((oy-135)/64)*64;y<oy+135;y+=64)energyLine({x:ox-230,y},{x:ox+230,y},'#344456',2);
  for(const arr of [state.enemyBullets,state.bullets,state.enemies,state.peers||[],[p]])for(const v of arr){
    if(Math.abs(v.x-ox)>240||Math.abs(v.y-oy)>148)continue;
    const r=v.r||v.size/2||9;ctx.fillStyle=v.tint||v.color||'#f4b0dc';
    if(v===p||v.netId&&!v.r&&!v.type)ctx.fillRect(v.x-r,v.y-r,r*2,r*2);else disk(v.x,v.y,r,ctx.fillStyle);
  }
  const recording=b.events?.find(e=>e.kind==='recording'&&e.path.length>1);
  if(recording){ctx.strokeStyle='#ffbfd5';ctx.lineWidth=4;cosmicPath(recording.path);ctx.stroke();
    const replay=railPoint(recording,clamp(b.age/recording.end,0,1));ctx.fillStyle='#ffd7ec';ctx.fillRect(replay.x-p.size/2,replay.y-p.size/2,p.size,p.size);}
  ctx.restore();
}
function televisionBody(b,t,d){
  const p=state.player,shake=b.hitFlash>0||b.phase===3?.8:0;
  ctx.translate(Math.sin(t*91)*shake,Math.sin(t*73)*shake);
  for(const [i,s] of [-1,1].entries()){
    if(d>(i?.79:.48))continue;
    const q={x:s*(119+16*Math.cos(t*2+i)),y:-21+22*Math.sin(t*2+i)},joint={x:s*93,y:26+12*Math.sin(t+i)};
    energyLine({x:s*61,y:0},joint,'#92657e',10);energyLine(joint,q,'#ed6888',7);iris(joint.x,joint.y,8,'#ffa0a4',t);
    ctx.save();ctx.translate(q.x,q.y);ctx.rotate(angleTo({x:q.x+b.x,y:q.y+b.y},p));ctx.fillStyle='#2b2538';ctx.fillRect(-13,-11,29,22);iris(11,0,10,'#ff4269',t);ctx.restore();
  }
  ctx.fillStyle='#21192a';ctx.fillRect(-77,-54,154,103);ctx.strokeStyle='#ff5c72';ctx.lineWidth=4;ctx.strokeRect(-77,-54,154,103);
  studioFeed(b,t);for(let j=0;j<8;j++){ctx.fillStyle='#ffb0c21e';ctx.fillRect(-62,-39+j*9,124,1);}
  if(d||b.hitFlash>0)for(let i=0;i<9;i++){const x=Math.sin(t*39+i*5)*31,y=Math.cos(t*12+i)*31;ctx.fillStyle=i%2?'#ff8fae9c':'#b9e3fb8c';ctx.fillRect(x-28,y,24+i*4,2);}
  neonText(d>.85?'SIN SEÑAL':'● EN DIRECTO',0,-37,'#ff799a',9,111);
  if(b.phase>1)neonText(Math.floor(20314+t*849)+' espectadores',0,36,'#ffe9ed',8,130);
}
function generalBody(b,t,d){
  for(let i=0;i<4;i++){
    const a=Math.PI/4+i*Math.PI/2;for(let j=0;j<12;j++){
      if(d>(i+1)*.19&&j>3)continue;
      const q=polarPoint({x:0,y:0},73+j*7,a);q.y+=Math.sin(j*.3+t*2)*7;
      strokeRing(q.x,q.y,4+(j%2),j%2?'#9a9baa':'#d7827f',2);
    }
  }
  panelSquare(65,'#9994a1',0);
  for(let i=0;i<4;i++){ctx.save();ctx.rotate(i*Math.PI/2);ctx.fillStyle='#424356';ctx.fillRect(-60,-59,52,12);iris(48,-52,7,'#bd9a9f',t);ctx.restore();}
  cracked(65,t,5+b.phase,'#ffa39b');iris(0,0,25,d>.78?'#9aa7a9':'#ff4a58',t);
  if(d<.8)strokeRing(0,0,15,'#f15d6b',4);
}
function wallBody(b,t,d){
  const h=b.chasing?state.arena.h*.48:106,w=b.chasing?49:64,n=b.chasing?15:7;
  for(let i=0;i<n;i++){const y=-h+(i+.5)*(2*h/n),x=6*Math.sin(t*2+i);
    ctx.fillStyle=i%2?'#47292e':'#222329';ctx.fillRect(-w,y-h/n,w*1.6,2*h/n);
    iris(x-8,y,h/n*.82,i%3?'#df7759':'#ffb661',t+i);
    for(let j=0;j<3;j++){const a=t*4+j*2;ctx.save();ctx.translate(w*.63+4*Math.sin(a+i),y+(j-1)*h/n*.61);ctx.rotate(a);ctx.fillStyle='#d26755';ctx.fillRect(-4,-4,8,8);ctx.restore();}
  }
  iris(0,0,w*.68,'#ff4937',-t);cracked(w,t,b.phase+3,'#ffb18c');
  if(d)for(let i=0;i<20;i++){const q=polarPoint({x:0,y:(i/20-.5)*h*2},(d+i*.08)%1*75,t+i);ctx.fillStyle='#ee8565';ctx.fillRect(q.x,q.y,5,5);}
}
const SIGNATURE_ART={dawn:motherBody,prism:prismaticBody,sovereign:conjurerBody,channel:televisionBody,general:generalBody,frontier:wallBody};
function drawSignature(b){
  const t=b.clock||0,d=b.state==='final'?clamp(b.age/(b.finalLength||8),0,1):0;
  const transition=b.state==='transition'?Math.sin(Math.PI*clamp(b.age/(b.kind==='frontier'?1.45:1),0,1)):0;
  if(b.kind==='prism'||b.kind==='general')for(const [i,q] of (b.trail||[]).entries()){
    if(t-q.t>.72)continue;ctx.save();ctx.globalAlpha=.15*(1-(t-q.t)/.72);if(b.kind==='prism')disk(q.x,q.y,27,PRISM_COLORS[i%6]);else{ctx.strokeStyle=b.color;ctx.strokeRect(q.x-52,q.y-52,104,104);}ctx.restore();
  }
  if(transition&&b.kind==='prism'){
    const pts=Array.from({length:6},(_,i)=>stageEdge(i%4,(Math.floor(i/4)+1)/3));
    pts.forEach((p,i)=>{energyLine(p,pts[(i+1)%6],'#fff2fb91',2);strokeRing(p.x,p.y,51*transition,PRISM_COLORS[i],5);});
  }
  if(transition&&b.kind==='frontier'){
    const a=state.arena;for(let i=0;i<14;i++){const y=a.y+a.h*i/14,x=a.x+a.w;energyLine({x,y},{x:x-transition*(40+20*(i%3)),y:y+26},'#ff9b74',4);}
  }
  ctx.save();ctx.translate(b.x,b.y);const hit=b.hitFlash>0?1.045:1,scale=hit*(1+.035*Math.sin(t*(2+b.phase))+.06*transition);
  ctx.scale(scale,scale);if(d>.91&&b.kind!=='frontier'){const f=Math.max(.10,(1-d)/.09);ctx.scale(f,f);}
  if(b.clock<1.12&&b.state==='recover'){
    const u=b.clock/1.12;strokeRing(0,0,18+100*(1-u),b.color,2);ctx.globalAlpha=.38+.62*u;
  }
  SIGNATURE_ART[b.kind](b,t,d);
  if(d){
    const n=b.kind==='channel'?10:18;
    for(let i=0;i<n;i++){
      const u=(d*2.1+i/n)%1,p=polarPoint({x:0,y:0},40+95*u,i*2.4+.36*t);
      const ink=b.kind==='prism'?PRISM_COLORS[i%6]:b.kind==='general'&&d>.8?state.player.color||'#72cfff':b.color;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(i+u);ctx.globalAlpha=d*(1-u);ctx.fillStyle=ink;ctx.fillRect(-2,-2,4+i%4,4);ctx.restore();
    }
  }
  if(transition||d>.85){const pulse=transition||Math.sin((1-d)*Math.PI/.15);strokeRing(0,0,68+pulse*65,b.color,3);}
  ctx.restore();
  let line=b.caption;
  if(b.kind==='channel'&&b.clock<2.4)line='¡BIENVENIDOS AL ÚLTIMO PROGRAMA DE ESTE CUADRADO!';
  if(d&&b.kind==='channel')line=d>.83?'SIN SEÑAL':d>.60?'NO CORTEN LA...':d>.33?'ESPEREN...':'NO...';
  if(d&&b.kind==='general')line=d>.87?'NO DEJES QUE NOS OLVIDEN':d>.65?'EL ÚLTIMO... ERES TÚ':'PROTOCOLO FINAL';
  if(line&&(d||b.clock<(b.captionUntil||2.4))){
    if(b.kind==='channel')neonText(line,b.x,b.y+16,'#fff3ee',9,124);
    neonText(line,b.x,b.y-(b.kind==='channel'?68:97),'#fff0e6',13,Math.min(W*.65,320));
  }
}
function drawSignatureOmen(kind,left,t,i){
  const col=ENCORE[kind].color;if(left>8&&kind==='dawn')return;
  ctx.save();ctx.translate(W*(.5+.12*Math.sin(i*3)),H*.43);
  for(let j=0;j<(kind==='dawn'?Math.ceil((8-left)*4)+8:14);j++){
    const x=Math.sin(j*119.7+i)*W*.5,y=(((t*(.23+j%4*.06)+j*.37)%1)-.5)*H;
    if(kind==='dawn'||kind==='frontier'){ctx.fillStyle=col+'a5';ctx.fillRect(x,y,4+j%4,4+j%4);}
    else if(kind==='prism')strokeRing(x+40*Math.sin(t+j),y,4+j%5,PRISM_COLORS[j%6],2);
    else if(kind==='channel'){ctx.fillStyle='#ff5f793d';ctx.fillRect(x,y,30+j%6*8,2);}
    else strokeRing(x,y,4+9*((t+j*.3)%1),col+'85',2);
  }
  if(left<5){
    const r=clamp(left/5,0,1);
    if(kind==='channel')neonText('● EN DIRECTO   '+Math.min(3,Math.ceil(left)),0,-20,col,23,W*.7);
    else if(kind==='general')neonText(['OBJETIVO: CUADRADO','IDENTIFICANDO OBJETIVO...','PROTOCOLO DE EXTERMINIO REACTIVADO','UNIDAD DE COMBATE DETECTADA'][Math.min(3,Math.floor(left))],0,0,col,16,W*.8);
    else if(kind==='frontier')energyLine({x:-r*W*.49,y:-H*.48},{x:-r*W*.49,y:H*.5},col,7);
    else for(let j=0;j<6;j++){const a=j*TAU/6,p=polarPoint({x:0,y:0},(22+120*r),a);energyLine(p,{x:0,y:0},col+'68',1);strokeRing(0,0,9+114*r+j*3,kind==='prism'?PRISM_COLORS[j]:col,2,a+t,a+t+.8);}
  }ctx.restore();
}

function drawAdvancedDetails(e,r){
  const t=state.time,age=t-e.born,shot=t-(e.firedAt??-3),heading=e.heading??0;
  if(age<.45)strokeRing(0,0,r+(1-age/.45)*22,e.color,2);
  if(e.hitFlash>0)strokeRing(0,0,r*.84,'#fff9e9',2);
  if(e.type==='pulseRing'){
    const charge=e.phase==='aim'?clamp(1-e.shootCd/.52,0,1):0;
    for(let j=0;j<3;j++){const a=(1-charge)*e.wob*(j%2?-1:1)+heading;strokeRing(0,0,r*(.58+j*.22),j%2?'#f5d0ff':'#ab68e8',2,a,a+4.7);
      const q=polarPoint({x:0,y:0},r+4,a+j*2);ctx.fillStyle='#eeb5ff';ctx.fillRect(q.x-2,q.y-2,4,4);}
    disk(0,0,3+charge*5,'#fff1ff');if(shot<.36)strokeRing(0,0,r+shot*82,'#edbcff',2);
  }else if(e.type==='rebound'||e.type==='erratic'){
    const dash=e.boost>0||e.phase==='rush',n=dash?8:3;
    ctx.save();ctx.rotate(heading);for(let i=n;i>0;i--){ctx.globalAlpha=(1-i/(n+1))*.48;
      const x=-i*(dash?7:3);if(e.type==='rebound'){strokeRing(x,0,r*(1-i*.045),'#abddff',2,1.7,4.6);}
      else{ctx.strokeStyle='#ffbd65';ctx.strokeRect(x-r,-r+i*.33,r*1.7,r*1.8);}}
    ctx.globalAlpha=1;const recoil=clamp(1-(t-(e.bounced??-1))/.22,0,1);
    ctx.scale(1-.22*recoil+(e.phase==='rush'?.16:0),1+.13*recoil);
    if(e.type==='rebound'){disk(0,0,r*.84,'#192d55');for(let i=-1;i<=1;i++)energyLine({x:-r*.62,y:i*r*.34},{x:r*.5,y:i*r*.34+4},'#91c4f9',2);}
    else{ctx.rotate(.785+.11*Math.sin(e.wob*4));panelSquare(r*.74,'#ffb64a');}
    ctx.restore();
  }else{
    ctx.save();ctx.rotate(heading);for(const s of [-1,1]){
      const recoil=e.gunSide===s?clamp(1-shot/.25,0,1):0,x=-recoil*8;
      ctx.fillStyle='#582a38';ctx.fillRect(x-r*.5,s*r*.65-5,r*1.7,10);ctx.strokeStyle='#f6ad95';ctx.strokeRect(x-r*.5,s*r*.65-5,r*1.7,10);
      disk(x+r*1.25,s*r*.65,e.phase==='aim'?5:3,recoil?'#fff5d0':'#ffa28d');
    }ctx.restore();
  }
}
function paintRetainer(e,r){
  ctx.save();ctx.translate(e.x,e.y);const ink=e.color,t=e.wob;
  if(e.role==='charger'||e.role==='soldier'){panelSquare(r*.72,ink,t*.24);etchedSquare(r*.45,Math.PI/4,'#f9ceff',2);}
  else if(e.role==='miner'){for(let i=0;i<3;i++)etchedSquare(r*(.46+.18*i),t*.28+i*.48,ink,2);}
  else if(e.role==='caller'){for(let i=0;i<4;i++){const q=polarPoint({x:0,y:0},r,t*.4+i*Math.PI/2);disk(q.x,q.y,5,ink);}iris(0,0,r*.65,ink,t);}
  else {iris(0,0,r,ink,t);if(e.role==='radial')for(let i=0;i<8;i++){const q=polarPoint({x:0,y:0},r+3,t*.3+i*TAU/8);disk(q.x,q.y,2.5,'#ffd0e8');}}
  if(e.command==='huntOrder'&&e.until>state.time)energyLine({x:0,y:0},polarPoint({x:0,y:0},105,e.aim),'#ff71b9',2);
  ctx.restore();return true;
}

function drawStageAtmosphere(){
  const a=state.arena;if(!a)return;
  for(const b of livingBosses()){
    if(!ENCORE[b.kind])continue;
    ctx.save();const t=b.clock;
    if(b.kind==='dawn'){
      ctx.fillStyle=b.phase>=3?'#24192e24':'#d2a43a0b';ctx.fillRect(a.x,a.y,a.w,a.h);
      for(let j=0;j<3;j++)strokeRing(b.x,b.y,95+((t*.14+j/3)%1)*340,'#d5b36524',1.5);
      if(b.state==='eclipse'){const r=87+6*Math.sin(t*2);disk(b.x,b.y,r,'#130e20');strokeRing(b.x,b.y,r,b.color,4);}
    }
    if(b.kind==='channel'&&b.state==='splitScreen'){
      const c=patternOrigin();energyLine({x:a.x,y:c.y},{x:a.x+a.w,y:c.y},'#ef739e66',2);energyLine({x:c.x,y:a.y},{x:c.x,y:a.y+a.h},'#ef739e66',2);
      for(let i=0;i<4;i++){const q=stagePoint(i%2*.5+.05,(i>>1)*.5+.05);neonText('● CAM 0'+(i+1),q.x,q.y,b.color,11,78);}
    }
    if(b.kind==='frontier'&&b.chasing){
      ctx.strokeStyle='#cc594636';ctx.lineWidth=2;
      const first=Math.ceil(a.x/150)*150;
      for(let x=first;x<a.x+a.w;x+=150)for(const y of [a.y+15,a.y+a.h-15]){
        energyLine({x:x-12,y:y-6},{x,y},'#cc594655',2);energyLine({x,y},{x:x-12,y:y+6},'#cc594655',2);
      }
    }
    ctx.restore();
  }
}
