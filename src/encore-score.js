'use strict';
function stagePoint(u,v,pad=22){
  const a=state.arena;return {x:a.x+pad+(a.w-2*pad)*u,y:a.y+pad+(a.h-2*pad)*v};
}
function stageEdge(i,f){return [()=>stagePoint(f,0),()=>stagePoint(1,f),()=>stagePoint(f,1),()=>stagePoint(0,f)][i%4]();}
function colorOf(b,i){return b.kind==='prism'?PRISM_COLORS[i%6]:b.color;}
function burst(b,t,q,n,speed,angle=0,extra={}){
  cue(b,'burst',t,extra.warn??.22,.10,{origin:point(q),count:n,speed,angle,...extra});
}
function crossing(b,t,p,q,w,warn,hold,extra={}){
  cue(b,'stroke',t,warn,hold,{origin:point(p),to:point(q),width:w,...extra});
}
function panel(b,t,p,q,rx,ry,warn=.64,run=1.4,extra={}){
  cue(b,'panel',t,warn,run,{origin:point(p),to:point(q),rx,ry,...extra});
}
function dashPath(b,t,p,q,warn,run,echo=false){
  if(b.state!=='final')run/=b.difficulty?.movement||1;
  crossing(b,t,p,q,b.size*.72,warn,run,{moving:true,echo});
  if(!echo)travel(b,-1,p,q,t+warn,run);
}
function beamsAcross(b,t,side,n,round,warn=.6){
  for(let i=0;i<n;i++){
    const f=(i+.33+.28*(round%2))/n;
    if(Math.abs(f-(.46+.22*Math.sin(round)))<.055)continue;
    crossing(b,t,stageEdge(side,f),stageEdge(side+2,f),9,warn,.24,{ink:colorOf(b,i)});
  }
}
function curtainShots(b,t,side,n,k,extra={}){
  for(let i=0;i<n;i++){
    const f=(i+.5)/n;
    if(Math.abs(f-(.48+.27*Math.sin(k*.78)))<.082)continue;
    burst(b,t,stageEdge(side,f),1,230+45*(k%3),[Math.PI/2,Math.PI,-Math.PI/2,0][side%4],
      {square:true,ink:colorOf(b,i),...extra});
  }
}
function volleys(b,n,q,t=.16,dt=.36,count=32){
  for(let i=0;i<n;i++)burst(b,t+i*dt,q,count,210+40*(i%3),i*.18,{gaps:true,curve:(i%2?1:-1)*.13,ink:colorOf(b,i)});
}
function weave(b,t,n,count,spin){
  for(let i=0;i<n;i++){
    const q=stageEdge(i%4,((i*7%count)+.5)/count);
    ray(b,t+(i%4)*.16,.72,3.6,b,angleTo(b,q),10,{spin:i%3?spin*(i%2?1:-1):0});
  }
}
function classicZero(b){
  const c=patternOrigin();Object.assign(b,c);const reach=waveReach(state.arena,c,false,b.safeSize/2+12),gap=Math.floor(gameRandom()*12);
  for(let k=0;k<10;k++){
    const speed=reach/2.75,angle=(gap+k)*TAU/12;
    const n=Math.max(60,12*Math.ceil(reach/98)),angles=[];
    for(let i=0;i<n;i++)if(i/n>=2/12&&i/n<11/12)angles.push(angle+i*TAU/n);
    for(const x of [state.arena.x,state.arena.x+state.arena.w])for(const y of [state.arena.y,state.arena.y+state.arena.h]){
      const direction=Math.atan2(y-c.y,x-c.x),f=((direction-angle)/TAU%1+1)%1;
      if(f>=2/12&&f<11/12&&!angles.some(a=>Math.cos(a-direction)>.99998))angles.push(direction);
    }
    cue(b,'classicRing',.49*k,.92,.1,{origin:c,r:reach,angle,speed,round:k,angles});
    if(k>=7)burst(b,.49*k+.75,c,12,155,angle,{gaps:true});
  }
}
function scheduleDawn(b,m){
  const c=patternOrigin(),p=bossPrey(b),ph=b.phase;
  if(m==='needles')for(let k=0;k<4;k++){
    beamsAcross(b,k*.78,0,20+2*ph,k);if(k>=2)beamsAcross(b,k*.78+.16,1,12,k+1);
  }
  if(m==='loom')weave(b,0,12+ph,17,.17);
  if(m==='suns')for(let i=0;i<6;i++){
    const q=stagePoint(.5+.34*Math.cos(i*TAU/6),.5+.31*Math.sin(i*TAU/6));
    cue(b,'node',0,.65,2.9,{origin:q,r:17});volleys(b,4,q,.55+i*.075,.53,13);wave(b,2.95+i*.15,q,false,i,{speed:375});
  }
  if(m==='silkRain')for(let k=0;k<12;k++)curtainShots(b,k*.29,0,29,k,{sway:55,swayRate:2.6,ink:'#fff0db'});
  if(m==='silkPrison')for(let k=0;k<3;k++){
    const q=boundedPoint(p.x+(k%2?95:-30),p.y+(k-1)*58,125);
    cue(b,'cage',k*1.4,.63,1.14,{origin:q,r:182,side:(k+b.id)%4});
    burst(b,k*1.4,b,15,285,angleTo(b,q),{fan:1.7});
  }
  if(m==='halos')for(let k=0;k<3;k++){
    cue(b,'halo',k*.53,.68,2.5,{origin:point(b),r:80+28*k,round:k,speed:360+55*k});
  }
  if(m==='descent')for(let i=0;i<6+Math.min(3,ph-1);i++){
    const q=i%3===0?boundedPoint(p.x+i*8,p.y,80):stratifiedSpot(i,9,75),t=i*(.85-.02*ph)-.014*i*i;
    cue(b,'teleport',t,.51,.12,{origin:q});crossing(b,t,{x:q.x,y:state.arena.y},{x:q.x,y:state.arena.y+state.arena.h},59,.53,.28);
  }
  if(m==='eclipse'){
    Object.assign(b,c);for(let k=0;k<17;k++)for(const sign of [-1,1])burst(b,k*.24,polarPoint(c,90,k*.53*sign),14,250,k*.22*sign,{curve:sign*.26,gaps:true});
    weave(b,.32,5,9,.27);
  }
  if(m==='threads')for(let i=0;i<32;i++){
    const q=stageEdge(i%4,(i*.381966)%1),v=stageEdge((i+1+i%3)%4,(i*.618+.25)%1);
    crossing(b,i*.115,q,v,10,.57,.37);burst(b,i*.115+.49,q,4,345,angleTo(q,p),{fan:.28,square:true});
  }
}
function imperialRuns(b,m){
  const p=bossPrey(b),n=m==='pursuit'?8+b.phase:11;let q=point(b);
  for(let k=0;k<n;k++){
    const t=k*.70-.008*k*k,a=k*2.4;
    const v=m==='pursuit'?boundedPoint(p.x+300*Math.cos(a),p.y+195*Math.sin(a),64):stagePoint(k%2?.09:.91,.5+.36*Math.sin(a));
    dashPath(b,t,q,v,.38,.19);crossing(b,t+.22,q,v,14,.48,.53,{ink:colorOf(b,k)});
    burst(b,t+.29,v,m==='waltz'?21:7,320+k*7,angleTo(v,p),{fan:m==='waltz'?2.5:.85,ink:colorOf(b,k)});q=v;
  }
}
function schedulePrism(b,m){
  const c=patternOrigin(),p=bossPrey(b);
  if(m==='comets')for(let k=0;k<5+b.phase;k++)for(let j=0;j<8;j++){
    const q=stageEdge(j%4,(j*.31+.17*k)%1);burst(b,k*.63+j*.045,q,5,310+18*k,angleTo(q,c),{fan:.23,curve:(j%2?1:-1)*.42,ink:colorOf(b,j+k),streak:true});
  }
  if(m==='swords')for(let k=0;k<6;k++)for(let i=0;i<13;i++){
    const side=(k+i%2)%4,f=(i+.5)/13;
    crossing(b,k*.68,stageEdge(side,f),stageEdge(side+2,clamp(f+.18*Math.sin(k+i*.28),0,1)),13,.45,.27,{ink:colorOf(b,k+i)});
  }
  if(m==='imperialFlower')volleys(b,12,c,.3,.28,52);
  if(m==='pursuit'||m==='waltz')imperialRuns(b,m);
  if(m==='rainbow')for(let k=0;k<5;k++)for(let j=0;j<4;j++)curtainShots(b,k*.87+j*.13,j,23,k+j,{streak:true});
  if(m==='judgment'){
    for(let i=0;i<12;i++){
      const q=stageEdge(i%4,(Math.floor(i/4)+.5)/3);ray(b,i*.15,.62,.67,q,angleTo(q,targetForBeat(b,i)),17,{track:.31,targetBeat:i});
    }volleys(b,10,c,.34,.25,30);
  }
}
function portal(b,t,q,role,count=1,life=1){
  cue(b,'portal',t,.67,life,{origin:point(q),role,count});
}
function scheduleSovereign(b,m){
  const p=bossPrey(b),n=m==='army'?10:m==='generals'?4:m==='legion'?8:7;
  if(['army','generals','legion','portals','siegeCall'].includes(m)){
    const long=['portals','siegeCall','legion'].includes(m),duration=m==='siegeCall'?6.2:4.4;
    for(let i=0;i<n;i++){
      const q=m==='generals'?stagePoint(.5+.32*Math.cos(i*Math.PI/2),.5+.34*Math.sin(i*Math.PI/2)):stageEdge(i%4,((i*3%n)+.5)/n);
      portal(b,(i%4)*.12,q,m==='generals'?['radial','charger','miner','caller'][i]:i%3?'soldier':'gunner',long?(m==='legion'?5:4):1,long?duration:.35);
    }
    if(m==='legion'||m==='siegeCall')volleys(b,9,b,.45,.63,28);
  }else{
    if(!state.enemies.some(e=>e.master===b.id))for(let i=0;i<8;i++)portal(b,0,stageEdge(i%4,(i+.5)/8),'soldier');
    cue(b,'command',.7,.57,m==='obedience'?4.1:1.4,{order:m,origin:point(p)});
    if(m==='lastSacrifice'){volleys(b,9,b,2.1,.16,40);wave(b,2.8,b,false,1);}
    if(m==='huntOrder')volleys(b,5,b,.9,.3,19);
  }
}
function broadcastCameras(b,t,count,rounds){
  const p=bossPrey(b);
  for(let k=0;k<rounds;k++)for(let i=0;i<count;i++){
    const q=count===2?{x:b.x+(i?1:-1)*(132+24*Math.sin(k)),y:b.y-48+18*k}:stageEdge(i%4,(i+.5)/count);
    ray(b,t+k*.83+i*(count===2?.11:.09),.65,.32,q,angleTo(q,p)+(i%2?.08:-.08),18,{track:.32,targetBeat:k+i,aimOffset:i%2?.08:-.08,studio:true});
  }
}
function passingAds(b,t,k){
  const side=k%2?1:3,q=stageEdge(side,.15+(k*.23)%.7),v=stageEdge(side+2,.17+(k*.23)%.7);
  panel(b,t,q,v,66,29,.56,1.68,{ad:true});burst(b,t+1.99,v,9,225,k,{square:true});
}
function scheduleChannel(b,m){
  const p=bossPrey(b),hist=b.record||[],c=patternOrigin();
  if(m==='cameras'||m==='broadcast')broadcastCameras(b,0,m==='broadcast'?12:2,m==='broadcast'?3:5);
  if(m==='ads'||m==='broadcast')for(let i=0;i<7;i++)passingAds(b,i*.55,i);
  if(m==='flashShow'||m==='broadcast')for(let k=0;k<5;k++)for(const s of [-1,1]){
    const q={x:b.x+s*143,y:b.y-20};burst(b,k*.62,q,16,300+16*k,angleTo(q,p),{warn:.48,fan:1.8,square:true});
  }
  if(m==='replay'){
    const path=hist.length>1?hist.map(point):[point(p),{x:p.x+1,y:p.y}];
    cue(b,'recording',0,.8,2.8,{origin:path[0],path,lengths:pathMetrics(path),r:13});
  }
  if(m==='splitScreen'){
    for(const a of [0,Math.PI/2])ray(b,0,.72,.38,c,a,12,{opposed:true});
    volleys(b,6,stagePoint(.25,.25),.2,.47,21);
    for(let i=0;i<6;i++){
      const q=stagePoint(.54+i*.08,.05);crossing(b,i*.53,q,{x:q.x,y:c.y},16,.49,.39);
      panel(b,i*.52,stagePoint(.05,.57+i*.07),stagePoint(.48,.6+i*.06),26,18);
      const v=stagePoint(.78,.76);burst(b,i*.5,v,4,225,angleTo(v,p),{fan:.65,seek:.8,streak:true});
    }
  }
  if(m==='paparazzi')for(let k=0;k<9;k++){
    const q=boundedPoint(p.x+230*Math.cos(k*.93),p.y+170*Math.sin(k*.93),30);
    ray(b,k*.36,.51,.31,q,angleTo(q,p),17,{studio:true,track:.25});
    burst(b,k*.36,b,14,300,angleTo(b,p),{fan:1.6,square:true});
  }
  if(m==='censor')for(let i=0;i<23;i++){
    const q=i%6?stratifiedSpot(i,23):point(p);panel(b,i*.155,q,q,45+i%3*16,21+i%4*4,.62,.43,{censor:true});
    if(i%4===0)broadcastCameras(b,i*.155,2,1);
  }
  if(m==='signalDrop')for(let i=0;i<7;i++){
    const q=stratifiedSpot(i,7,88);cue(b,'teleport',i*.59,.36,.1,{origin:q});burst(b,i*.59+.28,q,14,320,angleTo(q,p),{fan:1.9,square:true});
    ray(b,i*.59+.2,.41,.23,q,angleTo(q,p)+.22,18,{studio:true});
  }
}
function scheduleGeneral(b,m){
  const p=bossPrey(b),c=patternOrigin();
  if(m==='formation')for(let k=0;k<9;k++)curtainShots(b,k*.43,k%4,19,k,{sway:k%2?0:34,swayRate:2});
  if(m==='bombard')for(let k=0;k<8;k++)burst(b,k*.39,b,12,280+(k%3)*45,angleTo(b,p)+Math.sin(k)*.26,{fan:1.95,square:true,radius:5+k%3*3,split:k%2===0?.89:0});
  if(m==='march'||m==='siegeMemory')for(let i=0;i<12;i++){
    const q=stageEdge(i%4,(Math.floor(i/4)+.6)/4),v=stageEdge(i%4+2,(Math.floor(i/4)+.6)/4);
    panel(b,i*.19,q,v,18,18,.55,m==='march'?2.6:1.2,{soldier:true});
    for(let k=0;k<3;k++){const h=mixPoint(q,v,k/3);burst(b,i*.19+.55+k*(m==='march'?.86:.4),h,6,255,angleTo(h,p),{fan:1,square:true});}
  }
  if(m==='chains'||m==='protocol'){
    weave(b,0,m==='chains'?10:6,15,m==='protocol'?.43:.09);
    if(m==='chains')volleys(b,7,b,.3,.4,20);
    else for(let k=0;k<20;k++){const q=k%6?stratifiedSpot(k,20):point(p);cue(b,'dial',k*.13,.58,.27,{origin:q,r:47,index:k});if(!(k%4))burst(b,k*.13,b,30,310,k,{square:true,gaps:true});}
  }
  if(['counter','absoluteOrder','echoes'].includes(m)){
    let last=point(b);
    for(let k=0;k<7;k++){
      const q=stagePoint(k%2?.10:.90,.5+.32*Math.sin(k*1.41));
      dashPath(b,k*.7,last,q,.48,.18);
      if(m==='echoes')for(let j=1;j<=2;j++)dashPath(b,k*.7+j*.29,last,q,.48,.18,true);
      else burst(b,k*.7+.42,q,15,310,k,{square:true,gaps:true});
      if(m==='absoluteOrder')beamsAcross(b,k*.7,k%2,10,k,.55);
      if(m==='counter')curtainShots(b,k*.7,2,13,k);
      last=q;
    }
  }
}
function scheduleFrontier(b,m){
  const a=state.arena,p=bossPrey(b);
  if(m==='jaws')for(let k=0;k<4;k++)for(const side of [1,3]){
    for(let j=0;j<10;j++){if(Math.abs(j-(3+Math.sin(k)*2))<1.45)continue;
      panel(b,k*1.14,stageEdge(side,(j+.5)/10),stagePoint(side===1?.43:.57,(j+.5)/10),35,a.h/21,.58,.72,{jaw:true});}
  }
  if(m==='grind')for(let k=0;k<6;k++)burst(b,k*.55,b,7,160+35*(k%3),angleTo(b,p),{fan:2.1,radius:6+4*(k%3),bounce:3,shatter:k%3===2});
  if(m==='quakes')for(let k=0;k<6;k++)wave(b,k*.53,stagePoint(.17+.6*(k%2),.25+.46*(k%3)/2),true,k,{speed:410+k*24});
  if(m==='bulldoze')for(let k=0;k<4;k++){
    const q=stagePoint(k%2?.92:.08,.28+.13*k),v=stagePoint(k%2?.08:.92,.28+.13*k);
    dashPath(b,k*1.02,q,v,.62,.23);
    for(let i=0;i<6;i++)burst(b,k*1.02+.45+i*.045,mixPoint(q,v,i/6),5,108,i,{square:true});
  }
  if(['rubble','gates','chaseLasers','headfall','trains','terminal','collapseRun'].includes(m)){
    const finale=m==='collapseRun',n=finale?12:m==='terminal'?9:7;
    for(let k=0;k<n;k++)cue(b,'chaseBeat',k*(finale?.55:.55),0,.04,{mode:m,round:k});
    if(finale)cue(b,'chaseBeat',7.15,0,.04,{mode:'escape',round:0});
  }
}
const ENCORE_SCORE={dawn:scheduleDawn,prism:schedulePrism,sovereign:scheduleSovereign,channel:scheduleChannel,general:scheduleGeneral,frontier:scheduleFrontier};


function scoreSignature(b,m){
  ENCORE_SCORE[b.kind](b,m);
  const tempo=1+.085*(b.phase-1)+(b.kind==='prism'&&b.hp/b.maxHp<.2?.12:0);
  for(const e of b.events){
    e.start/=tempo;e.on/=tempo;e.end/=tempo;
    if(e.spin)e.spin*=tempo;
    if(e.track)e.track/=tempo;
    if(e.kind==='wave')e.speed*=tempo;
  }
  for(const tr of b.tracks){tr.start/=tempo;tr.duration/=tempo;}
  b.timer/=tempo;
}
