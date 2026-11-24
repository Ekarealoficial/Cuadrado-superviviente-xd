'use strict';
function layoutCorridor(a){
  const {x,y,w,h}=a;
  a.walls=[{x:x-60,y:y-60,w:w+120,h:60},{x:x-60,y:y+h,w:w+120,h:60},
    {x:x-60,y:y-60,w:60,h:h+120},{x:x+w,y:y-60,w:60,h:h+120}];
  for(const wall of a.walls)wall.isArena=true;
}
function enterChase(b){
  if(b.chasing)return;
  b.chasing=true;const a=state.arena;
  if(!a.chase){a.baseW=a.w;a.chase=b.id;a.w+=a.w*.5;layoutCorridor(a);}
  b.x=a.x+58;b.y=a.y+a.h/2;b.breach=state.time;
  state.shake=Math.max(state.shake,14);bossCue('frontierPhase',b);
}
function chaseGift(){
  const p=state.player;
  for(const b of livingBosses())if(b.kind==='frontier'&&b.chasing&&!(p.chaseGifts||[]).includes(b.id)){
    (p.chaseGifts||=[]).push(b.id);const card=SPECIAL_CARDS.find(c=>c.id==='dash');
    for(let i=0;i<4;i++)applyCard(card);
    if(!state.slots.includes('dash')&&state.slots.includes(null))state.slots[state.slots.indexOf(null)]='dash';
    p.dashGiftAt=state.time;addFloat(p.x,p.y-44,'+4 DASH — ¡CORRE!','#83fffc');
  }
}
function chaseCamera(p){const a=state.arena;if(!a?.chase)return p.x+p.vx*.16;
  return p.x-Math.max(0,(p.x-a.x-58)*.43);}
function chaseZoom(p){
  if(!state.arena?.chase)return 1;
  const width=state.viewWidth||W,distance=Math.max(1,p.x-state.arena.x-58);
  return Math.min(1,width/(distance*1.24+145));
}
function updateChase(b,dt){
  if(!b.chasing)return;
  const a=state.arena;if(!a?.chase)return;
  const party=roomTargets.length?roomTargets:[state.player];
  if(a.chase===b.id){
    const slow=Math.min(...party.map(p=>p.speed||320)),lead=Math.min(...party.map(p=>p.x))-b.x;
    const speed=slow*(b.hp/b.maxHp<.2?.72:.57)+clamp((lead-350)*.48,0,slow*.7);
    a.x+=speed*dt;
    a.walls[0].x=a.walls[1].x=a.walls[2].x=a.x-60;a.walls[3].x=a.x+a.w;
    // Keep other encounters in world space. Bring a trailing body back between
    // attacks, so even a stationary caster stays reachable in a long chase.
    for(const other of livingBosses())if(other!==b&&['idle','recover','drift'].includes(other.state)&&other.x<a.x+55){
      const shift=a.x+200-other.x;other.x+=shift;
      for(const q of [...(other.parts||[]),...(other.planets||[]),...other.balls])q.x+=shift;
    }
  }
  b.x=a.x+58;b.y=a.y+a.h/2;
}
function endChase(b){
  const a=state.arena;if(!a||a.chase!==b.id)return;
  const other=livingBosses().find(o=>o!==b&&o.chasing);
  if(other){a.chase=other.id;return;}
  const players=roomTargets.length?roomTargets:[state.player],xs=players.map(p=>p.x);
  a.w=Math.max(a.baseW||1366,Math.max(...xs)-Math.min(...xs)+180);
  a.x=(Math.min(...xs)+Math.max(...xs)-a.w)/2;delete a.chase;delete a.baseW;layoutCorridor(a);
  for(const o of livingBosses())if(o!==b&&o.state!=='final'){
    const dest=boundedPoint(o.x,o.y,o.size/2);Object.assign(o,dest);
  }
}
function chaseBeat(b,m,k){
  const a=state.arena,p=targetForBeat(b,k),t=b.age;
  const x=Math.max(b.x+420,p.x+360),y=a.y+a.h*(.52+.29*Math.sin(k*.88)),size=b.safeSize||30;
  if(['gates','terminal','collapseRun','escape'].includes(m)){
    const gap=Math.max(size+85,m==='escape'?180:130);
    const door=clamp(y,a.y+gap,a.y+a.h-gap);
    for(const [lo,hi] of [[a.y,door-gap/2],[door+gap/2,a.y+a.h]]){
      const q={x:m==='escape'?b.x+60:x,y:(lo+hi)/2};
      panel(b,t,q,{x:m==='escape'?x+650:x-105,y:q.y+(k%2?22:0)},m==='escape'?16:24,(hi-lo)/2,.57,m==='escape'?.99:1.35,{jaw:true});
    }
  }
  if(['rubble','terminal','collapseRun'].includes(m)){
    const q={x:b.x+40,y:a.y+a.h*(.5+.4*Math.sin(k*1.3))};
    burst(b,t,q,9,390+k%3*30,angleTo(q,p),{fan:.9,square:true,split:k%2?.64:0,streak:true});
  }
  if(m==='chaseLasers'){
    const q={x:b.x,y:a.y+a.h*(.12+.76*((k*3)%7)/6)};
    ray(b,t,.59,.54,q,0,20,{spin:(k%3-1)*.11});
  }
  if(m==='headfall'||m==='collapseRun')for(let i=0;i<3;i++){
    const q={x:x+70+i*94,y:a.y+a.h*((k*3+i*2)%11+.5)/11};
    if(Math.abs(q.y-y)<68)continue;
    panel(b,t+.06*i,q,{x:q.x-520,y:q.y+18*Math.sin(k)},17+i*7,19+i*9,.5,1);
  }
  if(m==='trains')for(let j=0;j<9;j++)burst(b,t+j*.071,{x:x+160,y},1,350,Math.PI,{radius:9,sway:96,swayRate:2.4,streak:true});
}
const GENERAL_LINES=[
 ['¿OTRA ARMA DE LOS CÍRCULOS?','NO VOLVERÁN A ATRAVESAR NUESTRAS DEFENSAS','ESPERA... ESA FORMA...'],
 ['NO PUEDE SER...','¿UN CUADRADO?','PENSÉ QUE NOS HABÍAN EXTERMINADO A TODOS','¿CUÁNTO TIEMPO HA PASADO?'],
 ['TÚ... SOBREVIVISTE','NO ENTIENDES...','ME CONSERVARON PARA ESTO','ME CONVIRTIERON EN UN ARMA PARA MATAR AL ÚLTIMO DE NOSOTROS','¡ALÉJATE! ¡NO PUEDO CONTROLARLO!'],
 ['¡NO QUIERO HACER ESTO!','¡DESTRUYE EL NÚCLEO!','¡ANTES DE QUE ME OBLIGUEN A MATARTE!']
];
const SHOW_LINES=['ESTE PERDEDOR CREE QUE ME GANARÁ','CUADRADO PIERDE EN DIRECTO','¡MIREN CÓMO CORRE!','¿EL ÚLTIMO CUADRADO? ¡QUÉ DECEPCIÓN!','SONRÍE, ESTÁS EN DIRECTO','¡NO CAMBIEN DE CANAL!','ESTO SE PONE INTERESANTE'];
function encounterVoice(b,s,n=2){b.caption=s;b.captionUntil=b.clock+n;}
function tickSignature(b,dt){
  const p=bossPrey(b);
  if(b.entry&&b.state==='recover'&&b.clock<1.12){
    const u=clamp(b.clock/1.12,0,1);Object.assign(b,mixPoint(b.entry.from,b.entry.to,1-(1-u)**3));
  }
  if(b.kind==='dawn'&&b.state==='transition'){
    const goal=stagePoint(.5,.17,80);Object.assign(b,mixPoint(b,goal,Math.min(1,dt*3.6)));
  }
  if(b.kind==='frontier')updateChase(b,dt);
  if(b.kind==='channel'||b.kind==='general'){
    const hist=b.record||=[];if(!hist.length||state.time-hist.at(-1).t>.13){
      hist.push({x:p.x,y:p.y,t:state.time});if(hist.length>29)hist.shift();}
    if(b.state!=='final'&&(!b.caption||b.clock>b.captionUntil+1.1)){
      const lines=b.kind==='general'?GENERAL_LINES[b.phase-1]:SHOW_LINES;
      encounterVoice(b,lines[(b.words||0)%lines.length]);b.words=(b.words||0)+1;
    }
    if(p.dashTimer>0&&!b.sawDash&&b.clock>(b.reactionAt||0)&&b.state!=='final'){
      encounterVoice(b,b.kind==='general'?'RECONOZCO ESA MANIOBRA...':'¡MIREN CÓMO CORRE!');b.reactionAt=b.clock+3;
    }b.sawDash=p.dashTimer>0;
  }
  if(ENCORE[b.kind]&&(!b.trail.length||b.clock-b.trail.at(-1).t>.055)){
    b.trail.push({x:b.x,y:b.y,t:b.clock});if(b.trail.length>25)b.trail.shift();
  }
}
function encoreFinal(b){
  const c=patternOrigin(),k=b.kind;b.layers=[];
  if(k==='dawn'){
    travel(b,-1,b,{x:c.x,y:c.y-145},0,1.2);
    for(let i=0;i<3;i++){burst(b,.7+i*1.37,b,74,245+i*52,i*.16,{gaps:true});wave(b,.9+i*1.30,b,false,i,{speed:410});}
    for(let i=0;i<8;i++)crossing(b,4.4+i*.19,b,stageEdge(i%4,(i+.5)/8),10,.47,.16);
  }else if(k==='prism'){
    for(let i=0;i<18;i++)burst(b,.37+i*.32,polarPoint(b,77,i*.83),22,220+i*7,i*.26,{ink:colorOf(b,i),streak:true,gaps:true,curve:(i%2?1:-1)*.16});
  }else if(k==='sovereign'){
    for(let i=0;i<18;i++)portal(b,i*.20,stageEdge(i%4,(i*.38)%1),'rebel');
    for(let i=0;i<4;i++)wave(b,3.15+i*.42,b,false,i,{speed:435});
  }else if(k==='channel'){
    for(let i=0;i<15;i++){const sign=i>7||i%2?1:-1;burst(b,.3+i*.34,{x:b.x+sign*145,y:b.y-35},9,260+i*4,i*2.3,{fan:1.3,square:true});}
  }else if(k==='general'){
    travel(b,-1,b,c,0,.8);
    for(let i=0;i<24;i++){
      const q=stageEdge(i%4,(i*.618)%1);crossing(b,.55+i*.205,q,stageEdge(i%4+2,(i*.618+.14)%1),18,.63,.37);
    }
  }else if(k==='frontier'){
    enterChase(b);scheduleFrontier(b,'collapseRun');
  }
  b.timer=Math.max(FINAL_TIME[k],b.timer);b.finalLength=b.timer;
}
