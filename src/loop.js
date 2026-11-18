'use strict';
/* =============== BUCLE =============== */
let last = performance.now();
configureCardUpgrades();
function loop(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;
  if (playMode !== 'menu') {
    if (playMode === 'solo') update(dt);
    else { animateMotion(now); predictLocalFrame(now,dt); }
    updateUILayout();
    render();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

