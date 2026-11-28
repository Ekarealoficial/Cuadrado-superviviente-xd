'use strict';
// Count each difficulty tier by suffix, rather than constructing individual groups.
// Two arena-covering bosses in one group add pressure beyond their base ratings.
const widePatterns=new Set(['prism','dawn','beacon','crown','singular']);
function weightedModes(){return playMode==='online' && Number.isFinite(rules.progression) || ['daily','duel','pursuit','solo','rush','siege','trial','chaos'].includes(playMode);}
function groupCost(id,alreadyWide){return 2*BOSS_DIFFICULTY[id]+(alreadyWide&&widePatterns.has(id)?2:0);}
function groupRating(group){
  let sum=0,wide=false;
  for(const id of group){sum+=groupCost(id,wide);wide||=widePatterns.has(id);}
  return sum/(2*group.length);
}
function coprimeStep(n){
  let step=1+Math.floor(gameRandom()*n);
  for(;;){let a=n,b=step;while(b)[a,b]=[b,a%b];if(a===1)return step;step=step%n+1;}
}
let tierTable=null;
function encounterTiers(pool,size){
  const key=pool.join('+')+'/'+size;
  if(tierTable?.key===key)return tierTable;
  const memo=new Map();
  function counts(i,k,wide){
    const key=(i*(size+1)+k)*2+Number(wide);
    if(memo.has(key))return memo.get(key);
    const result=new Map();memo.set(key,result);
    if(!k){result.set(0,1);return result;}
    if(pool.length-i<k)return result;
    const id=pool[i],cost=groupCost(id,wide);
    for(const [sum,n] of counts(i+1,k-1,wide||widePatterns.has(id)))result.set(sum+cost,n);
    for(const [sum,n] of counts(i+1,k,wide))result.set(sum,n+(result.get(sum)||0));
    return result;
  }
  function unrank(sum,rank){
    const group=[];let wide=false,k=size;
    for(let i=0;k;i++){
      const id=pool[i],cost=groupCost(id,wide),next=wide||widePatterns.has(id);
      const n=counts(i+1,k-1,next).get(sum-cost)||0;
      if(rank<n){group.push(id);k--;wide=next;sum-=cost;}else rank-=n;
    }
    return group;
  }
  return tierTable={key,totals:counts(0,size,false),unrank};
}
function drawWeightedGroup(pool,k,n,cycle){
  const table=encounterTiers(pool,k);
  if(!cycle.length){
    cycle.push(0);
    state.encounterTiers=Array.from(table.totals,([sum,count])=>({sum,count,used:0,
      offset:Math.floor(gameRandom()*count),step:coprimeStep(count)}));
  }
  const tiers=state.encounterTiers;
  const slope=(1.52-.7*cycle[0]/n)/Math.sqrt(k);
  let total=0;
  const weights=tiers.map(t=>{const w=(t.count-t.used)*Math.exp(-slope*t.sum/2);total+=w;return w;});
  let roll=gameRandom()*total,chosen=0;
  for(let i=0;i<tiers.length;i++){if(!weights[i])continue;chosen=i;if(roll<weights[i])break;roll-=weights[i];}
  const tier=tiers[chosen],rank=(tier.offset+tier.used*tier.step)%tier.count;
  tier.used++;cycle[0]++;
  return table.unrank(tier.sum,rank);
}
function encounterDifficulty(group){
  const labSettings=playMode==='sandbox'?state.labDifficulty:null;
  const encounters=labSettings?labSettings.encounter-1:state.completedEncounters;
  const stage=labSettings?.stage||Math.max(state.groupSize,group.length);
  const pace=(state.rush?1.45:rules.difficulty)*(rules.progression||1);
  const deck=Math.log1p(state.upgrades||0);
  const opening=playMode==='duel'?Math.log1p(rules.difficulty)*.9:0;
  const progress=opening+Math.log1p(encounters*pace)*(.8+.065*groupRating(group))+
    .64*(stage-1)+.12*Math.min(deck,Math.log1p(encounters*8));
  const pressure=labSettings?.threat?(labSettings.threat-1)*.65:
    Math.max(labSettings?0:(state.threat-1)*.65,progress);
  const intensity=pressure/(pressure+4);
  return {threat:1+Math.floor(pressure/.65+.00001),movement:1+.55*intensity,
    shot:1+.72*intensity,density:1+1.1*intensity,recovery:1-.45*intensity,
    overlap:intensity,hp:1+(state.rush ? .24 : .52)*Math.log1p(encounters*pace)};
}
function threatLabel(level){
  return 'AMENAZA '+level+' · '+(level<3?'ESTABLE':level<6?'PELIGROSA':level<10?'EXTREMA':'COLAPSO');
}
function bossLaserReach(){return state.arena?Math.hypot(state.arena.w,state.arena.h)+80:3000;}
function encounterProfile(group){
  if(!weightedModes()&&!(playMode==='sandbox'&&(state.labDifficulty||rules.intensity>1)))return null;
  const profile=encounterDifficulty(group),level=profile.threat;
  if(level>(state.threat||1)){
    addFloat(state.player.x,state.player.y-60,threatLabel(level),'#f59adb');
    spawnParticles(state.player.x,state.player.y,18,'#da70ee',.8);
  }
  state.threat=level;
  return profile;
}
