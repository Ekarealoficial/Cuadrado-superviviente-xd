'use strict';
/* =============== INVENTARIO =============== */
const SLOT_W = 100, SLOT_H = 120, SLOT_GAP = 16;
const INV_CARD_W = 280, INV_CARD_H = 70, INV_CARD_GAP = 10;

function drawInventory() {
  ctx.fillStyle = 'rgba(6,6,14,0.92)';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 25;
  ctx.fillStyle = '#a855f7';
  ctx.font = 'bold 48px system-ui, sans-serif';
  ctx.fillText('INVENTARIO', W / 2, 60);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Selecciona una carta especial y luego un slot. Click derecho en un slot para quitarla.', W / 2, 120);
  ctx.restore();

  const availCards = SPECIAL_CARDS.filter(c => state.specialCards[c.id] && state.specialCards[c.id].totalCards > 0);
  const listX = W / 2 - 380;
  const listY = 200;

  ctx.save();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText('Cartas especiales', listX, listY - 40);
  ctx.restore();


  if (availCards.length === 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '16px system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('(No tienes cartas especiales todavía)', listX, listY);
    ctx.restore();
  }

  for (let i = 0; i < availCards.length; i++) {
    const card = availCards[i];
    const info = state.specialCards[card.id];
    const cy = listY + i * (INV_CARD_H + INV_CARD_GAP);
    const selected = state.inventorySelection === card.id;


    const hover = mouse.x >= listX && mouse.x <= listX + INV_CARD_W && mouse.y >= cy && mouse.y <= cy + INV_CARD_H;
    ctx.save();
    if (selected || hover) { ctx.shadowColor = card.color; ctx.shadowBlur = 20; }
    ctx.fillStyle = selected ? 'rgba(168, 85, 247, 0.3)' : 'rgba(20, 25, 45, 0.9)';
    roundRect(listX, cy, INV_CARD_W, INV_CARD_H, 12); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = selected ? card.color : (hover ? 'rgba(168,85,247,0.6)' : 'rgba(255,255,255,0.15)');
    ctx.lineWidth = selected ? 3 : 2;
    roundRect(listX, cy, INV_CARD_W, INV_CARD_H, 12); ctx.stroke();

    // Icono (usando drawCardIcon)
    const iconX = listX + 45;
    const iconY = cy + INV_CARD_H / 2;
    ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
    ctx.beginPath(); ctx.arc(iconX, iconY, 25, 0, TAU); ctx.fill();
    drawCardIcon(iconX, iconY, 40, card, card.color);

    // Texto
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(card.name, listX + 90, cy + 12);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '12px system-ui, sans-serif';
    wrapText(card.desc, listX + 90, cy + 36, INV_CARD_W - 110, 15);

    // Contador de cartas
    ctx.fillStyle = card.color;
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText('×' + info.totalCards, listX + INV_CARD_W - 15, cy + 12);

    // Estado de cargas y cooldown
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    let status = 'Cargas: ' + info.charges + '/' + info.maxCharges;
    if (info.charges < info.maxCharges) {
      status += '  ·  ' + Math.ceil(info.cooldown) + 's';
    }
    ctx.fillText(status, listX + INV_CARD_W - 15, cy + INV_CARD_H - 8);
    ctx.restore();
  }

  // Slots
  const slotsTotalW = 5 * SLOT_W + 4 * SLOT_GAP;
  const slotsX = W / 2 - slotsTotalW / 2;
  const slotsY = H / 2 + 80;

  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText('Slots (presiona 1-5 para usar)', W / 2, slotsY - 40);
  ctx.restore();


  for (let i = 0; i < 5; i++) {
    const sx = slotsX + i * (SLOT_W + SLOT_GAP);

    const cardId = state.slots[i];
    const card = cardId ? SPECIAL_CARDS.find(c => c.id === cardId) : null;
    const hover = mouse.x >= sx && mouse.x <= sx + SLOT_W && mouse.y >= slotsY && mouse.y <= slotsY + SLOT_H;

    ctx.save();
    if (hover) { ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 20; }
    ctx.fillStyle = card ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255,255,255,0.04)';
    roundRect(sx, slotsY, SLOT_W, SLOT_H, 12); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = card ? '#a855f7' : (hover ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.15)');
    ctx.lineWidth = card ? 2.5 : 2;
    roundRect(sx, slotsY, SLOT_W, SLOT_H, 12); ctx.stroke();

    ctx.fillStyle = card ? '#fff' : 'rgba(255,255,255,0.35)';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText((i + 1), sx + SLOT_W / 2, slotsY + 10);

    if (card) {
      const ix = sx + SLOT_W / 2;
      const iy = slotsY + SLOT_H / 2 + 5;
      ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
      ctx.beginPath(); ctx.arc(ix, iy, 22, 0, TAU); ctx.fill();
      drawCardIcon(ix, iy, 34, card, card.color);

      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(card.name, sx + SLOT_W / 2, slotsY + SLOT_H - 8);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('vacío', sx + SLOT_W / 2, slotsY + SLOT_H / 2 + 10);
    }
    ctx.restore();
  }

  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('E o ESC para cerrar', W / 2, H - 40);
  ctx.restore();
}

