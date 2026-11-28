'use strict';
// Visual contacts never call damage, kill or reward functions.
const pendingContacts=new Map(), impactLights=[];
let seenImpact=0;
const confirmedDamage=[];
const lastProvisional=new Map();
function shotKey(s,owner){
  return s.volley!=null&&s.lane!=null?[owner,s.volley,s.batch||0,s.lane].join('/'):'net/'+s.netId;
}
function impactLight(key,x,y,color,now,confirmed=false){
  let light=impactLights.find(h=>h.key===key);
  if(!light){light={key,x,y,color,at:now,confirmed};impactLights.push(light);Sfx.play('hit',35);}
  else if(confirmed){light.confirmed=true;light.x=x;light.y=y;}
}
const visualTargets=new SpatialGrid();
let visualFrame=-1,maxTargetRadius=0;
function predictContact(s,x,y,now){
  const key=shotKey(s,s.shooterId??state.selfId),contact=(s.contacts||0)+1;
  if(s.rejectedUntil>now||pendingContacts.has(key))return;
  const path={...s,prevX:s.x,prevY:s.y,x,y};
  let best=Infinity,target;
  if(visualFrame!==now){
    visualFrame=now;maxTargetRadius=0;
    const targets=state.enemies.concat(bossTargets(),livingBosses().flatMap(b=>b.balls.filter(v=>v.state!=='attached')));
    visualTargets.rebuild(targets);
    for(const q of targets)maxTargetRadius=Math.max(maxTargetRadius,q.size/2||q.r||0);
  }
  for(const q of visualTargets.query((s.x+x)/2,(s.y+y)/2,Math.hypot(x-s.x,y-s.y)/2+s.r+maxTargetRadius)){
    if(q._dying||q.state==='final')continue;
    const t=bulletEntry(path,q,s.r+(q.size/2||q.r));if(t<best){best=t;target=q;}
  }
  if(!target)return;
  const hit={x:s.x+(x-s.x)*best,y:s.y+(y-s.y)*best,at:now,contact};
  lastProvisional.set(key+'/'+contact,now);pendingContacts.set(key,hit);impactLight(key+'/'+contact,hit.x,hit.y,target.color||'#c6faff',now);
  if(!s.bounces&&!s.dupli)s.occluded=true;
}
const earlyContacts=new Map();
function presentConfirmedContacts(hits,now,current){
  for(const hit of hits){
    if(hit.seq<=seenImpact)continue;seenImpact=hit.seq;
    const key=shotKey(hit,hit.shooterId);
    pendingContacts.delete(key);
    if(current){
      earlyContacts.set(key,{hit,at:now});
      const body=current.enemies.find(e=>e.netId===hit.targetId)||bossTargets().find(e=>e.netId===hit.targetId);
      if(body&&Number.isFinite(hit.hp)){body.hp=hit.hp;body.hitFlash=.12;}
      if(hit.ended){
        for(const s of current.bullets)if(shotKey(s,s.shooterId)===key)s.occluded=true;
        for(const s of previewShots)if(shotKey(s,current.selfId)===key)s.occluded=true;
      }
    }
    if(hit.damage>0)confirmedDamage.push({x:hit.x,y:hit.y,at:now,damage:hit.damage,critical:hit.critical});
    if(!impactLights.some(h=>h.key===key+'/'+hit.contact) && now-(lastProvisional.get(key+'/'+hit.contact)??-Infinity)<1500)continue;
    impactLight(key+'/'+hit.contact,hit.x,hit.y,hit.color||'#c6faff',now,true);
  }
}
function reconcileContacts(next,now){
  presentConfirmedContacts(next.impacts||[],now,null);
  for(const [key,at] of lastProvisional)if(now-at>1800)lastProvisional.delete(key);
  for(const [key,{hit,at}] of earlyContacts){
    if(next.time>=hit.time||now-at>1000){earlyContacts.delete(key);continue;}
    // An HTTP fallback or queued full snapshot can predate a pushed result.
    const target=next.enemies?.find(e=>e.netId===hit.targetId);
    if(target&&Number.isFinite(hit.hp))target.hp=hit.hp;
    if(hit.ended){const shot=next.bullets.find(s=>shotKey(s,s.shooterId)===key);if(shot)shot.occluded=true;}
  }
  const shots=new Map(next.bullets.map(b=>[shotKey(b,b.shooterId),b]));
  for(const [key,h] of pendingContacts){
    const s=shots.get(key);
    if(s && now-h.at<Math.max(100,(netPingMs||80)+85)){s.occluded=!s.bounces&&!s.dupli;continue;}
    if(s){s.occluded=false;s.rejectedUntil=now+180;s.blendFrom=h;s.blendAt=now;}
    if(s||now-h.at>700)pendingContacts.delete(key);
  }
  return shots;
}
function drawImpactLights(now){
  ctx.save();ctx.lineWidth=2;
  for(let i=impactLights.length-1;i>=0;i--){
    const h=impactLights[i],t=(now-h.at)/240;if(t>=1){impactLights.splice(i,1);continue;}
    ctx.globalAlpha=1-t;ctx.strokeStyle=h.confirmed?'#fff':h.color;
    const r=3+11*t;ctx.strokeRect(h.x-r,h.y-r,r*2,r*2);
    ctx.fillStyle=h.color;for(let j=0;j<4;j++){const a=j*TAU/4+.45;ctx.fillRect(h.x+r*1.6*Math.cos(a),h.y+r*1.6*Math.sin(a),3,3);}
  }
  ctx.font='bold 12px system-ui';ctx.textAlign='center';
  for(let i=confirmedDamage.length-1;i>=0;i--){
    const h=confirmedDamage[i],t=(now-h.at)/450;
    if(t>=1){confirmedDamage.splice(i,1);continue;}
    ctx.globalAlpha=1-t;ctx.fillStyle=h.critical?'#ffdb76':'#efffff';
    ctx.fillText((h.critical?'◆ ':'')+Number(h.damage.toPrecision(3)),h.x,h.y-12-20*t);
  }
  ctx.restore();
}
