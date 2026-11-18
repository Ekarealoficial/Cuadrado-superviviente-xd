'use strict';
let updateTouchUI=()=>{};
function drawTouchHUD(){
  ctx.save();ctx.textAlign='left';ctx.textBaseline='top';ctx.font='bold 13px system-ui';
  ctx.fillStyle='#080b16cb';ctx.fillRect(8,7,164,state.boss?58:41);
  ctx.fillStyle='#ff7498';ctx.fillText('♥ '+state.halfHearts/2+'/'+state.maxHalfHearts/2,14,11);
  ctx.fillStyle='#8ddfff';if(state.blueHealth)ctx.fillText('+'+state.blueHealth/2,76,11);
  ctx.fillStyle='#eafcff';ctx.fillText('Nv. '+state.level,119,11);
  ctx.fillStyle='#304337';ctx.fillRect(14,30,152,5);
  ctx.fillStyle='#83ffa7';ctx.fillRect(14,30,152*clamp(state.xp/state.xpNeeded,0,1),5);
  ctx.font='10px system-ui';ctx.fillStyle='#ceddeb';ctx.fillText(state.kills+' bajas · '+state.score+' puntos',14,36);
  if(state.boss){ctx.fillStyle='#64273e';ctx.fillRect(14,53,152,6);ctx.fillStyle='#ff4771';ctx.fillRect(14,53,152*state.boss.hp/state.boss.maxHp,6);}
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
  window.addEventListener('resize',fit);
  const active=new Map(),aim={x:1,y:0};
  let signature='',selected=null,oldMode='menu';
  function release(id){
    const entry=active.get(id);if(!entry)return;
    active.delete(id);entry.classList.remove('pressed');
    if(entry===el('touchFire'))mouse.down=false;
    else{
      entry.firstElementChild.style.transform='';
      if(entry.id==='moveStick')touchMove.x=touchMove.y=0;
    }
    if(entry.hasPointerCapture(id))entry.releasePointerCapture(id);
  }
  function clear(){for(const id of [...active.keys()])release(id);}
  for(const id of ['moveStick','aimStick','touchFire']){
    const node=el(id);
    function move(e){
      if(active.get(e.pointerId)!==node || id==='touchFire')return;
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
      if(id==='touchFire'){mouse.down=true;if(playMode==='online'){pendingTap=true;previewTap=true;}}
      else move(e);
    };
    node.onpointermove=move;
    node.onpointerup=node.onpointercancel=node.onlostpointercapture=e=>release(e.pointerId);
  }
  window.addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
  function button(parent,text,action){
    const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=action;parent.append(b);return b;
  }
  const slots=Array.from({length:5},(_,i)=>button(el('touchSlots'),String(i+1),()=>{
    ensureAudio();if(playMode==='online')queuedActions.push({kind:'slot',i});else useSlot(i);
  }));
  function bag(){
    clear();selected=null;
    if(playMode==='online')queuedActions.push({kind:'inventory'});
    else{state.inventoryOpen=!state.inventoryOpen;state.laserCharging=false;state.laserChargeTime=0;}
  }
  el('bag').onclick=bag;
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
    panel.replaceChildren();
    const title=document.createElement('h2');panel.append(title);
    if(view==='over'){
      title.textContent='Fin de la partida';button(panel,playMode==='online'?'Salir al menú':'Volver a jugar',()=>playMode==='online'?el('exit').click():restart());
    }else if(view==='reward'){
      title.textContent='Elige una mejora';
      for(const [i,c] of state.cardChoices.entries()){
        const b=button(panel,c.name,()=>playMode==='online'?queuedActions.push({kind:'pick',i}):pickCard(c));
        const desc=document.createElement('small');desc.textContent=c.desc;b.append(desc);b.style.borderLeftColor=c.color;
      }
    }else if(view==='inventory'){
      title.textContent='Inventario';button(panel,'Cerrar',bag);
      const h=document.createElement('p');h.textContent='Selecciona una carta y toca una ranura para equiparla.';panel.append(h);
      const row=document.createElement('div');row.className='equipRow';panel.append(row);
      for(const [i,id] of state.slots.entries()){
        button(row,(i+1)+' · '+(SPECIAL_CARDS.find(c=>c.id===id)?.name||'Vacía'),()=>{
          if(selected===null)return;
          const card=selected||null;
          if(playMode==='online')queuedActions.push({kind:'equip',i,card});else state.slots[i]=card;
        });
      }
      for(const c of SPECIAL_CARDS.filter(c=>state.specialCards[c.id]?.totalCards)){
        const b=button(panel,c.name+' ×'+state.specialCards[c.id].totalCards,()=>{selected=c.id;});
        b.setAttribute('aria-pressed',String(selected===c.id));b.style.borderLeftColor=c.color;
      }
      button(panel,'Quitar de una ranura',()=>{selected='';}).setAttribute('aria-pressed',String(selected===''));
    }
  }
  updateTouchUI=()=>{
    const playing=playMode!=='menu';ui.hidden=!playing;
    if(oldMode!==playMode){clear();signature='';selected=null;oldMode=playMode;}
    if(!playing)return;
    const view=state.over?'over':state.cardChoices?'reward':state.inventoryOpen?'inventory':sandboxTab?'sandbox':'play';
    combat.hidden=el('touchTools').hidden=view!=='play';
    panel.hidden=['play','sandbox'].includes(view);
    if(view!=='play'){clear();}else{
      el('enemyTool').hidden=el('cardTool').hidden=playMode!=='sandbox';
      const distance=Math.min(W*.42,H*.42);
      mouse.x=W/2+(state.player.x-state.cam.x)*state.cam.zoom+aim.x*distance;
      mouse.y=H/2+(state.player.y-state.cam.y)*state.cam.zoom+aim.y*distance;
      for(const [i,b] of slots.entries()){
        const card=SPECIAL_CARDS.find(c=>c.id===state.slots[i]),sc=card&&state.specialCards[card.id];
        const label=(i+1)+(sc?' · '+(sc.charges||Math.ceil(sc.cooldown)+'s'):'');
        if(b.textContent!==label)b.textContent=label;
        b.disabled=!sc?.charges;b.style.color=card?.color||'';b.setAttribute('aria-label',card?.name||'Ranura '+(i+1));
      }
    }
    const key=view==='inventory'?[view,...state.slots,selected??'-'].join('|'):view==='reward'?view+state.level+state.pendingLevelUps+state.cardChoices.map(c=>c.id).join():view;
    if(key!==signature){populate(view);signature=key;}
  };
});
