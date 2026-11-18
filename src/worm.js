'use strict';
const WORM_LINK=26;
function newWormPiece(parts,heading){
  return {parts,heading,mode:'curve',timer:gameRand(2.3,4),wave:gameRand(0,TAU)};
}
function createWorm(pos,hp){
  const count=15,unit=Math.floor(hp/(count+2)),arena=state.arena;
  const dir=pos.x<arena.x+arena.w/2?-1:1;
  const parts=Array.from({length:count},(_,i)=>{
    const health=i===0?hp-(count-1)*unit:unit;
    return {wormSegment:true,segmentId:i,x:pos.x-i*dir*WORM_LINK,y:pos.y,
      size:i===0?48:36,hp:health,maxHp:health,color:'#34ec9d',balls:[],hitFlash:0};
  });
  return {kind:'worm',x:pos.x,y:pos.y,size:48,hp,maxHp:hp,phase:1,color:'#34ec9d',
    balls:[],pieces:[newWormPiece(parts,dir===1?0:Math.PI)]};
}
function wormHealth(b){
  return b.pieces.reduce((hp,p)=>hp+p.parts.reduce((sum,s)=>sum+Math.max(0,s.hp),0),0);
}
function breakWormSegment(seg){
  if(seg._dying)return;
  for(const b of livingBosses()){
    const piece=b.pieces?.find(p=>p.parts.includes(seg));
    if(!piece)continue;
    seg._dying=true;seg.hp=0;
    const index=piece.parts.indexOf(seg),tail=piece.parts.splice(index+1);
    piece.parts.pop();
    spawnParticles(seg.x,seg.y,18,b.color,1);
    if(tail.length){
      if(gameRandom()<.5)tail.reverse();
      tail[0].size=44;
      const next=newWormPiece(tail,tail.length>1?Math.atan2(tail[0].y-tail[1].y,tail[0].x-tail[1].x):piece.heading+Math.PI);
      b.pieces.push(next);
      if(b.phase===2)startWormVolley(next);
      else if(!piece.parts.length && piece.mode==='rest'){next.mode='rest';next.timer=piece.timer;}
    }
    if(!piece.parts.length)b.pieces.splice(b.pieces.indexOf(piece),1);
    b.hp=wormHealth(b);
    if(!b.pieces.length){b.x=seg.x;b.y=seg.y;killBoss(b);}
    return;
  }
}
function steerWorm(piece,target,step){
  const diff=Math.atan2(Math.sin(target-piece.heading),Math.cos(target-piece.heading));
  piece.heading+=clamp(diff,-step,step);
}
function wormWindup(piece,random){
  const h=piece.parts[0],a=state.arena;
  let angle=random?gameRand(0,TAU):Math.atan2(state.player.y-h.y,state.player.x-h.x);
  if(random){
    if((h.x<a.x+100 && Math.cos(angle)<0)||(h.x>a.x+a.w-100 && Math.cos(angle)>0))angle=Math.PI-angle;
    if((h.y<a.y+100 && Math.sin(angle)<0)||(h.y>a.y+a.h-100 && Math.sin(angle)>0))angle=-angle;
  }
  piece.heading=angle;piece.mode='windup';piece.timer=random?.23:.65;
}
function startWormVolley(piece){
  piece.dashes=10+Math.floor(gameRandom()*6);
  wormWindup(piece,true);
}
function startWormLines(piece){
  const h=piece.parts[0],a=state.arena;
  piece.horizontal=gameRandom()<.5;
  const start=piece.horizontal?a.y:a.x,length=piece.horizontal?a.h:a.w;
  const anchor=clamp(piece.horizontal?state.player.y:state.player.x,start+130,start+length-130);
  piece.lanes=[anchor-105,anchor,anchor+105];
  for(let i=2;i>0;i--){const j=Math.floor(gameRandom()*(i+1));[piece.lanes[i],piece.lanes[j]]=[piece.lanes[j],piece.lanes[i]];}
  piece.lane=0;piece.mode='exit';piece.timer=1;
  piece.forward=piece.horizontal?h.x<a.x+a.w/2:h.y<a.y+a.h/2;
  piece.heading=piece.horizontal?(piece.forward?Math.PI:0):(piece.forward?-Math.PI/2:Math.PI/2);
}
function stageWormLane(piece){
  const a=state.arena, lane=piece.lanes[piece.lane],sign=piece.forward?1:-1;
  const start=piece.horizontal?(sign>0?a.x:a.x+a.w):(sign>0?a.y:a.y+a.h);
  piece.heading=piece.horizontal?(sign>0?0:Math.PI):(sign>0?Math.PI/2:-Math.PI/2);
  piece.parts.forEach((s,i)=>{
    const pos=start-sign*(38+i*WORM_LINK);
    s.prevX=s.x=piece.horizontal?pos:lane;s.prevY=s.y=piece.horizontal?lane:pos;
  });
  piece.mode='laneAim';piece.timer=.64;
}
function wormContact(b){
  const p=state.player;
  for(const piece of b.pieces){
    if(piece.mode==='laneAim')continue;
    for(const s of piece.parts){
      const radius=(s.size+p.size)/2;
      const crossing=!state.viewDelay && bulletEntry(s,p,radius)!==Infinity;
      if(crossing || visibleContact(s,p,radius)){
        damagePlayer(piece.mode==='rush'||piece.mode==='pass'?2:1);return;
      }
    }
  }
}
function updateWorm(b,dt){
  const a=state.arena;
  b.hp=wormHealth(b);
  if(b.phase===1 && b.hp<=b.maxHp*.3){
    b.phase=2;
    for(const piece of b.pieces){
      const h=piece.parts[0],dx=clamp(h.x,a.x+28,a.x+a.w-28)-h.x,dy=clamp(h.y,a.y+28,a.y+a.h-28)-h.y;
      for(const s of piece.parts){s.prevX=s.x+=dx;s.prevY=s.y+=dy;}
      startWormVolley(piece);
    }
    addFloat(state.player.x,state.player.y-70,'¡ESTAMPIDA ESMERALDA!',b.color);
    state.shake=18;
  }
  for(const piece of b.pieces)updateWormPiece(piece,b.phase,dt,a);
  const head=b.pieces[0].parts[0];b.x=head.x;b.y=head.y;
  wormContact(b);
}
function updateWormPiece(piece,phase,dt,a){
  const h=piece.parts[0],p=state.player;
  for(const s of piece.parts){s.prevX=s.x;s.prevY=s.y;}
  const travel=moveTime(h,dt);
  piece.wave+=travel;piece.timer-=dt;
  let speed=0;
  switch(piece.mode){
    case 'curve':
    case 'zigzag': {
      const zig=piece.mode==='zigzag',wave=piece.wave;
      if(!zig && (!piece.goal || Math.hypot(piece.goal.x-h.x,piece.goal.y-h.y)<100)){
        piece.goal={x:a.x+75+gameRandom()*(a.w-150),y:a.y+75+gameRandom()*(a.h-150)};
      }
      const goal=zig?p:piece.goal;
      const angle=Math.atan2(goal.y-h.y,goal.x-h.x)+(zig?Math.sign(Math.sin(wave*6))*.95:Math.sin(wave*2.3)*1.2);
      steerWorm(piece,angle,(zig?17:3.4)*travel);
      speed=zig?450:205;
      if(piece.timer<=0){
        if(zig){piece.mode='curve';piece.timer=gameRand(1.7,3);}
        else{
          const attack=Math.floor(gameRandom()*3);
          if(attack===0){piece.mode='zigzag';piece.timer=3.5;}
          if(attack===1)wormWindup(piece,false);
          if(attack===2)startWormLines(piece);
          speed=0;
        }
      }
      break;
    }
    case 'windup':
      if(piece.timer<=0){piece.mode='rush';piece.timer=phase===2?.25:.48;Sfx.play('dash',80);}
      break;
    case 'rush':
      speed=1450;
      if(piece.timer<=0){
        speed=0;
        if(phase===2 && --piece.dashes>0)wormWindup(piece,true);
        else{piece.mode=phase===2?'rest':'curve';piece.timer=phase===2?3.2:2.4;}
      }
      break;
    case 'rest':
      if(piece.timer<=0)startWormVolley(piece);
      break;
    case 'exit': {
      speed=1600;
      const outside=h.x<a.x-30||h.x>a.x+a.w+30||h.y<a.y-30||h.y>a.y+a.h+30;
      if(outside){stageWormLane(piece);speed=0;}
      break;
    }
    case 'laneAim':
      if(piece.timer<=0){piece.mode='pass';piece.timer=0;}
      break;
    case 'pass': {
      const length=piece.horizontal?a.w:a.h;
      speed=Math.max(1300,length/.82);
      const axis=piece.horizontal?h.x:h.y,edge=piece.horizontal?a.x:a.y;
      if(piece.forward?axis>edge+length+piece.parts.length*WORM_LINK:axis<edge-piece.parts.length*WORM_LINK){
        speed=0;
        if(++piece.lane<3){piece.forward=!piece.forward;stageWormLane(piece);}
        else{
          piece.heading+=Math.PI;piece.mode='curve';piece.timer=2.5;
          // Return from the edge with the tail behind the head.
          const dx=clamp(h.x,a.x+24,a.x+a.w-24)-h.x,dy=clamp(h.y,a.y+24,a.y+a.h-24)-h.y;
          for(const s of piece.parts){s.prevX=s.x+=dx;s.prevY=s.y+=dy;}
        }
      }
      break;
    }
  }
  h.x+=Math.cos(piece.heading)*speed*travel;h.y+=Math.sin(piece.heading)*speed*travel;
  if(!['exit','pass','laneAim'].includes(piece.mode)){
    h.x=clamp(h.x,a.x+24,a.x+a.w-24);h.y=clamp(h.y,a.y+24,a.y+a.h-24);
  }
  for(let i=0;i<piece.parts.length;i++){
    const s=piece.parts[i];s.hitFlash=Math.max(0,s.hitFlash-dt);
    if(!i)continue;
    const prev=piece.parts[i-1],dx=prev.x-s.x,dy=prev.y-s.y,d=Math.hypot(dx,dy);
    if(d>WORM_LINK){s.x=prev.x-dx/d*WORM_LINK;s.y=prev.y-dy/d*WORM_LINK;}
  }
}
