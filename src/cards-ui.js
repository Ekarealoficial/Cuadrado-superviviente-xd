'use strict';
/* =============== CARTAS UI =============== */
const CARD_W = 230, CARD_H = 320, CARD_GAP = 40;
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function wrapText(text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '', yy = y;
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), x, yy);
      line = word + ' ';
      yy += lineH;
    } else line = test;
  }
  if (line) ctx.fillText(line.trim(), x, yy);
}

function drawCardIcon(cx, cy, size, card, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = Math.max(3, size * 0.12);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const s = size * 0.5;
  switch (card.id) {
    case 'kame': case 'activeHeal': case 'reverse': case 'plasma': case 'timeBreak':
      neonRing(s*.84,color,2);
      ctx.font='bold '+size*.74+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(({kame:'➤',activeHeal:'✚',reverse:'↶',plasma:'⬡',timeBreak:'Ⅱ'})[card.id],0,0);break;
    case 'armor':
      ctx.beginPath();ctx.moveTo(0,-s);ctx.lineTo(s*.78,-s*.65);ctx.lineTo(s*.66,s*.25);
      ctx.lineTo(0,s);ctx.lineTo(-s*.66,s*.25);ctx.lineTo(-s*.78,-s*.65);ctx.closePath();ctx.stroke();
      ctx.fillRect(-s*.1,-s*.55,s*.2,s*1.05);break;
    case 'critical': case 'explosive':
      ctx.beginPath();
      for(let i=0;i<16;i++){
        const a=i*Math.PI/8,r=i%2?s*.3:(card.id==='critical' && i%4 ? s*.54 : s);
        const x=Math.cos(a)*r,y=Math.sin(a)*r;
        if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
      }
      ctx.closePath();ctx.stroke();ctx.fillRect(-s*.13,-s*.13,s*.26,s*.26);break;
    case 'frost':
      ctx.beginPath();
      for(let i=0;i<6;i++){
        ctx.rotate(TAU/6);ctx.moveTo(0,0);ctx.lineTo(0,-s);
        ctx.moveTo(-s*.22,-s*.65);ctx.lineTo(0,-s*.45);ctx.lineTo(s*.22,-s*.65);
      }
      ctx.stroke();break;
    case 'vampirism':
      ctx.beginPath();ctx.moveTo(0,-s);ctx.quadraticCurveTo(s*1.28,s*.55,s*.35,s*.85);
      ctx.quadraticCurveTo(-s*1.2,s*1.12,-s*.49,-s*.15);ctx.closePath();ctx.stroke();
      ctx.fillRect(-s*.1,0,s*.2,s*.55);ctx.fillRect(-s*.27,s*.18,s*.54,s*.18);break;
    case 'fury':
      ctx.beginPath();ctx.moveTo(-s*.68,s*.75);ctx.lineTo(-s*.87,-s*.24);
      ctx.lineTo(-s*.38,0);ctx.lineTo(-s*.08,-s);ctx.lineTo(s*.21,-s*.22);
      ctx.lineTo(s*.68,-s*.55);ctx.lineTo(s*.56,s*.76);ctx.closePath();ctx.stroke();
      ctx.fillRect(-s*.26,s*.34,s*.56,s*.16);break;
    case 'frames':case 'swords':case 'gravity':case 'venom':
      ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font='bold '+size+'px system-ui';
      ctx.fillText(({frames:'ϟ',swords:'⚔',gravity:'◎',venom:'☠'})[card.id],0,0);
      break;
    case 'fire':
      ctx.beginPath();
      ctx.moveTo(-s*0.3, -s); ctx.lineTo(s*0.1, -s*0.1);
      ctx.lineTo(-s*0.1, -s*0.1); ctx.lineTo(s*0.3, s);
      ctx.lineTo(-s*0.1, s*0.1); ctx.lineTo(s*0.15, s*0.1);
      ctx.closePath(); ctx.fill(); break;
    case 'multi':
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.arc(i*s*0.5, s*0.4, s*0.22, 0, TAU); ctx.fill();
        ctx.fillRect(i*s*0.5 - s*0.09, -s*0.9, s*0.18, s*1.0);
      } break;
    case 'health': {
      const hs = s * 1.6;
      ctx.beginPath();
      ctx.moveTo(0, hs*0.3);
      ctx.bezierCurveTo(0, 0, -hs/2, 0, -hs/2, hs*0.3);
      ctx.bezierCurveTo(-hs/2, hs*0.6, 0, hs*0.8, 0, hs);
      ctx.bezierCurveTo(0, hs*0.8, hs/2, hs*0.6, hs/2, hs*0.3);
      ctx.bezierCurveTo(hs/2, 0, 0, 0, 0, hs*0.3);
      ctx.fill(); break;
    }
    case 'speed':
      for (let i = 0; i < 3; i++) {
        const yy = -s*0.6 + i*s*0.6;
        ctx.beginPath();
        ctx.moveTo(-s*0.7, yy); ctx.lineTo(s*0.3, yy);
        ctx.moveTo(s*0.3, yy); ctx.lineTo(s*0.05, yy - s*0.22);
        ctx.moveTo(s*0.3, yy); ctx.lineTo(s*0.05, yy + s*0.22);
        ctx.stroke();
      } break;
    case 'back':
      ctx.beginPath(); ctx.moveTo(-s*0.6, -s*0.5); ctx.lineTo(s*0.6, -s*0.5); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s*0.6, -s*0.5); ctx.lineTo(-s*0.35, -s*0.7);
      ctx.moveTo(-s*0.6, -s*0.5); ctx.lineTo(-s*0.35, -s*0.3);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s*0.6, s*0.5); ctx.lineTo(-s*0.6, s*0.5); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s*0.6, s*0.5); ctx.lineTo(s*0.35, s*0.7);
      ctx.moveTo(s*0.6, s*0.5); ctx.lineTo(s*0.35, s*0.3);
      ctx.stroke(); break;
    case 'drone1': case 'drone2': case 'drone3': {
      ctx.fillRect(-s*0.5, -s*0.5, s, s);
      ctx.strokeRect(-s*0.5, -s*0.5, s, s);
      ctx.fillStyle = '#08080f'; ctx.fillRect(-s*0.15, -s*0.15, s*0.3, s*0.3);
      ctx.fillStyle = color; ctx.fillRect(s*0.5, -s*0.15, s*0.5, s*0.3);
      const lines = card.id === 'drone1' ? 1 : (card.id === 'drone2' ? 2 : 3);
      for (let k = 0; k < lines; k++) ctx.fillRect(-s*0.4 + k*(s*0.4), -s*0.85, s*0.15, s*0.15);
      break;
    }
    case 'magnet':
      ctx.lineWidth = Math.max(2, size*0.07);
      for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(0, 0, s*i*0.28, 0, TAU); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, 0, s*0.14, 0, TAU); ctx.fill();
      break;
    case 'shield':
      ctx.lineWidth = Math.max(3, size*0.08);
      ctx.beginPath(); ctx.arc(0, 0, s*0.7, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, s*0.35, 0, TAU); ctx.fill(); break;
    case 'bounce':
      ctx.lineWidth = Math.max(3, size*0.08);
      ctx.beginPath(); ctx.arc(0, s*0.3, s*0.5, Math.PI + 0.4, -0.4); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s*0.45, s*0.15); ctx.lineTo(s*0.55, s*0.35); ctx.lineTo(s*0.30, s*0.35); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -s*0.3, s*0.35, 0, TAU); ctx.fill(); break;
    case 'homing':
      ctx.lineWidth = Math.max(3, size*0.08);
      ctx.beginPath();
      ctx.moveTo(-s*0.8, s*0.6); ctx.quadraticCurveTo(-s*0.2, -s*0.8, s*0.6, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s*0.75, -s*0.05); ctx.lineTo(s*0.45, -s*0.25); ctx.lineTo(s*0.55, s*0.15); ctx.fill();
      break;
    case 'dupli':
      ctx.beginPath(); ctx.arc(-s*0.3, s*0.2, s*0.22, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(s*0.3, s*0.2, s*0.22, 0, TAU); ctx.fill();
      ctx.lineWidth = Math.max(2, size*0.07);
      ctx.beginPath(); ctx.arc(0, s*0.2, s*0.55, Math.PI + 0.3, -0.3); ctx.stroke(); break;
    case 'size':
      ctx.beginPath(); ctx.arc(-s*0.5, s*0.3, s*0.18, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(s*0.3, -s*0.05, s*0.5, 0, TAU); ctx.fill(); break;
    case 'dart':
      ctx.beginPath();
      ctx.moveTo(0, -s*0.8); ctx.lineTo(-s*0.5, s*0.7); ctx.lineTo(s*0.5, s*0.7);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#08080f';
      ctx.beginPath(); ctx.arc(0, s*0.3, s*0.15, 0, TAU); ctx.fill(); break;
    case 'explosiveDart':
      ctx.beginPath();
      ctx.moveTo(0, -s*0.8); ctx.lineTo(-s*0.35, s*0.4); ctx.lineTo(s*0.35, s*0.4);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#fb7185'; ctx.lineWidth = Math.max(2, size*0.08);
      for (let k = 0; k < 6; k++) {
        const a = (k/6)*TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a)*s*0.5, Math.sin(a)*s*0.5 + s*0.3);
        ctx.lineTo(Math.cos(a)*s*0.85, Math.sin(a)*s*0.85 + s*0.3);
        ctx.stroke();
      } break;
    case 'rayolaser': {
      ctx.lineWidth = Math.max(4, size*0.12);
      ctx.beginPath();
      ctx.moveTo(0, s*0.9); ctx.lineTo(0, -s*0.9);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(0, s*0.9, s*0.2, 0, TAU); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s*0.3, -s*0.6); ctx.lineTo(0, -s*0.95); ctx.lineTo(s*0.3, -s*0.6);
      ctx.stroke();
      break;
    }
    case 'lightning':
      ctx.beginPath();
      ctx.moveTo(-s*0.2, -s*0.9);
      ctx.lineTo(s*0.3, -s*0.1); ctx.lineTo(-s*0.05, -s*0.1);
      ctx.lineTo(s*0.2, s*0.9); ctx.lineTo(-s*0.3, s*0.1);
      ctx.lineTo(s*0.05, s*0.1); ctx.closePath(); ctx.fill(); break;
    case 'regen': {
      const hs = s * 1.4;
      ctx.beginPath();
      ctx.moveTo(0, hs*0.3);
      ctx.bezierCurveTo(0, 0, -hs/2, 0, -hs/2, hs*0.3);
      ctx.bezierCurveTo(-hs/2, hs*0.6, 0, hs*0.8, 0, hs);
      ctx.bezierCurveTo(0, hs*0.8, hs/2, hs*0.6, hs/2, hs*0.3);
      ctx.bezierCurveTo(hs/2, 0, 0, 0, 0, hs*0.3);
      ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, size*0.06);
      ctx.beginPath();
      ctx.arc(0, s*0.2, s*0.7, Math.PI*0.3, Math.PI*1.7);
      ctx.stroke();
      break;
    }
    case 'greed': {
      ctx.beginPath(); ctx.arc(0, 0, s*0.8, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#08080f'; ctx.lineWidth = Math.max(3, size*0.09);
      ctx.beginPath();
      ctx.moveTo(-s*0.4, 0); ctx.lineTo(s*0.4, 0);
      ctx.moveTo(0, -s*0.4); ctx.lineTo(0, s*0.4);
      ctx.stroke();
      break;
    }
    case 'blink': {
      ctx.lineWidth = Math.max(3, size*0.10);
      ctx.beginPath();
      ctx.moveTo(-s*0.7, s*0.7); ctx.lineTo(s*0.6, -s*0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s*0.6, -s*0.6); ctx.lineTo(s*0.6, -s*0.1);
      ctx.moveTo(s*0.6, -s*0.6); ctx.lineTo(s*0.1, -s*0.6);
      ctx.stroke();
      for (let k = 0; k < 4; k++) {
        const a = (k/4)*TAU + Math.PI/4;
        ctx.beginPath();
        ctx.moveTo(-s*0.7 + Math.cos(a)*s*0.2, s*0.7 + Math.sin(a)*s*0.2);
        ctx.lineTo(-s*0.7 + Math.cos(a)*s*0.45, s*0.7 + Math.sin(a)*s*0.45);
        ctx.stroke();
      }
      break;
    }
    case 'dash': {
      ctx.lineWidth = Math.max(3, size*0.10);
      for (let i = 0; i < 3; i++) {
        const offset = i * s * 0.3 - s * 0.4;
        ctx.beginPath();
        ctx.moveTo(offset - s*0.3, -s*0.6);
        ctx.lineTo(offset + s*0.25, 0);
        ctx.lineTo(offset - s*0.3, s*0.6);
        ctx.stroke();
      }
      break;
    }
    case 'thunderRain': {
      for (let i = 0; i < 3; i++) {
        const ox = (i - 1) * s * 0.55;
        ctx.beginPath();
        ctx.moveTo(ox - s*0.1, -s*0.8);
        ctx.lineTo(ox + s*0.15, -s*0.2);
        ctx.lineTo(ox - s*0.02, -s*0.2);
        ctx.lineTo(ox + s*0.1, s*0.8);
        ctx.lineTo(ox - s*0.15, s*0.1);
        ctx.lineTo(ox + s*0.02, s*0.1);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
  }
  ctx.restore();
}

function drawCards() {
  ctx.fillStyle = 'rgba(6,6,14,0.82)';
  ctx.fillRect(0, 0, W, H);
  const cards = state.cardChoices;
  const totalW = cards.length * CARD_W + (cards.length - 1) * CARD_GAP;
  const startX = W / 2 - totalW / 2;
  const y = H / 2 - CARD_H / 2;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ffd54a'; ctx.shadowBlur = 22;
  ctx.fillStyle = '#ffd54a';
  ctx.font = 'bold 42px system-ui, sans-serif';
  ctx.fillText(state.bonusPicks?'BOTÍN DEL JEFE':'¡NIVEL ' + state.level + '!', W / 2, y - 100);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText(state.bonusPicks?'Elige una carta · '+state.bonusPicks+' por elegir':'Elige una mejora', W / 2, y - 55);
  if (state.pendingLevelUps > 1) {
    ctx.fillStyle = 'rgba(255,213,74,0.75)';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText('+' + (state.pendingLevelUps - 1) + ' subida(s) pendiente(s)', W / 2, y - 30);
  }
  ctx.restore();

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const cx = startX + i * (CARD_W + CARD_GAP);

    const hover = mouse.x >= cx && mouse.x <= cx + CARD_W && mouse.y >= y && mouse.y <= y + CARD_H;
    const lift = hover ? -10 : 0;
    ctx.save();
    ctx.translate(0, lift);
    if (hover) { ctx.shadowColor = card.color; ctx.shadowBlur = 40; }
    else { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 20; }
    const grad = ctx.createLinearGradient(cx, y, cx, y + CARD_H);
    grad.addColorStop(0, '#1a2340'); grad.addColorStop(1, '#0f1428');
    ctx.fillStyle = grad;
    roundRect(cx, y, CARD_W, CARD_H, 18); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = card.color; ctx.lineWidth = hover ? 3 : 2;
    roundRect(cx, y, CARD_W, CARD_H, 18); ctx.stroke();
    if (SPECIAL_CARDS.find(c => c.id === card.id)) {
      ctx.fillStyle = 'rgba(168, 85, 247, 0.9)';
      roundRect(cx + CARD_W - 80, y + 8, 72, 18, 9); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('ESPECIAL', cx + CARD_W - 44, y + 17);
    }
    const iconY = y + 95;
    ctx.globalAlpha = 0.16; ctx.fillStyle = card.color;
    ctx.beginPath(); ctx.arc(cx + CARD_W/2, iconY, 55, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    drawCardIcon(cx + CARD_W/2, iconY, 60, card, card.color);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(card.name, cx + CARD_W/2, y + 185);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + 30, y + 210); ctx.lineTo(cx + CARD_W - 30, y + 210);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '15px system-ui, sans-serif';
    wrapText(card.desc, cx + CARD_W/2, y + 224, CARD_W - 32, 17);
    ctx.fillStyle = hover ? card.color : 'rgba(255,255,255,0.35)';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('[' + (i + 1) + ']', cx + CARD_W/2, y + CARD_H - 22);
    ctx.restore();
  }
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(6,6,14,0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.save();
  ctx.shadowColor = '#ff3b6b'; ctx.shadowBlur = 30;
  ctx.fillStyle = '#ff3b6b';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('HAS CAÍDO', W / 2, H / 2 - 80);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText('Puntos: ' + state.score, W / 2, H / 2 - 5);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Bajas: ' + state.kills + '   ·   Nivel: ' + state.level, W / 2, H / 2 + 35);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText('Supervivencia: ' + state.time.toFixed(1) + 's', W / 2, H / 2 + 65);
  if (state.overTimer > 0.5) {
    const a = 0.5 + 0.5 * Math.sin(state.overTimer * 5);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#4df3ff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(playMode === 'online' ? 'Usa «Salir al menú» para elegir otra partida' : 'Pulsa R o haz CLIC para volver a jugar', W / 2, H / 2 + 125);
    ctx.globalAlpha = 1;
  }
}

