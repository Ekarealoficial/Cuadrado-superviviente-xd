'use strict';
/* =============== BUCLE =============== */
let last = performance.now();
configureCardUpgrades();
function loop(now) {
  let dt = (now - last) / 1000;
  last = now;
  if(playMode==='sandbox')updateSandboxDebug(dt,now);
  if (dt > 0.05) dt = 0.05;
  if(playMode!=='menu')updateLens(dt);
  if(mobileDevice)updateTouchUI();
  if (playMode !== 'menu') {
    if(playMode==='rush'){
      advanceRush(dt);
      syncRushUI();
    }
    else if (playMode === 'online') { if(!state.waiting){animateMotion(now);predictLocalFrame(now,dt);} }
    else if(playMode!=='sandbox')update(dt);
    else if(!sandboxTab){
      const scaled=dt*lab.speed,steps=Math.max(1,Math.ceil(scaled/(1/60)));
      for(let i=0;i<steps;i++)update(scaled/steps);
    }
    if(weightedModes()&&!state.rush)syncLocalUI();
    updateUILayout();
    render();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

