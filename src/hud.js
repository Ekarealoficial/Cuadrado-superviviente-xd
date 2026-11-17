'use strict';
/* =============== HUD =============== */
function heartPath(cx, cy, s) {
  const x = cx, y = cy - s*0.5, t = s*0.3;
  ctx.beginPath();
  ctx.moveTo(x, y + t);
  ctx.bezierCurveTo(x, y, x - s/2, y, x - s/2, y + t);
  ctx.bezierCurveTo(x - s/2, y + (s + t)/2, x, y + (s + t)/2, x, y + s);
  ctx.bezierCurveTo(x, y + (s + t)/2, x + s/2, y + (s + t)/2, x + s/2, y + t);
  ctx.bezierCurveTo(x + s/2, y, x, y, x, y + t);
  ctx.closePath();
}
function drawHeart(cx, cy, s, halves) {
  heartPath(cx, cy, s);
  ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,90,120,0.55)'; ctx.stroke();
  if (halves <= 0) return;
  ctx.save();
  heartPath(cx, cy, s); ctx.clip();
  if (halves === 1) { ctx.beginPath(); ctx.rect(cx - s, cy - s, s, s*3); ctx.clip(); }
  heartPath(cx, cy, s);
  ctx.fillStyle = '#ff3b6b'; ctx.shadowColor = '#ff3b6b'; ctx.shadowBlur = 14;
  ctx.fill();
  ctx.restore();
}
function drawHUD() {
  const hearts = Math.ceil(state.maxHalfHearts / 2);
  let s = 28, gap = 12;
  let totalW = hearts * s + (hearts - 1) * gap;
  if (totalW > W - 120) {
    gap = 6;
    s = Math.max(16, (W - 120 - (hearts - 1) * gap) / hearts);
    totalW = hearts * s + (hearts - 1) * gap;
  }
  let hx = W / 2 - totalW / 2 + s / 2;
  for (let i = 0; i < hearts; i++) {
    drawHeart(hx, 34, s, clamp(state.halfHearts - i * 2, 0, 2));
    hx += s + gap;
  }

  const xpW = 240, xpH = 10;
  const xpX = W / 2 - xpW / 2, xpY = 62;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(xpX, xpY, xpW, xpH);
  ctx.fillStyle = '#8fff9e';
  ctx.fillRect(xpX, xpY, xpW * clamp(state.xp / state.xpNeeded, 0, 1), xpH);
  ctx.strokeStyle = 'rgba(143,255,158,0.6)'; ctx.lineWidth = 1.5;
  ctx.strokeRect(xpX, xpY, xpW, xpH);

  ctx.save();
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('NIVEL ' + state.level, W / 2, xpY + 14);
  ctx.restore();

  ctx.save();
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('PUNTOS  ' + state.score, 24, 22);
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('BAJAS  ' + state.kills + '   ·   TIEMPO  ' + state.time.toFixed(1) + 's', 24, 48);

  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText(
    'Daño x' + state.playerDamageMult.toFixed(2) +
    '   ·   Enemigos x' + state.enemyHpMult.toFixed(2) +
    '   ·   Spawn x' + state.spawnRateMult.toFixed(2) +
    (state.player.regenLevel > 0 ? '   ·   Regen: ' + state.player.regenInterval.toFixed(0) + 's' : '') +
    (state.player.greedLevel > 0 ? '   ·   Codicia: ' + (state.player.greedLevel * 15) + '%' : ''),
    24, 70);
  if (state.player.laserCount > 0) {
    ctx.fillStyle = 'rgba(255,80,120,0.8)';
    ctx.fillText('Láser: ' + state.player.laserCount + '  (mantén clic para cargar, suelta para disparar)', 24, 88);
  }
  ctx.restore();

  // ==== SLOTS (esquina) con info de cargas y cooldown ====
  const slotSize = 52;
  const slotGap = 8;
  const slotY = H - 76;
  const slotStartX = 24;
  for (let i = 0; i < 5; i++) {
    const sx = slotStartX + i * (slotSize + slotGap);
    const cardId = state.slots[i];
    const card = cardId ? SPECIAL_CARDS.find(c => c.id === cardId) : null;
    const sc = card ? state.specialCards[cardId] : null;

    // Fondo
    ctx.save();
    ctx.fillStyle = card ? 'rgba(30, 25, 60, 0.95)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(sx, slotY, slotSize, slotSize);
    ctx.strokeStyle = card ? card.color : 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, slotY, slotSize, slotSize);

    // Número de tecla (top-left)
    ctx.fillStyle = card ? '#fff' : 'rgba(255,255,255,0.35)';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText((i + 1), sx + 4, slotY + 3);

    if (card && sc) {
      // Icono (centro)
      const iconX = sx + slotSize/2;
      const iconY = slotY + slotSize/2 - 2;
      ctx.fillStyle = card.color;
      ctx.beginPath(); ctx.arc(iconX, iconY, 12, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(card.name[0], iconX, iconY + 1);

      // Cargas (bottom, texto "X/Y")
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(sc.charges + '/' + sc.maxCharges, sx + slotSize/2, slotY + slotSize - 3);

      // Overlay cooldown si recargando
      if (sc.charges < sc.maxCharges) {
        // Fondo oscuro
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(sx + 2, slotY + 2, slotSize - 4, slotSize - 4);
        // Tiempo restante
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(Math.ceil(sc.cooldown) + 's', sx + slotSize/2, slotY + slotSize/2 - 2);
        // Arco de progreso
        const ratio = 1 - sc.cooldown / sc.cooldownMax;
        ctx.strokeStyle = card.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx + slotSize/2, slotY + slotSize/2, slotSize/2 - 3, -Math.PI/2, -Math.PI/2 + ratio * TAU);
        ctx.stroke();
        // Volver a dibujar cargas para que se vean encima
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(sc.charges + '/' + sc.maxCharges, sx + slotSize/2, slotY + slotSize - 3);
      }
    } else {
      // Slot vacío: solo número grande centrado
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText((i + 1), sx + slotSize/2, slotY + slotSize/2 + 4);
    }
    ctx.restore();
  }
  // Etiqueta "E: inventario"
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  ctx.fillText('E: inventario', slotStartX, slotY - 6);
  ctx.restore();

  // Indicador de regeneración
  if (state.player.regenLevel > 0 && state.halfHearts < state.maxHalfHearts) {
    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(74, 222, 128, 0.8)';
    ctx.fillText('❤ Regen en ' + Math.max(0, state.player.regenTimer).toFixed(1) + 's', W - 24, 70);
    ctx.restore();
  }

  // Indicador de thunder rain
  if (state.thunderRain.active) {
    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(253, 224, 71, 0.95)';
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 12;
    ctx.fillText('⚡ Lluvia: ' + state.thunderRain.timer.toFixed(1) + 's', W - 24, 92);
    ctx.restore();
  }

  if (state.boss) {
    const bw = Math.min(W - 100, 600);
    const bx = (W - bw) / 2;
    const by = 100;
    const bh = 22;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(bx - 3, by - 3, bw + 6, bh + 6);
    ctx.fillStyle = '#3a0010';
    ctx.fillRect(bx, by, bw, bh);
    const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    grad.addColorStop(0, '#ff2255');
    grad.addColorStop(1, '#ff7700');
    ctx.fillStyle = grad;
    ctx.fillRect(bx, by, bw * (state.boss.hp / state.boss.maxHp), bh);
    ctx.strokeStyle = '#ff5577'; ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.5, by); ctx.lineTo(bx + bw * 0.5, by + bh);
    ctx.moveTo(bx + bw * 0.33, by); ctx.lineTo(bx + bw * 0.33, by + bh);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('JEFE  (FASE ' + state.boss.phase + ')', W / 2, by - 6);
  }

  ctx.save();
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillText('WASD mover  ·  RATÓN apuntar  ·  CLIC disparar  ·  1-5 skills  ·  E inventario', W - 24, 24);
  ctx.restore();
}

