'use strict';
/* =============== RENDER =============== */
function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#08080f';
  ctx.fillRect(0, 0, W, H);
  let sx = 0, sy = 0;
  if (state.shake > 0.2) {
    sx = (Math.random() * 2 - 1) * state.shake;
    sy = (Math.random() * 2 - 1) * state.shake;
  }
  const cam = state.cam;
  ctx.save();
  ctx.translate(W/2 + sx, H/2 + sy);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  const visW = W / cam.zoom, visH = H / cam.zoom;
  const left = cam.x - visW/2, right = cam.x + visW/2;
  const top = cam.y - visH/2, bottom = cam.y + visH/2;
  const gs = 60;
  const gx0 = Math.floor(left/gs)*gs, gx1 = Math.ceil(right/gs)*gs;
  const gy0 = Math.floor(top/gs)*gs, gy1 = Math.ceil(bottom/gs)*gs;
  ctx.strokeStyle = 'rgba(70,110,255,0.08)';
  ctx.lineWidth = 1 / cam.zoom;
  ctx.beginPath();
  for (let x = gx0; x <= gx1; x += gs) { ctx.moveTo(x + 0.5, gy0); ctx.lineTo(x + 0.5, gy1); }
  for (let y = gy0; y <= gy1; y += gs) { ctx.moveTo(gx0, y + 0.5); ctx.lineTo(gx1, y + 0.5); }
  ctx.stroke();

  if (state.arena) {
    const a = state.arena;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 50, 100, 0.7)';
    ctx.shadowColor = '#ff2255'; ctx.shadowBlur = 25;
    ctx.lineWidth = 6;
    ctx.strokeRect(a.x, a.y, a.w, a.h);
    ctx.shadowBlur = 0;
    ctx.setLineDash([15, 10]);
    ctx.lineDashOffset = -state.time * 40;
    ctx.strokeStyle = 'rgba(255, 100, 150, 0.6)';
    ctx.lineWidth = 3;
    ctx.strokeRect(a.x + 8, a.y + 8, a.w - 16, a.h - 16);
    ctx.setLineDash([]);
    ctx.restore();
  }

  for (const w of currentWalls) {
    if (w.isArena) continue;
    ctx.fillStyle = '#1a2340';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = 'rgba(90,140,255,0.35)';
    ctx.lineWidth = 2 / cam.zoom;
    ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
    ctx.fillStyle = 'rgba(70,110,200,0.18)';
    ctx.fillRect(w.x + 6, w.y + 6, w.w - 12, 4);
    ctx.fillRect(w.x + 6, w.y + w.h - 10, w.w - 12, 4);
  }

  const p = state.player;

  for (const ls of state.lightningStrikes) {
    const a = clamp(ls.timer / ls.maxTimer, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.shadowColor = '#fde047'; ctx.shadowBlur = 30;
    ctx.strokeStyle = '#fde047'; ctx.lineWidth = 4;
    ctx.beginPath();
    let x = ls.x + rand(-8, 8), y = ls.y - 500;
    ctx.moveTo(x, y);
    for (let s = 1; s <= 8; s++) {
      x = ls.x + rand(-15, 15);
      y = ls.y - 500 + (s/8) * 500;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fffbeb'; ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(253,224,71,0.3)';
    ctx.beginPath(); ctx.arc(ls.x, ls.y, 80*(1-a) + 20, 0, TAU); ctx.fill();
    ctx.restore();
  }

  for (const pot of state.potions) {
    const blink = pot.life < 5 && Math.floor(pot.life * 8) % 2 === 0;
    if (blink) continue;
    const bobY = Math.sin(pot.bob) * 4;
    const cx = pot.x, cy = pot.y + bobY;
    const isLarge = pot.type === 'large';
    const s = isLarge ? 13 : 9;
    ctx.save();
    ctx.shadowColor = isLarge ? '#ff5ba0' : '#ff9ec4'; ctx.shadowBlur = 20;
    ctx.fillStyle = isLarge ? '#ff5ba0' : '#ff9ec4';
    ctx.beginPath(); ctx.arc(cx, cy, s, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(cx - s*0.3, cy - s*0.3, s*0.35, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx - s*0.4, cy - 1.5, s*0.8, 3);
    ctx.fillRect(cx - 1.5, cy - s*0.4, 3, s*0.8);
    ctx.restore();
  }

  for (const o of state.orbs) {
    const pulse = 1 + Math.sin(o.pulse) * 0.15;
    ctx.save();
    ctx.shadowColor = '#8fff9e'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#c8ffd2';
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r * pulse, 0, TAU); ctx.fill();
    ctx.restore();
  }

  renderEntities0();
  renderEntities1();
  renderEntities2();
  renderEntities3();
  renderEntities4();
  renderEntities5();
  renderEntities6();
  renderEntities7();
  renderEntities8();
  // Jugador
  if (!state.over) {
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > 60) {
      for (let i = 1; i <= 3; i++) {
        const t = i * 0.045;
        ctx.globalAlpha = 0.18 / i;
        ctx.fillStyle = p.dashTimer > 0 ? '#22d3ee' : '#4df3ff';
        ctx.fillRect(p.x - p.vx*t - p.size/2, p.y - p.vy*t - p.size/2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
    }
    const blink = p.invuln > 0 && Math.floor(p.invuln * 18) % 2 === 0;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.save();
    ctx.rotate(p.angle);
    ctx.shadowColor = p.dashTimer > 0 ? '#22d3ee' : '#4df3ff';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#d9fdff';
    ctx.fillRect(p.size/2 - 6, -4, 18, 8);
    if (p.backShots > 0) {
      ctx.fillStyle = '#c77dff'; ctx.shadowColor = '#c77dff';
      ctx.fillRect(-p.size/2 - 12, -4, 18, 8);
    }
    ctx.restore();
    ctx.shadowColor = p.dashTimer > 0 ? '#22d3ee' : '#4df3ff';
    ctx.shadowBlur = 22;
    ctx.fillStyle = blink ? 'rgba(255,255,255,0.25)' : (p.color || rules.color);
    const h = p.size / 2;
    ctx.fillRect(-h, -h, p.size, p.size);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
  }

  for (const other of state.peers || []) {
    if (other.over) continue;
    ctx.fillStyle = other.color;
    ctx.fillRect(other.x-15, other.y-15, 30, 30);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px system-ui';
    ctx.fillText(other.name, other.x, other.y-24);
  }
  for (const pt of state.particles) {
    const a = clamp(pt.life / pt.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size/2, pt.y - pt.size/2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;

  for (const f of state.floats) {
    const a = clamp(f.life / f.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(${state.flashRGB},${state.flash * 0.35})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (!state.over && state.halfHearts <= 2) {
    const pulse = 0.22 + 0.16 * Math.sin(state.time * 6);
    const grad = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.3, W/2, H/2, Math.max(W,H)*0.7);
    grad.addColorStop(0, 'rgba(255,0,40,0)');
    grad.addColorStop(1, `rgba(255,0,40,${pulse})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  drawHUD();
  if (state.cardChoices) drawCards();
  if (state.inventoryOpen) drawInventory();
  if (state.over) drawGameOver();
  drawCrosshair();
}

function drawCrosshair() {
  const x = mouse.x, y = mouse.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#4df3ff';
  ctx.shadowColor = '#4df3ff';
  ctx.shadowBlur = 10;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-18, 0); ctx.lineTo(-7, 0);
  ctx.moveTo(18, 0); ctx.lineTo(7, 0);
  ctx.moveTo(0, -18); ctx.lineTo(0, -7);
  ctx.moveTo(0, 18); ctx.lineTo(0, 7);
  ctx.stroke();
  ctx.fillStyle = '#4df3ff';
  ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, TAU); ctx.fill();
  ctx.restore();
}


function renderEntities0() {
 const p=state.player;
  // Enemigos
  for (const e of state.enemies) {
    const r = e.size / 2;
    ctx.save();
    ctx.shadowColor = e.color; ctx.shadowBlur = 18;
    ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : e.color;
    ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    if (e.type === 'shooter') {
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      ctx.save();
      ctx.translate(e.x, e.y); ctx.rotate(a);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(r - 4, -3, 14, 6);
      ctx.restore();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(e.x - r*0.4, e.y); ctx.lineTo(e.x + r*0.4, e.y);
      ctx.moveTo(e.x, e.y - r*0.4); ctx.lineTo(e.x, e.y + r*0.4);
      ctx.stroke();
    } else if (e.type === 'invoker') {
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, r*0.7, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(e.x, e.y, r*0.25, 0, TAU); ctx.fill();
      for (let k = 0; k < 4; k++) {
        const a = (k/4)*TAU + e.wob;
        ctx.beginPath(); ctx.arc(e.x + Math.cos(a)*r*0.85, e.y + Math.sin(a)*r*0.85, 3, 0, TAU); ctx.fill();
      }
    } else if (e.type === 'teleporter') {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
      const a1 = e.wob, a2 = e.wob + Math.PI/2;
      ctx.beginPath();
      ctx.moveTo(e.x + Math.cos(a1)*r*0.6, e.y + Math.sin(a1)*r*0.6);
      ctx.lineTo(e.x - Math.cos(a1)*r*0.6, e.y - Math.sin(a1)*r*0.6);
      ctx.moveTo(e.x + Math.cos(a2)*r*0.6, e.y + Math.sin(a2)*r*0.6);
      ctx.lineTo(e.x - Math.cos(a2)*r*0.6, e.y - Math.sin(a2)*r*0.6);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(e.x, e.y, r*0.2, 0, TAU); ctx.fill();
    } else if (e.type === 'kamikaze') {
      const pulse = 0.7 + Math.sin(state.time*20)*0.3;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(e.x, e.y, r*0.35*pulse, 0, TAU); ctx.fill();
      for (let k = 0; k < 6; k++) {
        const a = (k/6)*TAU + e.wob;
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(e.x + Math.cos(a)*r*0.7, e.y + Math.sin(a)*r*0.7);
        ctx.lineTo(e.x + Math.cos(a)*r, e.y + Math.sin(a)*r);
        ctx.stroke();
      }
    } else if (e.type === 'dardante') {
      const activeCount = e.activeDarts || 0;
      const readyCount = Math.max(0, 4 - activeCount);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, r*0.5, 0, TAU); ctx.stroke();
      for (let k = 0; k < readyCount; k++) {
        const a = (k/4)*TAU + e.wob * 1.5;
        const dx = e.x + Math.cos(a) * (r + 8);
        const dy = e.y + Math.sin(a) * (r + 8);
        ctx.save();
        ctx.translate(dx, dy); ctx.rotate(a + Math.PI/2);
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.moveTo(0, -6); ctx.lineTo(-3, 4); ctx.lineTo(3, 4);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath(); ctx.arc(e.x, e.y, r*0.25, 0, TAU); ctx.fill();
    } else if (e.type === 'juggernaut') {
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(e.x, e.y, r*0.7, 0, TAU); ctx.stroke();
      if (e.jState === 'charging') {
        const ratio = 1 - (e.jTimer / 0.75);
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r*0.7, -Math.PI/2, -Math.PI/2 + ratio*TAU);
        ctx.stroke();
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.3*Math.sin(state.time * 20);
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(e.jAngle) * 900, e.y + Math.sin(e.jAngle) * 900);
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath(); ctx.arc(e.x, e.y, r*0.35, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.arc(e.x, e.y, r*0.15, 0, TAU); ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(e.x, e.y, r*0.65, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath(); ctx.arc(e.x, e.y, r*0.28, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(e.x - r*0.3, e.y - r*0.3, r*0.22, 0, TAU); ctx.fill();
    }
    ctx.restore();
    if (e.maxHp > 2) {
      const w = e.size, hp = e.hp / e.maxHp;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(e.x - w/2, e.y - r - 12, w, 5);
      ctx.fillStyle = e.color;
      ctx.fillRect(e.x - w/2, e.y - r - 12, w * hp, 5);
    }
  }


}
function renderEntities1() {
 const p=state.player;
  // Boss
  if (state.boss) {
    const b = state.boss;
    for (const ball of b.balls) {
      if (ball.state === 'attached') {
        ctx.strokeStyle = 'rgba(255, 100, 130, 0.55)';
        ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(ball.x, ball.y); ctx.stroke();
        ctx.save();
        ctx.shadowColor = '#ff2255'; ctx.shadowBlur = 25;
        ctx.fillStyle = '#ff5577';
        ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, TAU); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.arc(ball.x - ball.r*0.3, ball.y - ball.r*0.3, ball.r*0.35, 0, TAU); ctx.fill();
        ctx.restore();
      } else {
        ctx.save();
        ctx.shadowColor = '#ff2255'; ctx.shadowBlur = 30;
        ctx.fillStyle = '#ff7788';
        ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, TAU); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r * 0.5, 0, TAU); ctx.stroke();
        ctx.restore();
      }
    }
    const r = b.size / 2;
    if (b.state === 'dash_windup') {
      ctx.save();
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(state.time * 30);
      ctx.strokeStyle = '#ffdd00'; ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + Math.cos(b.dashAngle) * 1000, b.y + Math.sin(b.dashAngle) * 1000);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.shadowColor = '#ff2255'; ctx.shadowBlur = 60;
    ctx.fillStyle = b.hitFlash > 0 ? '#ffffff' : '#a01030';
    ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff2255';
    ctx.beginPath(); ctx.arc(b.x, b.y, r * 0.78, 0, TAU); ctx.fill();
    ctx.save();
    ctx.translate(b.x, b.y); ctx.rotate(state.time * 1.5);
    ctx.strokeStyle = '#ffccdd'; ctx.lineWidth = 5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(0, 0, r * (0.3 + i*0.15), 0, TAU); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#ffdddd';
    ctx.beginPath(); ctx.arc(b.x, b.y, r * 0.25, 0, TAU); ctx.fill();
    ctx.strokeStyle = b.phase === 1 ? '#ff2255' : (b.phase === 2 ? '#ff7700' : '#ff0000');
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r + 16, -Math.PI/2, -Math.PI/2 + (b.hp/b.maxHp) * TAU);
    ctx.stroke();
    ctx.restore();
  }

  for (const bomb of state.bossBombs) {
    if (bomb.exploded) {
      const a = 1 - bomb.fadeTimer / 0.6;
      if (a > 0) {
        ctx.save();
        ctx.globalAlpha = a * 0.6;
        ctx.fillStyle = '#ff8c42';
        ctx.beginPath(); ctx.arc(bomb.x, bomb.y, 100 * (1 - a*0.5), 0, TAU); ctx.fill();
        ctx.restore();
      }
      continue;
    }
    const pulse = 1 + Math.sin(state.time * 15) * 0.15;
    ctx.save();
    ctx.shadowColor = '#ff8c42'; ctx.shadowBlur = 15;
    ctx.fillStyle = bomb.timer < 1 ? '#ffdd00' : '#ff8c42';
    ctx.beginPath(); ctx.arc(bomb.x, bomb.y, bomb.r * pulse, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
    ctx.beginPath();
    const ang = state.time * 6;
    ctx.moveTo(bomb.x, bomb.y);
    ctx.lineTo(bomb.x + Math.cos(ang) * bomb.r, bomb.y + Math.sin(ang) * bomb.r);
    ctx.stroke();
    ctx.restore();
  }

  for (const ls of state.bossLasers) {
    const length = 3000;
    const x1 = ls.x, y1 = ls.y;
    const x2 = ls.x + Math.cos(ls.angle) * length;
    const y2 = ls.y + Math.sin(ls.angle) * length;
    if (ls.state === 'warmup') {
      ctx.save();
      ctx.globalAlpha = 0.3 + 0.3 * Math.sin(state.time * 20);
      ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 3;
      ctx.setLineDash([12, 8]);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    } else {
      const a = ls.active / 1.6;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 40;
      ctx.strokeStyle = '#ff3366'; ctx.lineWidth = ls.width;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = ls.width * 0.4;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.restore();
    }
  }

  for (const d of state.enemyDarts) {
    ctx.save();
    ctx.translate(d.x, d.y); ctx.rotate(d.angle);
    ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.moveTo(8, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }


}
function renderEntities2() {
 const p=state.player;
  // Balas jugador
  ctx.save();
  for (const b of state.bullets) {
    if (b.dupli > 0) { ctx.shadowColor = '#ff4dd2'; ctx.shadowBlur = 16; ctx.fillStyle = '#ffd1f0'; }
    else if (b.homing) { ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 16; ctx.fillStyle = '#e9d5ff'; }
    else if (b.drone) { ctx.shadowColor = '#4dff88'; ctx.shadowBlur = 14; ctx.fillStyle = '#d9ffe3'; }
    else { ctx.shadowColor = '#9ef7ff'; ctx.shadowBlur = 14; ctx.fillStyle = '#eaffff'; }
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    if (b.bounces > 0) {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(251,191,36,0.8)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 2, 0, TAU); ctx.stroke();
    }
    if (b.homing) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#a855f7';
      const orbA = state.time * 10;
      ctx.beginPath(); ctx.arc(b.x + Math.cos(orbA)*(b.r + 2), b.y + Math.sin(orbA)*(b.r + 2), 1.8, 0, TAU); ctx.fill();
    }
    if (b.dupli > 0) {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r*0.5, 0, TAU); ctx.stroke();
    }
  }
  ctx.restore();


}
function renderEntities3() {
 const p=state.player;
  // Balas enemigas
  ctx.save();
  for (const b of state.enemyBullets) {
    ctx.shadowColor = '#ff8c42'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffd0a8';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
  }
  ctx.restore();


}
function renderEntities4() {
 const p=state.player;
  // Drones
  if (!state.over) {
    for (const d of state.drones) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.save();
      ctx.rotate(d.angle);
      ctx.shadowColor = '#4dff88'; ctx.shadowBlur = 10;
      ctx.fillStyle = '#d9ffe3';
      ctx.fillRect(8, -2, 10, 4);
      ctx.restore();
      ctx.shadowColor = '#4dff88'; ctx.shadowBlur = 14;
      ctx.fillStyle = '#4dff88';
      ctx.fillRect(-8, -8, 16, 16);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.fillRect(-3, -3, 6, 6);
      ctx.fillStyle = '#4dff88';
      for (let i = 0; i < d.lines; i++) ctx.fillRect(-8 + i*4, -13, 3, 3);
      ctx.restore();
    }
  }


}
function renderEntities5() {
 const p=state.player;
  // Dardos jugador
  if (!state.over) {
    for (const d of state.darts) {
      ctx.save();
      ctx.translate(d.x, d.y); ctx.rotate(d.angle + Math.PI/2);
      if (d.type === 'explosive') {
        ctx.shadowColor = '#fb7185'; ctx.shadowBlur = 14;
        ctx.fillStyle = '#fecdd3';
      } else {
        ctx.shadowColor = '#fcd34d'; ctx.shadowBlur = 12;
        ctx.fillStyle = '#fcd34d';
      }
      ctx.beginPath();
      ctx.moveTo(0, -8); ctx.lineTo(-5, 6); ctx.lineTo(5, 6);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = d.type === 'explosive' ? '#fb7185' : '#fff';
      ctx.beginPath(); ctx.arc(0, 2, 2, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }


}
function renderEntities6() {
 const p=state.player;
  // Escudos
  if (!state.over) {
    for (const sh of state.shields) {
      const hpRatio = sh.hp / sh.maxHp;
      ctx.save();
      ctx.translate(sh.x, sh.y);
      ctx.shadowColor = '#4df3ff'; ctx.shadowBlur = 16;
      ctx.strokeStyle = 'rgba(77,243,255,0.85)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = hpRatio > 0.5 ? '#4df3ff' : (hpRatio > 0.25 ? '#fbbf24' : '#ef4444');
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(0, 0, 12, -Math.PI/2, -Math.PI/2 + hpRatio*TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(77,243,255,0.4)';
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }


}
function renderEntities7() {
 const p=state.player;
  // LÁSER: CARGA
  if (state.laserCharging) {
    const t = state.laserChargeTime;
    const width = 20 + t * 25;
    const range = 2000;
    const angle = p.angle;
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(angle);
    const alpha = 0.15 + Math.min(0.5, t * 0.1);
    ctx.fillStyle = `rgba(255,80,120,${alpha})`;
    ctx.shadowColor = '#ff3366'; ctx.shadowBlur = 30;
    ctx.fillRect(0, -width / 2, range, width);
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.6})`;
    ctx.fillRect(0, -width * 0.15, range, width * 0.3);
    ctx.restore();

    const auraR = p.size / 2 + 10 + width * 0.4;
    const pulse = 0.5 + 0.5 * Math.sin(state.time * 20);
    ctx.save();
    ctx.strokeStyle = `rgba(255,80,120,${0.5 + Math.min(0.5, t * 0.05)})`;
    ctx.lineWidth = 2 + Math.min(6, t * 0.5);
    ctx.shadowColor = '#ff3366'; ctx.shadowBlur = 20 + Math.min(60, t * 5);
    ctx.beginPath(); ctx.arc(p.x, p.y, auraR, 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(255,150,180,${0.4 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, auraR * 0.75, 0, TAU); ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff5577';
    ctx.shadowColor = '#ff3366'; ctx.shadowBlur = 15;
    ctx.fillText(t.toFixed(1) + 's  ·  ' + Math.round(width) + 'px', p.x, p.y - p.size / 2 - 50);
    ctx.restore();
  }


}
function renderEntities8() {
 const p=state.player;
  // Rayos activos
  for (const lf of state.lasersFiring) {
    for (let k = 0; k < lf.count; k++) {
      const angle = p.angle + lf.sweep + (k / lf.count) * TAU;
      const range = 2000;
      const x2 = p.x + Math.cos(angle) * range;
      const y2 = p.y + Math.sin(angle) * range;
      const w = lf.width;
      ctx.save();
      ctx.shadowColor = '#ff3366'; ctx.shadowBlur = 60;
      ctx.strokeStyle = 'rgba(255,80,120,0.85)';
      ctx.lineWidth = w; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = Math.max(3, w * 0.35);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,180,220,0.5)';
      ctx.lineWidth = Math.max(1, w * 0.15);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.restore();
    }
  }


}
