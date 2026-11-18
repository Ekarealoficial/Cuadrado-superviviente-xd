'use strict';
let sandboxEnemy='normal', sandboxTab=null;
function sandboxHint(){
  document.getElementById('playerInfo').textContent=(mobileDevice?'Toca el mapa · ':'U · Enemigos   I · Cartas   |   Clic derecho · ')+ENEMY_NAMES[sandboxEnemy];
}
function closeSandboxPanel(){
  document.getElementById('sandboxPanel').close();
  sandboxTab=null;
}
function openSandboxPanel(tab){
  const dialog=document.getElementById('sandboxPanel');
  const list=document.getElementById('sandboxList'),status=document.getElementById('sandboxStatus');
  sandboxTab=tab;
  mouse.down=false;
  for(const key in keys)keys[key]=false;
  document.getElementById('sandboxTitle').textContent=tab==='enemies'?'Invocar enemigo':'Obtener cartas';
  status.textContent=tab==='enemies'?(mobileDevice?'Selecciona un enemigo y toca el mapa.':'Selecciona un enemigo y colócalo con clic derecho.'):'Selecciona una carta para obtener una copia.';
  list.replaceChildren();
  function button(label,color,action){
    const b=document.createElement('button');
    b.type='button';b.textContent=label;b.style.borderLeftColor=color;b.onclick=action;
    list.append(b);return b;
  }
  if(tab==='enemies'){
    for(const id of [...Object.keys(ENEMY_TYPES),...Object.keys(BOSS_NAMES)]){
      button(ENEMY_NAMES[id],ENEMY_TYPES[id]?.color||'#ff2255',()=>{
        sandboxEnemy=id;sandboxHint();closeSandboxPanel();
      }).setAttribute('aria-pressed',String(sandboxEnemy===id));
    }
  }else{
    button('Quitar todas mis cartas','#ff7799',()=>{
      clearSandboxCards();openSandboxPanel('cards');status.textContent='Cartas y efectos retirados.';
    });
    for(const [title,cards] of [['Normales',CARD_TYPES],['Especiales',SPECIAL_CARDS]]){
      const h=document.createElement('h3');h.textContent=title;list.append(h);
      for(const card of cards){
        const b=button(card.name,card.color,()=>{
          applyCard(card);Sfx.play('pick');
          const n=Number(b.dataset.count||0)+1;b.dataset.count=n;
          status.textContent=card.name+' · +'+n+(n===1?' copia':' copias')+' en esta selección';
        });
        b.title=card.desc;
      }
    }
  }
  if(!dialog.open){if(rotatedPlay)dialog.show();else dialog.showModal();}
  list.scrollTop=0;
}
function handleSandboxKey(e,k){
  if(sandboxTab && k==='escape'){e.preventDefault();closeSandboxPanel();return true;}
  if((k==='u'||k==='i') && !state.over && !state.cardChoices && !state.inventoryOpen){
    e.preventDefault();
    const tab=k==='u'?'enemies':'cards';
    if(!e.repeat){if(tab===sandboxTab)closeSandboxPanel();else openSandboxPanel(tab);}
    return true;
  }
  return !!sandboxTab;
}
function placeSandboxEnemy(){
  if(state.over || state.cardChoices || state.inventoryOpen || sandboxTab)return;
  const pos=getWorldMouse();
  if(Object.hasOwn(BOSS_NAMES,sandboxEnemy)){
    spawnBoss(pos,sandboxEnemy);
  }else state.enemies.push(createEnemy(sandboxEnemy,pos.x,pos.y));
}

function clearSandboxCards(){
  const base=newState(),p=state.player;
  for(const key of ['drones','darts','shields','bullets','magnetRange','maxHalfHearts',
      'laserCharging','laserChargeTime','lasersFiring','lightningStrikes','specialCards',
      'slots','inventorySelection','stopStarted','stopUntil','blueHealth','thunderRain']){
    state[key]=base[key];
  }
  state.halfHearts=Math.min(state.halfHearts,state.maxHalfHearts);
  state.player={...base.player,x:p.x,y:p.y,angle:p.angle,color:p.color,iceUntil:p.iceUntil};
  for(const e of state.enemies.concat(bossTargets())){
    delete e.venomTime;delete e.venomDps;delete e.slow;delete e.slowUntil;delete e.plasmaHit;
  }
}
