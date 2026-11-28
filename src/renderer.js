'use strict';
/* =============== RENDER =============== */
function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#08080f';
  ctx.fillRect(0, 0, W, H);
  const shake=Math.max(state.shake,fractureShake())*visualPrefs.shake;
  let sx = 0, sy = 0;
  if (shake > 0.2) {
    sx = (Math.random() * 2 - 1) * shake;
    sy = (Math.random() * 2 - 1) * shake;
  }
  const cam = {...state.cam,zoom:viewZoom()};
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
  for (let i=0;i<=(gx1-gx0)/gs;i++) { const x=gx0+i*gs; ctx.moveTo(x + 0.5, gy0); ctx.lineTo(x + 0.5, gy1); }
  for (let i=0;i<=(gy1-gy0)/gs;i++) { const y=gy0+i*gs; ctx.moveTo(gx0, y + 0.5); ctx.lineTo(gx1, y + 0.5); }
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

  for (const w of (!state.arena && localLens.value<.999 ? getVisibleChunks(cam) : currentWalls)) {
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

  presentBossCues();
  drawStageAtmosphere();drawCosmicWorld();drawBossRemnants();
  drawExpansionWorld();
  renderEntities0();
  renderEntities1();
  renderEntities2();
  renderEnemyShots();
  renderEntities4();
  renderEntities5();
  renderEntities6();
  renderEntities7();
  renderEntities8();
  for(const body of [p,...(state.peers||[])]){
    ctx.save();
    drawGeometryCards(body);drawExpansionCast(body);
    drawCardFeedback(body);
    if(body.field)drawGravityField(body.field);
    drawCombatPulses(body);
    ctx.globalAlpha=.22;ctx.fillStyle=body.color||rules.color;
    for(const copy of body.echoes||[])ctx.fillRect(copy.x-15,copy.y-15,30,30);
    ctx.globalAlpha=1;
    for(const sword of body.blades||[]){
      ctx.save();ctx.translate(sword.x,sword.y);ctx.rotate(sword.angle+Math.PI/2);
      ctx.fillStyle='#b9faff';ctx.beginPath();ctx.moveTo(16,0);ctx.lineTo(-6,4);ctx.lineTo(-6,-4);ctx.fill();
      ctx.fillStyle='#b28cff';ctx.fillRect(-9,-6,3,12);ctx.restore();
    }
    ctx.restore();
  }
  if (!state.over) drawPlayerBody(p);
  for (const other of state.peers || []) {
    if (other.over) continue;
    if (other.drones) {
      renderEntities4(other,other); renderEntities5(other,other); renderEntities6(other,other);
      renderEntities7(other,other); renderEntities8(other,other);
    }
    drawPlayerBody(other);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px system-ui';
    ctx.fillText(other.name, other.x, other.y-24);
  }
  let particleIndex=0;
  for (const pt of state.particles) {
    if((++particleIndex%10)>=Math.ceil(visualPrefs.particles*10))continue;
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
  if(rules.botVision&&state.rush?.bot){
    const p=state.player;ctx.save();ctx.lineWidth=2;
    for(const [i,r] of (state.rush.routes||[]).entries()){ctx.strokeStyle=i?'#74d2e84d':'#a5ffad';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+r.dir.x*p.speed*.28,p.y+r.dir.y*p.speed*.28);ctx.lineTo(r.end.x,r.end.y);ctx.stroke();}
    const aim=state.rush.intent?.aim;if(aim)ctx.strokeRect(aim.x-9,aim.y-9,18,18);ctx.restore();
  }
  if(state.extra)drawExtraField(state.extra);
  if(playMode==='online')drawImpactLights(performance.now());
  if(playMode==='sandbox')drawTrainingStats();
  if(playMode==='sandbox'&&lab.hitboxes)drawLabHitboxes();
  ctx.restore();

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(${state.flashRGB},${state.flash * 0.35 * visualPrefs.flash})`;
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

  drawBossOmen();
  drawTimeFractures();
  if(mobileDevice)drawTouchHUD();else drawHUD();
  if (!mobileDevice && state.cardChoices) drawCards();
  if (!mobileDevice && state.inventoryOpen) drawInventory();
  if (!mobileDevice && state.over && !state.rush && !state.extra) drawGameOver();
  drawCrosshair();
}

const heardCardEffects={};
  // Jugador
function drawPlayerBody(p) {
    if (!Number.isFinite(p.size)) p = {...p,size:30,vx:0,vy:0,angle:0};
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > 60) {
      for (let i = 1; i <= 3; i++) {
        const t = i * 0.045;
        ctx.globalAlpha = 0.18 / i;
        ctx.fillStyle = p.color || rules.color;
        ctx.fillRect(p.x - p.vx*t - p.size/2, p.y - p.vy*t - p.size/2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
    }
    const blink = p.invuln > 0 && Math.floor(p.invuln * 18) % 2 === 0;
    ctx.save();
    ctx.translate(p.x, p.y);
    if(p.scalePulse){
      const t=clamp((state.time-p.scalePulse.born)/.25,0,1);
      const k=1+(p.scalePulse.kind==='mini'?-.24:.24)*Math.sin(Math.PI*t);ctx.scale(k,k);
    }
    ctx.save();
    ctx.rotate(p.angle);
    ctx.shadowColor = p.color || rules.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#d9fdff';
    ctx.fillRect(p.size/2 - 6, -4, 18, 8);
    if (p.backShots > 0) {
      ctx.fillStyle = '#c77dff'; ctx.shadowColor = '#c77dff';
      ctx.fillRect(-p.size/2 - 12, -4, 18, 8);
    }
    ctx.restore();
    ctx.shadowColor = p.color || rules.color;
    ctx.shadowBlur = 22;
    ctx.fillStyle = blink ? 'rgba(255,255,255,0.25)' : (p.color || rules.color);
    if(p.size<10){ctx.strokeStyle=p.color||rules.color;ctx.lineWidth=1;ctx.strokeRect(-5,-5,10,10);}
    const h = p.size / 2;
    ctx.fillRect(-h, -h, p.size, p.size);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
  }

function drawCardFeedback(body){
  const own=body===state.player;
  function sound(name,event){
    if(!own || event.born==null || heardCardEffects[name]===event.born)return;
    heardCardEffects[name]=event.born;Sfx.play(name);
  }
  if(body.field)sound('gravityPull',body.field);
  if(body.burst){
    const flash=body.burst,t=clamp((state.time-flash.born)/.42,0,1);
    if(t<1){
      sound('gravityBurst',flash);
      ctx.save();ctx.globalAlpha=1-t;ctx.strokeStyle='#e8cfff';ctx.lineWidth=5*(1-t)+1;
      ctx.translate(flash.x,flash.y);
      ctx.shadowColor='#a854ff';ctx.shadowBlur=15;
      ctx.beginPath();ctx.arc(0,0,flash.r*(.15+t),0,TAU);ctx.stroke();
      for(let i=0;i<12;i++){
        ctx.rotate(TAU/12);
        ctx.fillStyle=i%2?'#ff83e7':'#99faff';
        ctx.fillRect(flash.r*t,-2,(1-t)*14+2,4);
      }
      ctx.restore();
    }
  }
  if(body.impact){
    const hit=body.impact,t=clamp((state.time-hit.born)/.19,0,1);
    if(t<1){
      sound('speedHit',hit);
      ctx.save();ctx.translate(hit.x,hit.y);ctx.globalAlpha=1-t;ctx.strokeStyle='#ffddfa';ctx.lineWidth=3;
      ctx.beginPath();
      for(let i=0;i<7;i++){
        const a=i*TAU/7+hit.born,dx=Math.cos(a),dy=Math.sin(a);
        ctx.moveTo(dx*(3+t*9),dy*(3+t*9));ctx.lineTo(dx*(14+t*16),dy*(14+t*16));
      }
      ctx.stroke();ctx.restore();
    }
  }
}
function drawCrosshair() {
  const aim=state.rush?.intent?.aim;
  const x=aim?W/2+(aim.x-state.cam.x)*viewZoom():mouse.x;
  const y=aim?H/2+(aim.y-state.cam.y)*viewZoom():mouse.y;
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
    ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : e.slowUntil > state.time ? '#85eaff' : e.color;
    if(e.type==='erratic'||e.type==='twinCannon')ctx.fillRect(e.x-r,e.y-r,2*r,2*r);
    else{ctx.beginPath();ctx.arc(e.x,e.y,r,0,TAU);ctx.fill();}
    ctx.shadowBlur = 0;
    drawExpansionEnemy(e,r);
    const hasOwnArt=e.master?paintRetainer(e,r):advancedEnemyArt(e,r);
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
    } else if(!hasOwnArt){
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
  for (const b of livingBosses()) {
    if(PATTERN_BOSSES[b.kind]){drawPatternBoss(b);continue;}
    if(b.pieces){drawWorm(b);for(const l of b.layers||[])for(const s of scoreShapes(layerView(b,l)))if(s.kind==='line')energyLine(s,{x:s.xx,y:s.yy},s.live?'#d7ffea':'#6befae78',s.live?s.width:2);continue;}
    if(b.kind==='singular'){drawSingular(b);continue;}
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
      ctx.lineTo(b.x + Math.cos(b.dashAngle) * 880*(b.difficulty?.movement||1), b.y + Math.sin(b.dashAngle) * 880*(b.difficulty?.movement||1));
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
    const length = bossLaserReach();
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
  for (const b of (playMode==='online' && previewShots.length ? state.bullets.concat(previewShots) : state.bullets)) {
    if(b.occluded)continue;
    if(b.energized){strokeRing(b.x,b.y,b.r+2,'#fff3bc',2);}
    if(b.style==='omega'){ctx.save();ctx.translate(b.x,b.y);etchedSquare(b.r,state.time*6,'#ffab92',4);ctx.restore();}
    if(b.energized||b.style||b.persist){const t=.012+.004*Math.log1p(b.persist||0);ctx.strokeStyle=b.energized?'#fff6ca':SHOT_INK[b.style]||'#8faeda';ctx.lineWidth=Math.max(1,b.r*.8);ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-b.vx*t,b.y-b.vy*t);ctx.stroke();}
    if (b.dupli > 0) { ctx.shadowColor = '#ff4dd2'; ctx.shadowBlur = 16; ctx.fillStyle = '#ffd1f0'; }
    else if (b.homing) { ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 16; ctx.fillStyle = '#e9d5ff'; }
    else if (b.drone) { ctx.shadowColor = '#4dff88'; ctx.shadowBlur = 14; ctx.fillStyle = '#d9ffe3'; }
    else { ctx.shadowColor = '#9ef7ff'; ctx.shadowBlur = 14; ctx.fillStyle = '#eaffff'; }
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    if(b.inverted){
      ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vy,b.vx));
      ctx.fillStyle='#ff81f1aa';ctx.beginPath();ctx.moveTo(-b.r,-3);ctx.lineTo(-b.r-14,0);ctx.lineTo(-b.r,3);ctx.fill();ctx.restore();
    }
    if(b.venom){ctx.strokeStyle='#83ff36';ctx.lineWidth=3;ctx.beginPath();ctx.arc(b.x,b.y,b.r+3,0,TAU);ctx.stroke();}
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
// Reuse the same glow for every projectile of a given size and palette.
const enemyShotSprites=new Map();
function renderEnemyShots(){
  const halfW=W/(2*viewZoom())+15,halfH=H/(2*viewZoom())+15;
  for(const shot of state.enemyBullets){
    if(Math.abs(shot.x-state.cam.x)>halfW+shot.r || Math.abs(shot.y-state.cam.y)>halfH+shot.r)continue;
    const color=shot.tint||'#ffd0a8';
    if(shot.streak)energyLine({x:shot.x-shot.vx*.049,y:shot.y-shot.vy*.049},shot,color+'8b',Math.max(2,shot.r*.8));
    if(shot.square){ctx.fillStyle=color;ctx.fillRect(shot.x-shot.r,shot.y-shot.r,2*shot.r,2*shot.r);}
    else{
    const key=color+'-'+shot.r;
    let sprite=enemyShotSprites.get(key);
    if(!sprite){
      sprite=document.createElement('canvas');
      const half=Math.ceil(shot.r)+12;
      sprite.width=sprite.height=half*2;
      const brush=sprite.getContext('2d');
      const glow=brush.createRadialGradient(half,half,shot.r*.85,half,half,half);
      glow.addColorStop(0,color+'96');glow.addColorStop(1,color+'00');
      brush.fillStyle=glow;brush.fillRect(0,0,sprite.width,sprite.height);
      brush.fillStyle=color;brush.beginPath();brush.arc(half,half,shot.r,0,TAU);brush.fill();
      brush.fillStyle='#fff8da';brush.beginPath();
      brush.arc(half-shot.r*.22,half-shot.r*.22,shot.r*.38,0,TAU);brush.fill();
      enemyShotSprites.set(key,sprite);
    }
    if(shot.planet)for(let i=5;i>0;i--){ctx.globalAlpha=(6-i)*.09;disk(shot.x-shot.vx*i*.019,shot.y-shot.vy*i*.019,shot.r*(1-i*.12),color);}
    ctx.globalAlpha=1;ctx.drawImage(sprite,shot.x-sprite.width/2,shot.y-sprite.height/2);}
    if(shot.cancelHP!==undefined){
      const wear=1-shot.cancelHP/(shot.r*shot.r);
      ctx.save();ctx.translate(shot.x,shot.y);ctx.rotate(shot.r);
      ctx.strokeStyle=state.time-shot.cancelHit<.12?'#fff':'#ffe4bd';ctx.lineWidth=1+wear;
      for(let i=0;i<Math.ceil(3*wear);i++){
        ctx.rotate(2.2);ctx.beginPath();ctx.moveTo(shot.r,0);
        ctx.lineTo(shot.r*.66,-2);ctx.lineTo(shot.r*(.55-.4*wear),1);ctx.stroke();
      }
      ctx.restore();
    }
  }
}
function renderEntities4(view=state,p=state.player) {
  // Drones
  if (!view.over) {
    for (const d of view.drones) {
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
function renderEntities5(view=state,p=state.player) {
  // Dardos jugador
  if (!view.over) {
    for (const d of view.darts) {
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
function renderEntities6(view=state,p=state.player) {
  // Escudos
  if (!view.over) {
    for (const sh of view.shields) {
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
function renderEntities7(view=state,p=state.player) {
  // LÁSER: CARGA
  if (view.laserCharging) {
    const t = view.laserChargeTime;
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
function renderEntities8(view=state,p=state.player) {
  // Rayos activos
  for (const lf of (playMode==='online' && view===state ? view.lasersFiring.concat(previewLasers) : view.lasersFiring)) {
    const origin=lf.origin||p;
    for (let k = 0; k < lf.count; k++) {
      const angle = p.angle + lf.sweep + (k / lf.count) * TAU;
      const range = 2000;
      const x2 = origin.x + Math.cos(angle) * range;
      const y2 = origin.y + Math.sin(angle) * range;
      const w = lf.width;
      ctx.save();
      ctx.shadowColor = '#ff3366'; ctx.shadowBlur = 60;
      ctx.strokeStyle = 'rgba(255,80,120,0.85)';
      ctx.lineWidth = w; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = Math.max(3, w * 0.35);
      ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,180,220,0.5)';
      ctx.lineWidth = Math.max(1, w * 0.15);
      ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.restore();
    }
  }


}

// Neon rails mark the full reach; pixels spiral inward as the core contracts.
function drawGravityField(f){
  const phase=clamp(1-f.time/1.4,0,1), spin=phase*(3+phase*3);
  ctx.save();ctx.translate(f.x,f.y);
  ctx.fillStyle='#29184365';
  ctx.beginPath();ctx.arc(0,0,f.r,0,TAU);ctx.fill();
  ctx.lineWidth=2;ctx.strokeStyle='#c381ff';ctx.shadowColor='#b44bff';ctx.shadowBlur=12;
  ctx.beginPath();
  for(let i=0;i<8;i++){
    const start=i*TAU/8+spin*.23;
    ctx.moveTo(Math.cos(start)*f.r,Math.sin(start)*f.r);ctx.arc(0,0,f.r,start,start+.44);
  }
  ctx.stroke();
  ctx.shadowBlur=0;
  for(let i=0;i<24;i++){
    const u=(i*.618+1-phase*2%1)%1;
    const angle=i*2.4+spin+u*1.7,r=10+u*(f.r-10);
    const x=Math.cos(angle)*r,y=Math.sin(angle)*r;
    const side=2+3*(1-u);
    ctx.fillStyle=i%3?'#cd8aff':'#6af6ff';
    ctx.fillRect(x-side/2,y-side/2,side,side);
  }
  ctx.rotate(spin);
  const core=10+6*Math.sin(phase*Math.PI)-4*phase;
  ctx.shadowColor='#e568ff';ctx.shadowBlur=18;
  ctx.strokeStyle='#ff92ec';ctx.lineWidth=3;
  ctx.strokeRect(-core-3,-core-3,2*core+6,2*core+6);
  ctx.rotate(-2*spin);ctx.fillStyle='#10091c';ctx.fillRect(-core,-core,2*core,2*core);
  ctx.strokeStyle='#e9ddff';ctx.strokeRect(-core,-core,2*core,2*core);
  ctx.restore();
}

function drawCombatPulses(body){
  const lost=body===state.player?1-state.halfHearts/state.maxHalfHearts:body.missingHealth;
  if(body.fury && lost>0 && !body.over && !(body===state.player && state.over)){
    ctx.save();ctx.translate(body.x,body.y);
    ctx.globalAlpha=.35+.65*lost;
    ctx.shadowColor='#ff433b';ctx.shadowBlur=9;ctx.strokeStyle='#ff975d';ctx.lineWidth=2;
    // Embers rise from the four edges, growing taller as health drops.
    for(let i=0;i<8;i++){
      const t=(state.time*(1+lost)+i*.37)%1;
      const x=(i%4-1.5)*9,y=-17-(i%2)*4-t*(6+18*lost);
      ctx.fillStyle=i%2?'#ff593d':'#ffc360';ctx.fillRect(x,y,3,5*(1-t)+1);
    }
    const r=18+2*Math.sin(state.time*7);
    ctx.beginPath();ctx.moveTo(-r,-8);ctx.lineTo(-r,r);ctx.lineTo(-7,r);
    ctx.moveTo(7,r);ctx.lineTo(r,r);ctx.lineTo(r,-8);ctx.stroke();ctx.restore();
  }
  for(const hit of body.pulses||[]){
    const t=(state.time-hit.born)/.55;
    if(t<0 || t>=1)continue;
    ctx.save();ctx.globalAlpha=Math.min(1,(1-t)*2);ctx.lineWidth=2.5;
    if(hit.kind==='armor'){
      ctx.translate(body.x,body.y);ctx.scale(1+.18*t,1+.18*t);
      ctx.strokeStyle='#a5dbff';ctx.fillStyle='#619aff30';ctx.shadowColor='#69adff';ctx.shadowBlur=13;
      ctx.beginPath();ctx.moveTo(0,-29);ctx.lineTo(24,-18);ctx.lineTo(21,8);
      ctx.lineTo(12,22);ctx.lineTo(0,29);ctx.lineTo(-12,22);ctx.lineTo(-21,8);
      ctx.lineTo(-24,-18);ctx.closePath();ctx.fill();ctx.stroke();
    } else if(hit.kind==='vampirism'){
      ctx.fillStyle='#ff719e';ctx.shadowColor='#ff387b';ctx.shadowBlur=11;
      for(let i=0;i<6;i++){
        const u=clamp(t*1.45-i*.07,0,1),wave=Math.sin(Math.PI*u)*(i-2.5)*6;
        const x=hit.x+(body.x-hit.x)*u,y=hit.y+(body.y-hit.y)*u+wave;
        ctx.fillRect(x-2,y-2,5,5);
      }
      if(t>.6){ctx.fillRect(body.x-8,body.y-26,16,4);ctx.fillRect(body.x-2,body.y-32,4,16);}
    } else {
      const ice=hit.kind==='frost',n=ice?6:4;
      ctx.translate(hit.x,hit.y);ctx.rotate(ice ? .2 : -.5);
      ctx.strokeStyle=ice?'#b1f7ff':'#ffdf57';ctx.fillStyle=ice?'#63ddff':'#fff5b3';
      ctx.shadowColor=ice?'#46caff':'#ff9a19';ctx.shadowBlur=8;
      for(let i=0;i<n;i++){
        ctx.rotate(TAU/n);
        const r=5+14*t,len=ice?9:15;
        ctx.beginPath();ctx.moveTo(r,0);ctx.lineTo(r+len,0);
        if(ice){ctx.moveTo(r+2,-4);ctx.lineTo(r+7,0);ctx.lineTo(r+2,4);}
        ctx.stroke();ctx.fillRect(r+len,-1,3,3);
      }
      if(!ice){ctx.rotate(.5);ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.fillText('×'+hit.power,0,-21-12*t);}
    }
    ctx.restore();
  }
}
