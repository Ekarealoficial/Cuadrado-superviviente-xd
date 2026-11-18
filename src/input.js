'use strict';
/* =============== INPUT =============== */
const keys = Object.create(null);
const mouse = { x: W / 2, y: H / 2, down: false };
function ensureAudio() {
  Sfx.init();
  if (Sfx.ctx && Sfx.ctx.state === 'suspended') Sfx.ctx.resume();
}
function getWorldMouse() {
  return {
    x: (mouse.x - W/2) / state.cam.zoom + state.cam.x,
    y: (mouse.y - H/2) / state.cam.zoom + state.cam.y
  };
}

window.addEventListener('keydown', e => {
  if (playMode === 'menu' || (playMode === 'online' && handleNetKey(e))) return;
  ensureAudio();
  const k = e.key.toLowerCase();

  if (playMode === 'sandbox' && handleSandboxKey(e,k)) return;
  if (playMode === 'online') {
    keys[k] = true;
    if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)) e.preventDefault();
    return;
  }
  if (state.cardChoices) {
    if (k === '1' || k === '2' || k === '3') {
      const idx = parseInt(k) - 1;
      if (idx < state.cardChoices.length) pickCard(state.cardChoices[idx]);
      e.preventDefault();
    }
    return;
  }

  if (k === 'e') {
    state.inventoryOpen = !state.inventoryOpen;
    state.inventorySelection = null;
    state.laserCharging = false;
    state.laserChargeTime = 0;
    Sfx.play('inventory');
    e.preventDefault();
    return;
  }
  if (state.inventoryOpen) {
    if (k === 'escape') {
      state.inventoryOpen = false;
      state.inventorySelection = null;
      e.preventDefault();
    }
    return;
  }

  if (k >= '1' && k <= '5') {
    const slotIdx = parseInt(k) - 1;
    useSlot(slotIdx);
    e.preventDefault();
    return;
  }

  keys[k] = true;
  if (k === 'r' && state.over && state.overTimer > 0.3) restart();
  if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
});
canvas.addEventListener('mousedown', e => {
  if (playMode === 'menu') return;
  if (playMode === 'sandbox' && e.button===2 && !state.inventoryOpen){
    const rect=canvas.getBoundingClientRect();
    mouse.x=(e.clientX-rect.left)*W/rect.width;mouse.y=(e.clientY-rect.top)*H/rect.height;
    placeSandboxEnemy();return;
  }
  if (playMode === 'online' && handleNetClick(e)) return;
  updateUILayout();
  ensureAudio();
  if (e.button === 0) {
    if (state.over) { if (state.overTimer > 0.4) restart(); return; }
    if (state.cardChoices) {
      if (state.cardRects) {
        for (let i = 0; i < state.cardRects.length; i++) {
          const r = state.cardRects[i];
          if (mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h) {
            pickCard(state.cardChoices[i]);
            return;
          }
        }
      }
      return;
    }
    if (state.inventoryOpen) {
      for (const cr of state.inventoryCardRects) {
        if (mouse.x >= cr.x && mouse.x <= cr.x + cr.w && mouse.y >= cr.y && mouse.y <= cr.y + cr.h) {
          state.inventorySelection = cr.id;
          Sfx.play('inventory', 80);
          return;
        }
      }
      for (let i = 0; i < state.inventorySlotRects.length; i++) {
        const sr = state.inventorySlotRects[i];
        if (mouse.x >= sr.x && mouse.x <= sr.x + sr.w && mouse.y >= sr.y && mouse.y <= sr.y + sr.h) {
          if (state.inventorySelection) {
            state.slots[i] = state.inventorySelection;
            Sfx.play('pick', 60);
          }
          return;
        }
      }
      return;
    }
    mouse.down = true;
    if (playMode === 'sandbox' && handleSandboxKey(e,k)) return;
  if (playMode === 'online') { pendingTap = true; previewTap = true; }
  } else if (e.button === 2) {
    if (state.inventoryOpen) {
      for (let i = 0; i < state.inventorySlotRects.length; i++) {
        const sr = state.inventorySlotRects[i];
        if (mouse.x >= sr.x && mouse.x <= sr.x + sr.w && mouse.y >= sr.y && mouse.y <= sr.y + sr.h) {
          state.slots[i] = null;
          Sfx.play('inventory', 60);
          return;
        }
      }
    }
  }
});
window.addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; });
window.addEventListener('blur', () => { mouse.down = false; for (const k in keys) keys[k] = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());

function restart() { randomState=initialSeed; state = newState(); mouse.down = false; chunkCache.clear(); }

