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
  const hovered=state.inventoryCardRects.find(r=>mouse.x>=r.x && mouse.x<=r.x+r.w && mouse.y>=r.y && mouse.y<=r.y+r.h);
  const detail=SPECIAL_CARDS.find(c=>c.id===hovered?.id);
  ctx.fillText(detail?.desc || 'Selecciona una carta y luego un slot. Clic derecho para quitarla.',W/2,120,W-36);
  ctx.restore();

  const availCards = SPECIAL_CARDS.filter(c => state.specialCards[c.id] && state.specialCards[c.id].totalCards > 0);
  for(const rect of state.inventoryCardRects){
    const card=availCards.find(c=>c.id===rect.id),sc=state.specialCards[card.id];
    ctx.save();ctx.fillStyle='#151428';ctx.strokeStyle=state.inventorySelection===card.id?'#fff':card.color;
    roundRect(rect.x,rect.y,rect.w,rect.h,7);ctx.fill();ctx.stroke();
    drawCardIcon(rect.x+19,rect.y+rect.h/2,23,card,card.color);
    ctx.fillStyle='#fff';ctx.font='bold 14px system-ui';ctx.textAlign='left';
    ctx.fillText(card.name,rect.x+37,rect.y+rect.h*.46,rect.w-45);
    ctx.fillStyle=card.color;ctx.font='12px system-ui';
    ctx.fillText('×'+sc.totalCards+'  ·  Cargas '+sc.charges+'/'+sc.maxCharges,rect.x+37,rect.y+rect.h*.82,rect.w-45);ctx.restore();
  }
  if(!availCards.length){ctx.save();ctx.textAlign='center';ctx.fillStyle='#ccd';ctx.fillText('Sin cartas especiales',W/2,175);ctx.restore();}
  // Slots
  const slotsTotalW = 5 * SLOT_W + 4 * SLOT_GAP;
  const slotsX = W / 2 - slotsTotalW / 2;
  const slotsY = state.inventorySlotRects[0].y;

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

