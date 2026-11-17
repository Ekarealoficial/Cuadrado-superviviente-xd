'use strict';
class SpatialGrid {
  constructor(size = BALANCE.cellSize) { this.size=size; this.cells=new Map(); }
  rebuild(items) { this.cells.clear(); for(const item of items) this.add(item); }
  add(item) {
    const key = Math.floor(item.x/this.size)+','+Math.floor(item.y/this.size);
    if(!this.cells.has(key)) this.cells.set(key,[]);
    this.cells.get(key).push(item);
  }
  query(x,y,r) {
    const result=[];
    for(let cy=Math.floor((y-r)/this.size);cy<=Math.floor((y+r)/this.size);cy++)
      for(let cx=Math.floor((x-r)/this.size);cx<=Math.floor((x+r)/this.size);cx++)
        result.push(...(this.cells.get(cx+','+cy)||[]));
    return result;
  }
}
const enemyGrid=new SpatialGrid(), bulletGrid=new SpatialGrid();
function refreshSpatialIndexes() {
  enemyGrid.rebuild(state.enemies);
  bulletGrid.rebuild(state.bullets);
  for(const e of state.enemies) e.activeDarts=0;
  for(const d of state.enemyDarts) if(d.owner) d.owner.activeDarts++;
}
