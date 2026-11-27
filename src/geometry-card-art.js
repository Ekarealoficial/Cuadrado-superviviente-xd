'use strict';
const SHOT_INK={returnShot:'#75fff5',starTide:'#ceacff',omega:'#ff9470',tide:'#62b9ff',anchor:'#9cdcff',army:'#bc91ff',needles:'#ffe68a'};
function drawGeometryCards(p){
  if(p.nearby||p.survivalUntil>state.time){ctx.save();ctx.translate(p.x,p.y);etchedSquare(p.size/2+3,0,p.nearby?'#ffa3b5':'#88ffb1',2);ctx.restore();}
  if(p.capacitor&&p.fireTime)for(let i=0;i<4;i++){const q=polarPoint(p,p.size*.75,state.time*(p.fireTime>=2?7:2)+i*TAU/4);ctx.fillStyle='#ffff9a';ctx.fillRect(q.x-2,q.y-2,4,4);}
  for(const c of p.actCasts||[]){
    if(c.id==='nullArc')for(const a of c.arcs){for(const [ink,w] of [['#55edea',9],['#fff',3]])strokeRing(a.x,a.y,a.radius,ink,w,c.angle-a.spread,c.angle+a.spread);}
    if(c.id==='omega'){const q=polarPoint(p,p.size/2+20,c.angle);ctx.save();ctx.translate(q.x,q.y);etchedSquare(6+c.age*14,c.age*4,'#ff9e87',4);etchedSquare(4+c.age*10,-c.age*3,'#fff',2);ctx.restore();}
    if(c.id==='resNet'&&c.nodes.length){ctx.beginPath();ctx.moveTo(c.nodes[0].x,c.nodes[0].y);for(const q of c.nodes)ctx.lineTo(q.x,q.y);ctx.closePath();ctx.strokeStyle='#ccaaff';ctx.lineWidth=3;ctx.stroke();}
    for(const q of c.nodes){strokeRing(q.x,q.y,7+2*Math.sin(c.age*8),'#c9aaff',2);disk(q.x,q.y,3,'#fff');}
  }
  if(p.crush){const c=p.crush,r=c.r*(1-clamp((c.age-1.2)/.3,0,.98));ctx.save();ctx.translate(c.x,c.y);ctx.setLineDash([12,4+c.age*3]);etchedSquare(r,0,'#ff7bcd',3);ctx.restore();}
  if(p.kinetic && Math.hypot(p.vx||0,p.vy||0)>15){
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(p.vy,p.vx));ctx.strokeStyle=p.movingTime>=2?'#baffe3':'#5b9c96';ctx.lineWidth=2;
    for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(-p.size/2-2,i*6);ctx.lineTo(-p.size/2-(p.movingTime>=2?30:12)+5*Math.abs(i),i*6);ctx.stroke();}ctx.restore();
  }
  if(p.army)for(let i=0;i<p.army.n;i++){
    const q=replicaOrbit(p,i,p.army.n);
    ctx.save();ctx.translate(q.x,q.y);const r=Math.max(5,p.size*.38);ctx.globalAlpha=.45;ctx.fillStyle=p.color;ctx.fillRect(-r,-r,r*2,r*2);etchedSquare(r,0,'#da9bff',3);
    ctx.globalAlpha=.20;ctx.translate(-6,5);etchedSquare(r,0,'#b79cff',2);ctx.restore();
  }
  if(p.anchor){
    for(let i=0;i<6;i++)for(const dir of [-1,1]){const a=i*TAU/6+state.time*dir;strokeRing(p.x,p.y,p.anchor.r+(dir===1?0:-6),dir===1?'#76acff':'#bdefff',2,a,a+.73);}
    for(const q of p.anchor.held){disk(q.x,q.y,q.r,'#6fa9de');disk(q.x-1,q.y-2,2,'#e6ffff');}
  }
  if(p.needles)for(let i=0;i<p.needles.n;i++){
    const c=p.needles,q=satellite(p,i,c.n,(p.size/2+45)*clamp(c.time/.33,0,1),c.angle);strokeRing(q.x,q.y,6,'#ffda6b',2);disk(q.x,q.y,3,'#fff8d8');
  }
  for(const z of p.geometryFX||[]){
    const t=clamp((state.time-z.born)/.65,0,1);ctx.save();ctx.globalAlpha=1-t;
    const color=GEOMETRY_NORMALS.find(c=>c[0]===z.kind)?.[3]||GEOMETRY_SPECIALS.find(c=>c[0]===z.kind)?.[4]||'#fff';
    if(z.to){
      const dx=z.to.x-z.x,dy=z.to.y-z.y,d=Math.hypot(dx,dy)||1;ctx.strokeStyle=color;ctx.lineWidth=2.7;ctx.beginPath();ctx.moveTo(z.x,z.y);
      for(let k=1;k<=8;k++){const n=k===8?0:Math.sin(k*9+Math.floor(t*5))*9;const x=z.x+dx*k/8+n*dy/d,y=z.y+dy*k/8-n*dx/d;ctx.lineTo(x,y);if(k%3===0){ctx.lineTo(x-dy/d*13,y+dx/d*13);ctx.moveTo(x,y);}}ctx.stroke();
    }else{
      ctx.translate(z.x,z.y);const r=Math.max(.01,z.r*Math.sqrt(t));
      if(z.kind==='crush'||z.kind==='omega')etchedSquare(r,0,color,4);else strokeRing(0,0,r,color,3*(1-t)+1);
      for(let i=0;i<14;i++){ctx.rotate(TAU/14);ctx.fillStyle=color;ctx.fillRect(r+5*t,-2,4,3);}
    }ctx.restore();
  }
}
// Draw each emblem in the destination canvas so inventory, pickups and desktop cards match.
function paintGeometryIcon(g,id,s){
  const path=(points,close=false)=>{g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x*s,y*s):g.moveTo(x*s,y*s));if(close)g.closePath();g.stroke();};
  const ring=(x,y,r)=>{g.beginPath();g.arc(x*s,y*s,r*s,0,TAU);g.stroke();};
  const box=(x,y,r)=>g.strokeRect((x-r)*s,(y-r)*s,2*r*s,2*r*s);
  g.lineWidth=Math.max(1.5,s*.13);
  if(id==='refract'){path([[-.9,.68],[0,-.52],[.85,.2]]);path([[-.4,-.65],[.7,-.65]]);}
  else if(id==='compression'){ring(.35,0,.4);path([[-.92,-.3],[-.24,-.13]]);path([[-.92,.3],[-.24,.13]]);}
  else if(id==='capacitor'){box(0,0,.6);path([[-.2,-.4],[.14,-.1],[-.12,.12],[.2,.4]]);}
  else if(id==='saturation'){box(0,0,.29);for(let i=0;i<5;i++){g.rotate(TAU/5);ring(.74,0,.12);}}
  else if(id==='returnShot'){ring(0,0,.58);path([[-.7,-.55],[-.7,0],[-.2,-.08]]);}
  else if(id==='dashPulse'||id==='nullArc'){for(let i=1;i<=3;i++){g.beginPath();g.arc(-s*.45,0,s*i*.44,-.8,.8);g.stroke();}}
  else if(id==='survival'){box(.24,0,.4);for(let i=-1;i<=1;i++)path([[-.9,.28*i],[-.38,.28*i]]);}
  else if(id==='omega'){box(0,0,.7);box(0,0,.4);ring(0,0,.17);}
  else if(id==='resNet'){path([[0,-.7],[.7,.4],[-.7,.4]],true);for(let i=0;i<3;i++){ring(0,-.7,.14);g.rotate(TAU/3);}}
  else if(id==='starTide'){for(let i=0;i<6;i++){g.rotate(TAU/6);ring(.7,0,.12);path([[.2,0],[.47,0]]);}}
  else if(id==='mini'||id==='giant'){
    box(0,0,id==='mini'?.28:.52);
    for(let i=0;i<4;i++){g.rotate(TAU/4);const d=id==='mini'?-.22:.19,k=id==='mini'?.66:.9;path([[k+d,k],[k,k],[k,k+d]]);path([[k-d,k-d],[k,k]]);}
  }else if(id==='resonance'){ring(0,0,.29);ring(0,0,.61);for(let i=0;i<4;i++){g.rotate(TAU/4);box(.88,0,.08);}}
  else if(id==='kinetic'||id==='persist'){for(let i=0;i<3;i++){const x=-.7+i*.46;path([[x,-.53],[x+.4,0],[x,.53]]);}if(id==='persist')ring(.64,0,.22);}
  else if(id==='chain'){path([[-.9,.35],[-.3,-.45],[-.12,.05],[.55,-.6],[.33,-.1],[.9,-.38]]);ring(-.82,.42,.13);ring(.8,-.45,.13);}
  else if(id==='tide'){for(let i=-2;i<=2;i++){const a=-Math.PI/2+i*.33;path([[0,.65],[.86*Math.cos(a),.65+1.2*Math.sin(a)]]);}}
  else if(id==='reaction'){path([[0,-.86],[.71,-.5],[.58,.3],[0,.85],[-.58,.3],[-.71,-.5]],true);path([[-.88,.02],[-.25,.02],[0,-.31],[.2,.29],[.37,0],[.9,0]]);}
  else if(id==='crush'){box(0,0,.85);g.rotate(Math.PI/4);box(0,0,.36);for(let i=0;i<4;i++){g.rotate(TAU/4);path([[.45,0],[.91,0]]);}}
  else if(id==='army'){box(-.4,-.35,.4);box(.35,-.22,.4);box(0,.34,.47);}
  else if(id==='anchor'){ring(0,0,.84);ring(0,0,.14);path([[0,-.62],[0,0],[.39,.23]]);}
  else if(id==='needles'){ring(0,0,.47);for(let i=0;i<8;i++){g.rotate(TAU/8);path([[.5,0],[.91,0]]);ring(.7,0,.075);}}
}
