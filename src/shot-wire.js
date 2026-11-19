'use strict';
// Dense volleys repeat a small number of schemas. Send each schema once,
// preserving every value and stable projectile ID without changing simulation.
const LOCAL_SHOT_FIELDS=new Set(['prevX','prevY','owner','target']);
function packHostileShots(shots){
  const schemas=[],seen=new Set();
  for(const s of shots)for(const key of Object.keys(s)){
    if(!LOCAL_SHOT_FIELDS.has(key)&&s[key]!==undefined&&!seen.has(key)){seen.add(key);schemas.push(key);}
  }
  const rows=shots.map(s=>schemas.map(k=>s[k]??null));
  return {columns:schemas,rows};
}
function unpackHostileShots(packet){
  const {columns,rows}=packet;
  return rows.map(row=>{
    const shot={};
    for(let i=0;i<columns.length;i++)if(row[i]!==null)shot[columns[i]]=row[i];
    return shot;
  });
}
if(typeof module!=='undefined')module.exports={packHostileShots,unpackHostileShots};
