'use strict';
/* =============== BUCLE =============== */
let last = performance.now();
configureCardUpgrades();
function loop(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;
  if(mobileDevice)updateTouchUI();
  if (playMode !== 'menu') {
    if (playMode === 'online') { animateMotion(now); predictLocalFrame(now,dt); }
    else if(playMode!=='sandbox' || !sandboxTab)update(dt);
    updateUILayout();
    render();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

