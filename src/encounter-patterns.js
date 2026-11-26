'use strict';
// Choreographies use simulation seconds. Only the server (or solo simulation)
// chooses paths. Clients draw the same coordinates and intervals from snapshots.
const ENCOUNTER_SPECS={
  beacon:{size:180,color:'#ff487d',limits:[.75,.45,.2],moves:[['tracking','curtain','sweep','refraction'],['emitters'],['fusion'],['overload']]},
  twins:{size:95,color:'#ffac57',limits:[.4,0],moves:[['link','exchange','pulses','pincer'],['binary'],['positiveStorm','negativeStorm']]},
  heart:{size:170,color:'#ff665f',limits:[.60,.25],moves:[['pistons','turret','transmission','discharge','shock'],['rebuild','machineCycle'],['leak']]},
  monolith:{size:230,color:'#83e4eb',limits:[],moves:[['stomp','wall','avalanche','impact','rhythm']]}
};
Object.assign(PATTERN_BOSSES,ENCOUNTER_SPECS);
const MOVE_NAMES={tracking:'Láser de seguimiento',curtain:'Cortina de láseres',sweep:'Barrido orbital',refraction:'Láser refractado',emitters:'Emisores secundarios',fusion:'Rayo de fusión',overload:'Sobrecarga total',
 link:'Enlace peligroso',exchange:'Intercambio cruzado',pulses:'Pulsos alternos',pincer:'Pinza',binary:'Doble núcleo',positiveStorm:'Polaridad positiva',negativeStorm:'Polaridad negativa',
 pistons:'Pistones',turret:'Torreta rotatoria',transmission:'Transmisión de energía',discharge:'Descarga del núcleo',shock:'Generador de ondas',rebuild:'Reensamblaje',machineCycle:'Sobrecarga mecánica',leak:'Fuga de energía',
 stomp:'Pisotón sísmico',wall:'Muralla en avance',avalanche:'Alud de bloques',impact:'Barrido de impacto',rhythm:'Ritmo de destrucción',
 cuts:'Corte cartesiano',lunge:'Embestida fractal',fault:'Falla',replicas:'Réplicas',prison:'Prisión',collapse:'Colapso fractal',hands:'Agujas',seconds:'Segundos perdidos',pendulum:'Péndulo',ticks:'Tiempo fragmentado',rewind:'Rebobinado',zero:'Hora cero',chime:'Última campanada',garden:'Jardín de proyectiles',petals:'Pétalos descendentes',dance:'Danza',stars:'Constelación',inverse:'Órbita inversa',rain:'Lluvia infinita',flower:'Flor final'};
for(const m of ['curtain','sweep','refraction','overload','fusion','link','binary','machineCycle','wall','rhythm','stomp','landing','leak','final'])HEAVY_MOVES.add(m);
const POLAR=['#ffa54d','#58e9ff'];
const ROLES=['turret','transmission','pistons','shock'];
const FINAL_TIME={fractal:4.9,clock:6.9,crown:6.1,beacon:5.5,twins:4.2,heart:5.4,monolith:6.2};
const point=(q)=>({x:q.x,y:q.y});
function polarPoint(q,r,a){return {x:q.x+r*Math.cos(a),y:q.y+r*Math.sin(a)};}
function mixPoint(a,b,t){return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}
function angleTo(a,b){return Math.atan2(b.y-a.y,b.x-a.x);}
function makeComponents(b){
  if(b.kind!=='twins'&&b.kind!=='heart')return;
  const twins=b.kind==='twins',n=twins?2:4;
  b.parts=Array.from({length:n},(_,i)=>{
    const hp=b.maxHp*(twins?.5:.19),q=polarPoint(b,twins?145:126+12*i,i*TAU/n);
    return {...boundedPoint(q.x,q.y,50),component:true,index:i,size:twins?95:46,balls:[],hp,maxHp:hp,color:twins?POLAR[i]:['#ffc071','#9eeaff','#ea8b85','#c8b7ff'][i],role:twins?['Positivo','Negativo'][i]:ROLES[i]};
  });
  b.repairs=1;
}
function activeParts(b){return (b.parts||[]).filter(q=>q.hp>0);}
function availablePatterns(b){
  if(b.kind==='twins'&&b.phase===3)return [activeParts(b)[0]?.index===0?'positiveStorm':'negativeStorm'];
  if(b.kind==='frontier'&&b.phase===2)return ENCORE.frontier.moves[1].filter(m=>m!=='terminal'||b.hp/b.maxHp<=.2);
  const moves=PATTERN_BOSSES[b.kind].moves.slice(0,b.phase).flat();
  if(b.kind!=='heart')return moves;
  return moves.filter(m=>(!ROLES.includes(m)||b.parts.some(q=>q.role===m&&q.hp>0))&&(m!=='rebuild'||b.repairs>0&&activeParts(b).length<4));
}
function partDefeated(q){
  if(q._dying)return;
  const b=livingBosses().find(o=>o.parts?.includes(q));
  if(!b||b.state==='final')return;
  q._dying=true;q.hp=0;q.brokenAt=b.clock;spawnParticles(q.x,q.y,20,q.color,1);bossCue(b.kind+'Phase',q);
  if(b.kind==='heart')return;
  b.hp=activeParts(b).reduce((sum,v)=>sum+v.hp,0);
  if(!b.hp){b.lastTwin=q.index;b.x=q.x;b.y=q.y;killBoss(b);return;}
  b.fallen={...point(q),color:q.color};
  b.phase=3;b.deck=[];beginEncounterMove(b,'absorb');
}
// Damage from every weapon, including damage over time, uses the same core plating.
function hurtTarget(q,amount){
  if(q._dying||q.state==='final'||q.kind==='frontier'&&q.state==='transition')return;
  if(q.kind==='frontier'&&q.phase===1&&q.hp<=q.maxHp*.5)return;
  amount=Math.min(Number.MAX_VALUE,amount);
  if(q.kind==='heart')amount/=1+.13*activeParts(q).length;
  if(q.training){
    const t=q.training;t.start??=state.time;t.total=Math.min(Number.MAX_VALUE,t.total+amount);t.hits++;
    if(t.regen){q.hitFlash=.12;return;}
  }
  q.hp-=amount;
  if(q.kind==='frontier'&&q.phase===1)q.hp=Math.max(q.maxHp*.499,q.hp);
}
function reflectedPath(origin,angle,count){
  const a=state.arena,points=[point(origin)];let q=point(origin),dx=Math.cos(angle),dy=Math.sin(angle);
  for(let i=0;i<=count;i++){
    const tx=Math.abs(dx)<1e-8?Infinity:((dx>0?a.x+a.w:a.x)-q.x)/dx;
    const ty=Math.abs(dy)<1e-8?Infinity:((dy>0?a.y+a.h:a.y)-q.y)/dy;
    const d=Math.max(0,Math.min(tx,ty));q={x:q.x+dx*d,y:q.y+dy*d};points.push(q);
    if(tx<=ty+1e-7)dx=-dx;if(ty<=tx+1e-7)dy=-dy;
  }
  return points;
}
function makeScore(b){
  b.events=[];b.tracks=[];b.beat=0;b.age=0;b.timer=0;b.lastBeat=-2;b.lastCueAge=-1;
}
function cue(b,kind,start,warn,duration,data={}){
  if(b.difficulty && ['burst','volley','portal'].includes(kind) && data.count>1 && b.state!=='final'){
    data={...data,baseCount:data.count,count:Math.round(data.count*(kind==='portal'?1+(b.difficulty.density-1)*.4:b.difficulty.density))};
  }
  b.events.push({kind,start,on:start+warn,end:start+warn+duration,...data});
  b.timer=Math.max(b.timer,start+warn+duration+.25-b.age);
}
function travel(b,index,from,to,start,duration){
  b.tracks.push({index,from:point(from),to:point(to),start,duration});
}
function ray(b,start,warn,duration,origin,angle,width,extra={}){
  if(extra.spin && b.difficulty && b.state!=='final'){
    const tempo=b.difficulty.movement;
    extra={...extra,spin:extra.spin*tempo};duration/=tempo;
  }
  cue(b,'ray',start,warn,duration,{origin:point(origin),angle,width,...extra});
}
function volley(b,start,origin,count,speed,turn,extra={}){
  cue(b,'volley',start,.18,.1,{origin:point(origin),count,speed,turn,...extra});
}
function emitterPoint(b,i,spread=0){
  const angle=i*Math.PI/2+b.clock*.55;
  return polarPoint(b,115+spread,angle);
}
function emitterFan(b,start,final=false){
  const c=patternOrigin(),a=state.arena;
  b.postStart=start;b.postEnd=start+3.14;
  b.posts=Array.from({length:4},(_,i)=>({x:c.x+Math.cos(i*Math.PI/2)*a.w*.32,y:c.y+Math.sin(i*Math.PI/2)*a.h*.32}));
  for(const [i,q] of b.posts.entries())ray(b,start+i*(final?.53:.27),final?.9:.64,final?.32:.48,q,final?angleTo(q,c)+i*.13:angleTo(q,bossPrey(b)),23,{post:i});
}
function sweep(b,start,turn=1){ray(b,start,b.phase>2?.72:.82,b.phase>2?1.3:1.58,b,b.angle,33,{opposed:true,spin:turn*(2*Math.PI/3)*(1+.12*(b.phase-1))/(b.phase>2?1.3:1.58)});}
function fusion(b,start,duration=1){ray(b,start,1.02,duration,b,b.angle,90,{impact:16});}
function laserCurtain(b,start,vertical,n){
  const a=state.arena,span=vertical?a.w:a.h;
  // Switch banks on the beat. Adjacent beams always leave a body-sized lane.
  const slots=Math.min(Math.round(n*(1+.5*((b.difficulty?.density||1)-1))),Math.max(2,Math.floor(span/((b.safeSize||30)+27))));
  for(let bank=0;bank<3;bank++)for(let i=0;i<slots;i++){
    const f=(i+.35+.30*(bank%2))/slots;
    const q={x:a.x+(vertical?f*a.w:0),y:a.y+(vertical?0:f*a.h)};
    ray(b,start+bank*.67+(i%2)*.08,.6,.4,q,vertical?Math.PI/2:0,19);
  }
}
function scheduleBeacon(b,m){
  const ph=b.phase,late=ph>=3;
  if(m==='tracking'){
    for(let k=0;k<3+ph;k++)for(let j=0;j<(late?3:2);j++)
      ray(b,k*(1.75-.075*ph),1.12-.05*ph,.43,b,b.angle,34,{track:.75-.04*ph,aimOffset:(j?j===1?.32:-.32:0),targetBeat:k});
  }else if(m==='curtain'){
    b.vertical=!b.vertical;laserCurtain(b,0,b.vertical,ph===1?3:ph===2?5:7);
  }else if(m==='sweep')sweep(b,0);
  else if(m==='refraction')cue(b,'path',0,.83,.58,{points:reflectedPath(b,b.angle,2+Math.floor(gameRandom()*2)),width:27});
  else if(m==='emitters')emitterFan(b,0);
  else if(m==='fusion')fusion(b,0,.76);
  else{
    b.laserGate=true;sweep(b,0);emitterFan(b,.16);
    laserCurtain(b,2.35,true,8);sweep(b,2.24,-1);
    laserCurtain(b,4.9,false,7);fusion(b,5.13,.65);
  }
}
function scheduleTwins(b,m){
  const c=patternOrigin(),a=state.arena,p=bossPrey(b),[pos,neg]=b.parts;
  if(m==='link'||m==='binary'){
    cue(b,'orbit',0,1, m==='link'?3.6:3,{wide:m==='link',radius:m==='link'?210:85,center:c});
    if(m==='link'){
      cue(b,'link',0,1,3.6,{width:24});
      for(let k=0;k<5;k++)for(const q of b.parts)volley(b,2.55+k*.3,q,8,245,k*.28,{part:q.index,color:q.color});
    }
    else{
      for(let k=0;k<12;k++)for(const q of b.parts)volley(b,.9+k*.25,q,6,200,k*.18+q.index*.28,{part:q.index,color:q.color,square:!q.index});
      for(const q of b.parts)wave(b,4.15,q,!q.index,q.index,{part:q.index});
    }
  }else if(m==='exchange'||m==='pincer'){
    const n=m==='exchange'?6+Math.floor(gameRandom()*4):1;
    let pair=b.parts.map(point);
    {pair=[{x:a.x+60,y:clamp(p.y-a.h*.16,a.y+55,a.y+a.h-55)},{x:a.x+a.w-60,y:clamp(p.y+a.h*.16,a.y+55,a.y+a.h-55)}];b.parts.forEach((q,i)=>travel(b,i,q,pair[i],0,.42));}
    for(let k=0;k<n;k++){
      const start= .46+k*(.97-.045*b.phase);
      const ends=m==='exchange'?[pair[1],pair[0]]:pair.map(q=>{const v=polarPoint(q,Math.hypot(q.x-p.x,q.y-p.y)+130,angleTo(q,p));return boundedPoint(v.x,v.y,50);});
      pair.forEach((q,i)=>{
        cue(b,'dash',start,m==='exchange'?.55:.8,m==='exchange'?.19:.35,{origin:q,to:ends[i],width:80,index:i});
        travel(b,i,q,ends[i],start+(m==='exchange'?.55:.8),m==='exchange'?.19:.35);
        if(m==='pincer')wave(b,start+1.15,ends[i],!i,i);
      });
      if(m==='exchange'){
        volley(b,start+.46,mixPoint(...pair,.5),16,245+k*4,k*.27,{gaps:true});
        for(const [i,q] of ends.entries())volley(b,start+.56,q,8+b.phase*2,310,angleTo(q,p),{fan:.95,color:POLAR[i],square:!i});
      }
      pair=ends;
    }
  }else if(m==='pulses'){
    for(let k=0;k<3;k++){const q=k%2?neg:pos,v=k%2?pos:neg;wave(b,k*1.05,q,!q.index,k);volley(b,.46+k*1.05,v,18,200,k*.15,{gaps:true,color:v.color});}
  }else if(m==='absorb'){wave(b,0,b.fallen,false,0,{color:b.fallen.color});}
  else{
    const q=activeParts(b)[0];if(!q)return;
    const positive=m==='positiveStorm',count=positive?9:12;
    let from=point(q);
    for(let k=0;k<count;k++){
      const s=k*(positive?.36:.26),a0=k*.28;
      if(positive){
        const dest=boundedPoint(c.x+Math.cos(a0+q.index)*a.w*.36,c.y+Math.sin(a0*2)*a.h*.33,52);
        travel(b,q.index,from,dest,s,.35);from=dest;
        if(k%3===0)ray(b,s,.60,.31,dest,angleTo(dest,p),20);
        volley(b,s+.18,q,32,265+k*7,a0,{part:q.index,color:q.color,square:true,gaps:true});
      }else for(const sign of [-1,1])volley(b,s,q,27,sign>0?235:305,sign*a0,{part:q.index,color:q.color,gaps:true,curve:sign*.19});
    }
    wave(b,3,q,!q.index,1);
  }
}
function moduleAttack(b,role,start,short=false){
  const q=b.parts.find(v=>v.role===role);if(!q||q.hp<=0)return;
  const data={part:q.index},p=bossPrey(b);
  if(role==='pistons'){
    const a=state.arena,c=patternOrigin(),n=short?2:6+Math.floor(gameRandom()*3);
    let from=point(q),side=from.x<c.x?1:-1;
    for(let i=0;i<n;i++,side=-side){
      const target=targetForBeat(b,i),to={x:c.x+side*(a.w/2-32),y:clamp(2*target.y-from.y,a.y+40,a.y+a.h-40)},s=start+i*.88;
      cue(b,'dash',s,.53,.19,{origin:from,to,width:46,index:q.index,...data});travel(b,q.index,from,to,s+.53,.19);
      for(const sign of [-1,1])volley(b,s+.54,to,5,280,angleTo(from,to)+sign*Math.PI/2,{fan:1,square:true,color:q.color,requires:q.index});
      from=to;
    }
    travel(b,q.index,from,q,start+n*.88,.36);b.timer=Math.max(b.timer,start+n*.88+.42);
  }else if(role==='transmission'){
    const nodes=activeParts(b).filter(o=>o!==q).concat([b]);
    for(const [i,other] of nodes.entries()){
      const s=start+i*(b.phase===1?.42:.27);
      cue(b,'wire',s,.68,.66,{...data,targetIndex:other===b?-1:other.index,width:18});
      ray(b,s,.68,.88,q,angleTo(q,other),20,{requires:q.index,spin:(i%2?-1:1)*.25});
      if(b.phase>=2&&other!==b)ray(b,s+.12,.62,.65,other,angleTo(q,other),16,{requires:other.index});
    }
  }else if(role==='turret'){
    cue(b,'turretOrbit',start,.35,short?1:2.7,{...data,angle:angleTo(b,q)});
    for(let i=0;i<(short?4:10);i++)volley(b,start+.3+i*.25,q,9,220,i*.22,{...data,color:q.color});
  }else for(let i=0;i<(short?2:3+b.phase);i++)wave(b,start+i*.66,q,i%3===1,i,{speed:340+i*59,requires:q.index});
}
function scheduleHeart(b,m){
  if(ROLES.includes(m))moduleAttack(b,m,0);
  else if(m==='rebuild'){
    const q=b.parts.find(v=>v.hp<=0);
    if(q&&b.repairs>0){b.repairs--;b.repairHP=b.hp;cue(b,'repair',0,2,.2,{index:q.index});}
  }else if(m==='machineCycle')['turret','transmission','shock','pistons'].forEach((role,i)=>moduleAttack(b,role,i*.34,true));
  else{
    for(let i=0;i<(m==='leak'?14:4+b.phase);i++){
      volley(b,.55+i*(m==='leak'?.25:.44),b,m==='leak'?42:20+4*b.phase,210+55*(i%3),i*.16,{gaps:true});
      if(m==='leak'&&i>=6&&i%2===0)for(const side of [-1,1])ray(b,i*.25,.64,.39,b,b.angle+side*i*.31,17);
    }
    if(b.phase===3)for(const missing of b.parts.filter(q=>!q.hp)){
      const source=activeParts(b)[0]||b;
      if(missing.role==='transmission')ray(b,.3,.67,.55,source,b.angle,17,{spin:.24});
      else if(missing.role==='shock')wave(b,.75,source,false,1);
      else burst(b,.56,source,missing.role==='pistons'?7:22,315,b.angle,{fan:missing.role==='pistons'?1.1:TAU});
    }
    if(m==='leak')cue(b,'burnout',3.6,.52,.1);
  }
}
function debris(b,start,n){
  for(let i=0;i<n;i++){
    const origin=i===0?point(bossPrey(b)):arenaSpot(60);
    cue(b,'block',start+i*.24,.84,.22,{origin,r:36});
  }
}
function scheduleMonolith(b,m){
  const a=state.arena,c=patternOrigin();
  if(m==='stomp'||m==='rhythm'){
    let s=.24;
    const n=m==='stomp'?5+Math.floor(gameRandom()*3):9;
    for(let i=0;i<n;i++){wave(b,s,b,i%2===0,i,{speed:325+i*35});s+=m==='stomp'?.72:1.04-i*.093;}
  }else if(m==='wall'){
    const rounds=3+Math.floor(gameRandom()*2),n=4+Math.floor(gameRandom()*4);
    let s=0;
    for(let k=0;k<rounds;k++){
      const door=.5+.14*Math.sin(k*1.2);
      for(let i=0;i<n;i++){
        cue(b,'wall',s,.76,1.48,{horizontal:(i+k)%2===0,reverse:(i+k)%3===1,door});
        s+=i%3===1?.13:.83;
      }
      s+=.72;
    }
  }else if(m==='avalanche'){
    for(const [k,count] of [6,8,10,13].entries())cue(b,'blockRound',k*.88,0,.01,{round:k,count});
    b.timer=4.35;
  }else{
    const n=4+Math.floor(gameRandom()*3);let from=point(b),s=0;
    for(let i=0;i<n;i++){
      const q={x:i%2?a.x+a.w-118:a.x+118,y:clamp(bossPrey(b).y+Math.sin(i*1.5)*a.h*.23,a.y+118,a.y+a.h-118)};
      const to={x:2*c.x-q.x,y:q.y},run=i===n-1?.19:.27;
      travel(b,-1,from,q,s,.36);cue(b,'dash',s+.36,.68,run,{origin:q,to,width:200,index:-1});
      travel(b,-1,q,to,s+1.04,run);wave(b,s+1.04+run,to,i%2===0,i,{speed:400+i*35,impact:i===n-1?21:9});
      from=to;s+=1.53;
    }
  }
}
function beginEncounterMove(b,m){
  makeScore(b);b.overlap='';b.state=m;b.combo=null;b.laserGate=b.kind==='beacon'&&b.phase>=3&&['curtain','sweep','overload'].includes(m);b.posts=null;b.angle=angleTo(b,bossPrey(b));b.charging=false;
  if(m==='zeroClassic')classicZero(b);else if(SCORED_MOVES.has(m))scheduleClassicScore(b,m);
  if(ENCORE[b.kind])scoreSignature(b,m);
  if(b.kind==='beacon')scheduleBeacon(b,m);
  if(b.kind==='twins')scheduleTwins(b,m);
  if(b.kind==='heart')scheduleHeart(b,m);
  if(b.kind==='monolith')scheduleMonolith(b,m);

  b.timer=Math.max(.45,b.timer);bossCue((m==='absorb'?'pulses':m)+'Charge',b);
}
function finalNode(b,i,n){
  const k=b.kind,t=b.age;
  let r=k==='fractal'?145:k==='crown'?124:105;
  if(k==='twins')return polarPoint(b,125*Math.sin(Math.PI*clamp(t/3.8,0,1)),i*Math.PI+t*2.25);
  const release=k==='fractal'?3.5:k==='clock'?3.6:4.4;
  r*=clamp((t-.35)/.7,0,1)*(1-clamp((t-release)/1,0,1));
  const q=polarPoint(b,r,i*TAU/n+(k==='clock'?-.34*t:k==='crown'?.21*t:Math.PI/4));
  return boundedPoint(q.x,q.y,25);
}
function scheduleFinal(b){
  makeScore(b);b.combo=null;b.laserGate=false;b.state='final';const k=b.kind;
  if(ENCORE[k]){encoreFinal(b);return;}
  if(k==='fractal'){
    for(let j=0;j<3;j++)for(let i=0;i<4;i++)volley(b,1+j*.76,b,8,175+40*j,j*.19,{node:i,nodes:4,square:true});
  }else if(k==='clock'){
    for(let i=0;i<12;i++)if(i%4!==0)volley(b,.66,b,1,210,i*TAU/12,{node:i,nodes:12});
    for(const offset of [0,2.55])ray(b,1.1,.68,2,b,b.angle+offset,18,{spin:-.91});
    for(let i=0;i<3;i++)wave(b,3.48+i*.54,b,false,i,{speed:355});
  }else if(k==='crown'){
    for(let j=0;j<3;j++)for(let i=0;i<12;i++){
      if(i%4===j%4)continue;
      for(let layer=0;layer<=j;layer++)for(const spread of [-.105,.105]){
        volley(b,.62+j*1.35,b,1,145+layer*40+j*12,i*TAU/12+spread+.09*layer,{node:i,nodes:12,color:layer%2?'#fff0ff':b.color,curve:(layer%2?-1:1)*.15});
      }
    }
  }else if(k==='beacon'){emitterFan(b,.44,true);}
  else if(k==='twins'){
    for(let j=0;j<2;j++)volley(b,1.08+j*.96,b,24,205+j*34,j*.22,{node:j,nodes:2,color:POLAR[j],square:!j,gaps:true});
  }else if(k==='heart'){
    for(let j=0;j<4;j++)volley(b,.95+j*.83,b,32,218+j*10,j*.17,{gaps:true});
  }else{
    for(let j=0;j<3;j++)wave(b,.57+j*1.1,b,true,j);
    debris(b,.8,8);
  }
  b.timer=Math.max(FINAL_TIME[k],b.timer);b.finalLength=b.timer;
}
function eventOrigin(b,e){
  if(e.node!==undefined)return finalNode(b,e.node,e.nodes);
  if(e.part!==undefined)return b.parts[e.part];
  return e.origin||b;
}
function tickScore(b,dt){
  const t=b.age;
  for(const tr of b.tracks||[]){
    if(t<tr.start||t-dt>tr.start+tr.duration)continue;
    const body=tr.index<0?b:b.parts[tr.index];
    if(body.hp>0||b.state==='final')Object.assign(body,mixPoint(tr.from,tr.to,clamp((t-tr.start)/tr.duration,0,1)));
  }
  for(const e of b.events||[]){
    if(e.kind==='wave'&&t<=e.end && (state.arena.w!==e.arenaW||state.arena.h!==e.arenaH||
        (!state.arena.chase&&(state.arena.x!==e.arenaX||state.arena.y!==e.arenaY))||e.part!==undefined&&t>=e.start)){
      if(e.part!==undefined){e.requires=e.part;e.origin=point(b.parts[e.part]);delete e.part;}
      const a=state.arena;e.reach=waveReach(a,e.origin,e.square,(b.safeSize||30)/2+22);
      // An emitted front keeps its speed when another boss enlarges the arena.
      e.end=e.on+(e.reach-34)/e.speed;e.arenaW=a.w;e.arenaH=a.h;e.arenaX=a.x;e.arenaY=a.y;
      b.timer=Math.max(b.timer,e.end+.25-t);
    }
    if(t<e.start||t>e.end+dt||(e.part!==undefined&&b.parts[e.part].hp<=0||e.requires!==undefined&&b.parts[e.requires].hp<=0))continue;
    tickArenaEvent(b,e,t);tickEncoreEvent(b,e);
    if(e.track&&t<=e.start+e.track)e.angle=angleTo(e.origin,targetForBeat(b,e.targetBeat||0))+(e.aimOffset||0);
    if(e.kind==='orbit'){
      e.from??=b.parts.map(point);
      const turn=Math.max(0,t-e.on)*(e.wide?1.01:2.3);
      b.parts.forEach((q,i)=>{const a=state.arena,theta=i*Math.PI+turn;
        const dest=e.wide?{x:e.center.x+(a.w*.43)*Math.cos(theta),y:e.center.y+a.h*(.31*Math.sin(theta)+.1*Math.sin(2*theta+i))}:polarPoint(e.center,e.radius,theta);
        Object.assign(q,mixPoint(e.from[i],dest,clamp((t-e.start)/.85,0,1)));});
    }
    if(e.kind==='turretOrbit')Object.assign(b.parts[e.part],polarPoint(b,140,e.angle+Math.max(0,t-e.on)*1.55));
    if(t<e.on||e.fired)continue;
    e.fired=true;b.lastBeat=b.clock;
    const q=eventOrigin(b,e);
    fireArenaEvent(b,e);fireEncoreEvent(b,e);
    if(e.kind==='volley'){
      for(let i=0;i<e.count;i++){
        const base=e.baseCount||e.count;
        if(e.gaps&&Math.floor(i*base/e.count)%Math.max(4,Math.floor(base/3))<2)continue;
        patternShot(b,q,e.turn+(e.fan?(i/(e.count-1)-.5)*e.fan:i*TAU/e.count),e.speed,5,e.color||b.color,{square:e.square??b.kind==='fractal',curve:e.curve});
      }
    }
    if(e.kind==='repair'&&b.hp>b.repairHP-b.maxHp*.055){
      const part=b.parts[e.index];part.hp=part.maxHp*.48;part._dying=false;
    }
    if(e.kind==='ray'&&e.impact)spawnParticles(q.x,q.y,12,b.color);
    if(e.kind==='burnout'){const part=activeParts(b).at(-1);if(part)partDefeated(part);}
    if(e.kind==='wave'||e.kind==='dash'||e.impact)state.shake=Math.max(state.shake,e.impact||7);
    // Simultaneous petals are one chord, not dozens of Web Audio voices.
    if(b.lastCueAge!==t){
      b.lastCueAge=t;
      const tone=e.post!==undefined?'emitter'+e.post:b.state==='final'?b.kind+'FinalBeat':b.state+'Beat';
      bossCue(tone,q);
    }
  }
}
function scoreShapes(b){
  const out=[],t=b.age,a=state.arena;
  if(!a)return out;
  const gate=(b.laserGate||b.layers?.some(l=>l.posts||l.state==='curtain'||l.state==='tracking'))&&b.kind==='beacon'?beaconPassage(b,t):null;
  function line(p,q,width,live){beamSegments(out,p,q,width,live,gate,(b.safeSize||30)/2+26);}
  for(const e of b.events||[]){
    if(t<e.start||t>e.end||(e.part!==undefined&&b.parts[e.part].hp<=0||e.requires!==undefined&&b.parts[e.requires].hp<=0))continue;
    const live=t>=e.on,u=Math.max(0,t-e.on),q=eventOrigin(b,e);
    appendEncoreShape(out,b,e,t,line);
    if(e.kind==='ray'){
      const angle=e.angle+u*(e.spin||0),len=Math.hypot(a.w,a.h)*1.1;
      line(e.opposed?polarPoint(q,-len,angle):q,polarPoint(q,len,angle),e.width,live);
    }else if(e.kind==='path')for(let i=1;i<e.points.length;i++)line(e.points[i-1],e.points[i],e.width,live);
    else if(e.kind==='wire'){
      const p=e.targetIndex<0?b:b.parts[e.targetIndex];if(p.hp<=0)continue;
      line(q,mixPoint(q,p,.32),e.width,live);line(mixPoint(q,p,.68),p,e.width,live);
    }else if(e.kind==='link')line(b.parts[0],b.parts[1],e.width,live);
    else if(e.kind==='dash'){
      if(!live)line(e.origin,e.to,e.width,false);
      else{
        const frac=clamp(u/(e.end-e.on),0,1),prev=clamp((u-(b.step||1/60))/(e.end-e.on),0,1);
        line(mixPoint(e.origin,e.to,prev),mixPoint(e.origin,e.to,frac),e.width,true);
      }
    }else if(e.kind==='block')out.push({kind:'box',...point(q),r:e.r,live});
    else if(e.kind==='rail'){
      if(!live)for(let i=1;i<e.path.length;i++)line(e.path[i-1],e.path[i],4,false);
      else if(!e.outward){
        const prev=railPoint(e,clamp((t-e.on-(b.step||1/60))/(e.end-e.on),0,1));
        line(prev,railPoint(e,u/(e.end-e.on)),b.size,true);
      }
    }else if(e.kind==='dial'||e.kind==='faultZone'){
      out.push({kind:e.kind==='dial'?'disk':'box',...point(q),r:e.r,live,index:e.index,progress:clamp((t-e.start)/(e.on-e.start),0,1)});
    }else if(e.kind==='wave'){
      waveShapes(out,e,q,u,live);
    }else if(e.kind==='wall'){
      const n=e.horizontal?11:17,span=e.horizontal?a.h:a.w;
      const progress=clamp(u/(e.end-e.on),0,1),d=e.reverse?1-progress:progress;
      for(let i=0;i<n;i++){
        const f=(i+.5)/n;if(Math.abs(f-e.door)*span<Math.max(80,(b.safeSize||30)*.7+35))continue;
        out.push({kind:'box',x:a.x+a.w*(e.horizontal?d:f),y:a.y+a.h*(e.horizontal?f:d),r:span/n*.49,live});
      }
    }
  }
  return out;
}
