'use strict';
function drawArenaEvents(b){
  const t=b.age,c=b.color;
  if(b.laserGate||b.kind==='beacon'&&b.layers?.length){
    const q=beaconPassage(b,t);
    ctx.save();ctx.setLineDash([8,10]);strokeRing(q.x,q.y,(b.safeSize||30)/2+19,'#92ffdb93',1.5);ctx.restore();
  }
  for(const e of b.events||[]){
    if(t<e.start||t>e.end+.22)continue;
    if(e.kind==='rail'){
      const u=clamp((t-e.on)/(e.end-e.on),0,1);
      if(e.outward||e.returning){ctx.save();ctx.strokeStyle=e.returning?'#eafbff99':'#80bfff92';ctx.lineWidth=e.returning?4:2;
        cosmicPath(e.outward?e.path.slice(0,Math.max(2,Math.ceil(u*(e.path.length-1))+1)):e.path);ctx.stroke();ctx.restore();}
      if(t>=e.on){
        ctx.save();
        for(let i=9;i>=1;i--){const v=railPoint(e,clamp((t-e.on-i*.019)/(e.end-e.on),0,1));ctx.globalAlpha=(10-i)*.055*clamp(1-(t-e.end)/.2,0,1);
          disk(v.x,v.y,b.size*(.48-i*.016),e.returning?'#bfeeff':i%2?'#eac16b':'#639ee5');}
        ctx.globalAlpha=.82;
        const here=railPoint(e,u),last=railPoint(e,Math.max(0,u-.18)),a=angleTo(last,here)+Math.PI/2;
        for(const sign of [-1,1])energyLine(polarPoint(last,b.size*.47,sign===1?a:a+Math.PI),polarPoint(here,b.size*.47,sign===1?a:a+Math.PI),sign===1?'#9edaff':'#ffe197',3);
        const since=t-(t>=e.end?e.end:e.on),q=t>=e.end?e.path.at(-1):e.path[0];
        if(since<.24){ctx.globalAlpha=1-since/.24;strokeRing(q.x,q.y,20+since*300,'#ffdfa2',3);}
        ctx.restore();
      }
    }else if(e.kind==='copy'){
      const q=copyAt(e,t),u=clamp((t-e.start)/.7,0,1);
      ctx.save();ctx.translate(q.x,q.y);ctx.globalAlpha=.32+.45*u;panelSquare(16+6*u,'#ff7cdb',t*.7+e.index);
      etchedSquare(28+(1-u)*20,-t*.9,'#ffbaf0',1.6);ctx.restore();
    }else if(e.kind==='perimeter'&&t<e.on){
      const a=state.arena;
      for(let i=0;i<72;i++){
        const p=perimeterPoint(a,i/72),q=perimeterPoint(a,(i+.75)/72);
        energyLine(p,q,zeroGate(i/72,e.round)?'#84ffd6':'#e9ba68',3);
      }
    }else if(['dial','faultZone','block'].includes(e.kind)&&t>=e.on){
      const u=clamp((t-e.on)/.42,0,1),q=e.origin;
      ctx.save();ctx.translate(q.x,q.y);ctx.globalAlpha=1-u;
      if(e.kind==='dial')for(const n of [1,1.35])strokeRing(0,0,e.r*n+u*30,'#ffe4a5',2);
      else etchedSquare(e.r+u*27,0,c,2);ctx.restore();
    }
  }
}
