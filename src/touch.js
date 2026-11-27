'use strict';
let updateTouchUI=()=>{},hudLeft=8,hudTop=7;
function drawTouchHUD(){
  const boss=state.boss,w=165,h=boss?78:51;
  ctx.save();ctx.translate(hudLeft,hudTop);
  ctx.fillStyle='#0e101ef0';ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#344255';ctx.strokeRect(.5,.5,w-1,h-1);
  ctx.fillStyle='#58edda';ctx.fillRect(0,0,3,h);
  ctx.textAlign='left';ctx.textBaseline='top';ctx.font='bold 14px system-ui';
  ctx.fillStyle='#ff93af';ctx.fillText('♥ '+state.halfHearts/2+' / '+state.maxHalfHearts/2,9,5);
  if(state.blueHealth){ctx.fillStyle='#8ddfff';ctx.font='bold 11px system-ui';ctx.fillText('+'+state.blueHealth/2,72,7);}
  ctx.textAlign='right';ctx.fillStyle='#eafcff';ctx.font='bold 12px system-ui';ctx.fillText('Nv. '+state.level,w-9,7);
  ctx.fillStyle='#2b3745';ctx.fillRect(9,25,w-18,4);
  ctx.fillStyle='#68e8cc';ctx.fillRect(9,25,(w-18)*clamp(state.xp/state.xpNeeded,0,1),4);
  ctx.textAlign='left';ctx.font='11px system-ui';ctx.fillStyle='#bed0dd';ctx.fillText(state.kills+' bajas · '+state.score+' pts',9,33);
  if(state.extraBosses?.length)drawGroupBars(0,48,w);
  else if(boss){
    ctx.fillStyle=boss.color;ctx.fillText(BOSS_NAMES[boss.kind||'boss']+' · F'+boss.phase,9,51);
    ctx.fillStyle='#362c39';ctx.fillRect(9,68,w-18,4);ctx.fillStyle=boss.color;
    ctx.fillRect(9,68,(w-18)*clamp(boss.hp/boss.maxHp,0,1),4);
  }
  ctx.restore();
}
window.addEventListener('DOMContentLoaded',()=>{
  if(!mobileDevice)return;
  const el=id=>document.getElementById(id),ui=el('touchUI'),combat=el('touchCombat'),panel=el('touchPanel');
  document.body.classList.add('mobile');
  const full=el('fullPlay');full.hidden=false;
  let landscape=false,nativeFull=false;
  function fit(){
    rotatedPlay=landscape && window.innerHeight>window.innerWidth;
    document.body.classList.toggle('rotated',rotatedPlay);
    full.textContent=landscape?'Salir de pantalla completa':'Pantalla completa · Horizontal';
    const style=getComputedStyle(ui);
    hudLeft=parseFloat(style.paddingLeft)||8;hudTop=parseFloat(style.paddingTop)||7;
    resize();
  }
  full.onclick=async()=>{
    if(landscape){
      landscape=false;fit();el('fullStatus').textContent='';
      try{screen.orientation?.unlock?.();if(document.fullscreenElement)await document.exitFullscreen();}catch{}
      return;
    }
    landscape=true;fit();
    try{await document.documentElement.requestFullscreen();nativeFull=!!document.fullscreenElement;}catch{}
    try{await screen.orientation.lock('landscape');}catch{}
    fit();el('fullStatus').textContent=document.fullscreenElement?'':'Vista horizontal activa';
  };
  document.addEventListener('fullscreenchange',()=>{
    if(nativeFull && !document.fullscreenElement){landscape=false;nativeFull=false;el('fullStatus').textContent='';}
    fit();
  });
  window.addEventListener('resize',fit);fit();
  const active=new Map(),aim={x:1,y:0};
  let signature='',selected=null,oldMode='menu';
  function syncFire(){
    const down=[...active.values()].includes(el('aimStick'));
    if(down && !mouse.down && playMode==='online'){pendingTap=true;previewTap=true;}
    mouse.down=down;
  }
  function release(id){
    const entry=active.get(id);if(!entry)return;
    active.delete(id);entry.classList.remove('pressed');
    syncFire();
    entry.firstElementChild.style.transform='';
    if(entry.id==='moveStick')touchMove.x=touchMove.y=0;
    if(entry.hasPointerCapture(id))entry.releasePointerCapture(id);
  }
  function clear(){for(const id of [...active.keys()])release(id);}
  for(const id of ['moveStick','aimStick']){
    const node=el(id);
    function move(e){
      if(active.get(e.pointerId)!==node)return;
      const r=node.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;
      const limit=node.clientWidth*.34,d=Math.hypot(dx,dy),denom=Math.max(d,limit);
      const x=(rotatedPlay?dy:dx)/denom,y=(rotatedPlay?-dx:dy)/denom;
      node.firstElementChild.style.transform='translate('+x*limit+'px,'+y*limit+'px)';
      if(id==='moveStick'){touchMove.x=d<5?0:x;touchMove.y=d<5?0:y;}
      else if(d>=5){aim.x=x;aim.y=y;}
    }
    node.onpointerdown=e=>{
      if([...active.values()].includes(node))return;
      e.preventDefault();ensureAudio();node.setPointerCapture(e.pointerId);active.set(e.pointerId,node);node.classList.add('pressed');
      move(e);syncFire();
    };
    node.onpointermove=move;
    node.onpointerup=node.onpointercancel=node.onlostpointercapture=e=>release(e.pointerId);
  }
  window.addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
  function button(parent,text,action){
    const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=action;parent.append(b);return b;
  }
  function cardIcon(card){
    const icon=document.createElement('canvas');icon.width=icon.height=64;icon.setAttribute('aria-hidden','true');
    drawCardIcon(32,32,40,card,card.color,icon.getContext('2d'));return icon;
  }
  const slots=Array.from({length:5},(_,i)=>button(el('touchSlots'),String(i+1),()=>{
    ensureAudio();if(playMode==='online')sendGameAction({kind:'slot',i});else useSlot(i);
  }));
  function bag(){
    clear();selected=null;
    if(playMode==='online')sendGameAction({kind:'inventory'});
    else{state.inventoryOpen=!state.inventoryOpen;state.laserCharging=false;state.laserChargeTime=0;}
  }
  el('bag').onclick=bag;
  el('zoomIn').onclick=()=>adjustLens(1);
  el('zoomOut').onclick=()=>adjustLens(-1);
  for(const [id,tab] of [['enemyTool','enemies'],['cardTool','cards']]){
    el(id).onclick=()=>{clear();openSandboxPanel(tab);};
  }
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse' || playMode!=='sandbox' || sandboxTab || state.inventoryOpen || state.cardChoices || state.over)return;
    const r=canvas.getBoundingClientRect();
    mouse.x=rotatedPlay?e.clientY-r.top:e.clientX-r.left;
    mouse.y=rotatedPlay?r.right-e.clientX:e.clientY-r.top;
    placeSandboxEnemy();
  });
  function populate(view){
    panel.dataset.view=view;panel.replaceChildren();
    const title=document.createElement('h2');panel.append(title);
    if(view==='over'){
      title.textContent='Fin de la partida';button(panel,playMode==='online'?'Salir al menú':'Volver a jugar',()=>playMode==='online'?el('exit').click():restart());
    }else if(view==='reward'){
      title.textContent=state.bonusPicks?'Botín del jefe · '+state.bonusPicks+' por elegir':'Elige una mejora';
      for(const [i,c] of state.cardChoices.entries()){
        const b=button(panel,c.name,()=>playMode==='online'?sendGameAction({kind:'pick',i}):pickCard(c));
        const desc=document.createElement('small');desc.textContent=c.desc;b.append(desc);b.prepend(cardIcon(c));b.style.setProperty('--accent',c.color);
      }
    }else if(view==='inventory'){
      const head=document.createElement('div');head.className='invHead';panel.append(head);
      title.textContent='Inventario';head.append(title);button(head,'Cerrar',bag);
      const row=document.createElement('div');row.className='invSlots';panel.append(row);
      function note(node,text){const small=document.createElement('small');small.textContent=text;node.append(small);return small;}
      for(const [i,id] of state.slots.entries()){
        const c=SPECIAL_CARDS.find(c=>c.id===id);
        const b=button(row,String(i+1),()=>{
          if(selected===null)return;
          const card=selected||null;
          if(playMode==='online')sendGameAction({kind:'equip',i,card});else state.slots[i]=card;
        });
        b.setAttribute('aria-label','Ranura '+(i+1)+' · '+(c?.name||'Vacía'));
        if(c){b.append(cardIcon(c));note(b,'').dataset.charge=id;}else note(b,'Vacía');
      }
      const active=SPECIAL_CARDS.find(c=>c.id===selected);
      const detail=document.createElement('p');detail.className='invDetail';panel.append(detail);
      detail.textContent=active?active.name+' · '+active.desc:selected===''?'Toca la ranura que quieras vaciar.':'Selecciona una carta y toca la ranura donde quieras equiparla.';
      button(panel,'Vaciar una ranura',()=>{selected='';}).setAttribute('aria-pressed',String(selected===''));
      const grid=document.createElement('div');grid.className='invGrid';panel.append(grid);
      for(const c of SPECIAL_CARDS.filter(c=>state.specialCards[c.id]?.totalCards)){
        const b=button(grid,c.name,()=>{selected=c.id;});
        b.prepend(cardIcon(c));b.style.setProperty('--accent',c.color);b.setAttribute('aria-pressed',String(selected===c.id));
        const equipped=state.slots.flatMap((id,i)=>id===c.id?[i+1]:[]);
        note(b,'×'+state.specialCards[c.id].totalCards+(state.specialCards[c.id].totalCards===1?' copia':' copias')+(equipped.length?' · Ranura '+equipped.join(', '):''));
        note(b,'').dataset.charge=c.id;note(b,c.desc);
      }
      if(!grid.childElementCount)note(grid,'Aún no tienes cartas especiales.');
    }
  }
  updateTouchUI=()=>{
    const playing=playMode!=='menu';ui.hidden=!playing;
    if(oldMode!==playMode){clear();signature='';selected=null;oldMode=playMode;}
    if(!playing)return;
    if((state.extra && state.over)||(state.rush && (state.over || state.rush.bot))){
      clear();combat.hidden=el('touchTools').hidden=panel.hidden=true;
      el('zoomControls').hidden=state.over;return;
    }
    const view=state.over?'over':state.cardChoices?'reward':state.inventoryOpen?'inventory':sandboxTab?'sandbox':'play';
    el('zoomControls').hidden=view!=='play';
    combat.hidden=el('touchTools').hidden=view!=='play';
    panel.hidden=['play','sandbox'].includes(view);
    if(view!=='play'){clear();}else{
      el('enemyTool').hidden=el('cardTool').hidden=playMode!=='sandbox';
      const distance=Math.min(W*.42,H*.42)/state.cam.zoom,zoom=viewZoom();
      mouse.x=W/2+(state.player.x-state.cam.x+aim.x*distance)*zoom;
      mouse.y=H/2+(state.player.y-state.cam.y+aim.y*distance)*zoom;
      for(const [i,b] of slots.entries()){
        const card=SPECIAL_CARDS.find(c=>c.id===state.slots[i]),sc=card&&state.specialCards[card.id];
        const label=(i+1)+(sc?' · '+(sc.charges||Math.ceil(sc.cooldown)+'s'):'');
        if(b.dataset.card!==(card?.id||'') || b.dataset.label!==label){
          b.dataset.card=card?.id||'';b.dataset.label=label;b.textContent=label;
          if(card)b.prepend(cardIcon(card));
        }
        b.disabled=!sc?.charges;b.style.color=card?.color||'';b.setAttribute('aria-label',card?.name||'Ranura '+(i+1));
      }
    }
    const key=view==='inventory'?[view,...state.slots,selected??'-'].join('|'):view==='reward'?view+state.level+'-'+state.bonusPicks+'-'+state.pendingLevelUps+state.cardChoices.map(c=>c.id).join():view;
    if(key!==signature){
      const scroll=signature.startsWith('inventory')?panel.scrollTop:0;
      populate(view);signature=key;panel.scrollTop=scroll;
    }
    if(view==='inventory')for(const node of panel.querySelectorAll('[data-charge]')){
      const sc=state.specialCards[node.dataset.charge];
      const label=sc.charges?'Cargas '+sc.charges+'/'+sc.maxCharges:Math.ceil(sc.cooldown)+' s';
      if(node.textContent!==label)node.textContent=label;
    }
  };
});
