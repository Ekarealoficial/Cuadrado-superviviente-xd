'use strict';
let netSession=null, queuedActions=[], inventoryChoice=null;
const multiplayerServer = String(window.MULTIPLAYER_SERVER_URL || '').replace(/\/$/, '');
function handleNetKey(e){
  const k=e.key.toLowerCase();
  if(k==='e'||(k==='escape'&&state.inventoryOpen)) queuedActions.push({kind:'inventory'});
  else if(/^[1-5]$/.test(k)) queuedActions.push({kind:state.cardChoices?'pick':'slot',i:Number(k)-1});
  else if(k!=='r')return false;
  e.preventDefault();return true;
}
function handleNetClick(e){
  updateUILayout();
  const hit=r=>mouse.x>=r.x&&mouse.x<=r.x+r.w&&mouse.y>=r.y&&mouse.y<=r.y+r.h;
  if(state.over)return true;
  if(state.cardChoices){
    const i=state.cardRects.findIndex(hit);
    if(i>=0)queuedActions.push({kind:'pick',i});
    return true;
  }
  if(state.inventoryOpen){
    const card=state.inventoryCardRects.find(hit);
    if(card)inventoryChoice=card.id;
    const i=state.inventorySlotRects.findIndex(hit);
    if(i>=0&&(inventoryChoice||e.button===2))queuedActions.push({kind:'equip',i,card:e.button===2?null:inventoryChoice});
    return true;
  }
  return false;
}
async function roomRequest(action,data){
  let response;
  try {response=await fetch(multiplayerServer+'/api/'+action,data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{cache:'no-store'});}
  catch {throw Error('No se pudo conectar con el servidor de salas.');}
  if(!response.headers.get('content-type')?.includes('application/json'))throw Error('El multijugador requiere abrir el juego desde su servidor Node.');
  const result=await response.json();
  if(!response.ok)throw Error(result.error);
  return result;
}
function initializeMenu(){
  const el=id=>document.getElementById(id);
  const setup=el('setup'), identity=el('identity'), screens=['home','setup','lobby','identity'];
  const names={normal:'Normal',fast:'Veloz',tank:'Tanque',shooter:'Tirador',invoker:'Invocador',teleporter:'Teletransportador',kamikaze:'Kamikaze',dardante:'Dardante',juggernaut:'Juggernaut',boss:'Jefe de la arena'};
  let screen='home',creating=false,code='',listed=[], multiplayerSettings;
  function show(next){
    screen=next;
    for(const id of screens)el(id).hidden=id!==next;
    el('notice').textContent='';
  }
  function start(mode){
    playMode=mode;el('menu').hidden=true;el('sessionHUD').hidden=false;
    mouse.down=false;for(const k in keys)keys[k]=false;
  }
  function end(message=''){
    netSession=null;queuedActions=[];inventoryChoice=null;playMode='menu';restart();el('playerInfo').textContent='';
    el('menu').hidden=false;el('sessionHUD').hidden=true;show('home');el('notice').textContent=message;
  }
  el('exit').onclick=()=>{
    if(netSession)roomRequest('leave',netSession).catch(()=>{});end();
  };
  for(const key of ['difficulty','xp'])for(const rate of [0.5,1,1.5,2,3]){
    const option=new Option(rate+'×',rate,false,rate===1);setup.elements[key].add(option);
  }
  for(const [id,name] of Object.entries(names)){
    const label=document.createElement('label'),box=document.createElement('input');
    box.type='checkbox';box.checked=true;box.value=id;label.append(box,name);el('roster').append(label);
  }
  function configure(multi){
    creating=multi;el('roomOptions').hidden=!multi;el('soloColor').hidden=multi;
    el('setupTitle').textContent=multi?'Crear partida':'Singleplayer';show('setup');
  }
  el('solo').onclick=()=>configure(false);el('create').onclick=()=>configure(true);
  setup.onsubmit=e=>{
    e.preventDefault();const f=setup.elements;
    const chosen={difficulty:Number(f.difficulty.value),xp:Number(f.xp.value),disabled:[...el('roster').querySelectorAll('input:not(:checked)')].map(n=>n.value)};
    if(!creating){rules={...chosen,color:f.color.value};restart();start('solo');return;}
    if(!f.roomName.value.trim()){el('notice').textContent='Escribe un nombre para la partida.';return;}
    multiplayerSettings={...chosen,name:f.roomName.value,max:Number(f.max.value),private:f.privateRoom.checked,pvp:f.pvp.checked};show('identity');
  };
  function join(selected){creating=false;code=selected;show('identity');}
  function displayRooms(){
    const list=el('rooms');list.replaceChildren();
    for(const room of listed.filter(r=>r.name.toLowerCase().includes(el('search').value.trim().toLowerCase()))){
      const button=document.createElement('button'),meta=document.createElement('small');
      const seconds=Math.max(0,Math.floor((Date.now()-room.opened)/1000));
      meta.textContent=room.count+'/'+room.max+' jugadores · Dificultad '+room.difficulty+'× · XP '+room.xp+'× · PvP '+(room.pvp?'ON':'OFF')+' · Abierta '+Math.floor(seconds/60)+'m '+seconds%60+'s';
      button.append(room.name,meta);button.disabled=room.count>=room.max;button.onclick=()=>join(room.code);list.append(button);
    }
    if(!list.children.length)list.textContent='Sin partidas públicas que coincidan.';
  }
  async function refresh(){
    if(screen!=='lobby'||playMode!=='menu')return;
    try{listed=await roomRequest('rooms');if(screen==='lobby'){displayRooms();el('notice').textContent='';}}
    catch(e){if(screen==='lobby')el('notice').textContent=e.message;}
  }
  const lobby=()=>{show('lobby');refresh();};
  el('multi').onclick=lobby;el('search').oninput=displayRooms;setInterval(refresh,3000);
  el('byCode').onsubmit=e=>{e.preventDefault();join(e.target.elements.code.value.trim().toUpperCase());};
  for(const b of document.querySelectorAll('[data-back]'))b.onclick=()=>{
    if(screen==='identity'&&creating)configure(true);
    else if(screen==='identity'||screen==='setup'&&creating)lobby();else show('home');
  };
  identity.onsubmit=async e=>{
    e.preventDefault();const buttons=identity.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);
    const profile={name:identity.elements.nick.value.trim(),color:identity.elements.color.value};
    try{
      const r=await roomRequest(creating?'create':'join',{code,settings:multiplayerSettings,profile});
      rules={...r.settings,color:profile.color};state=r.state;netSession={code:r.code,token:r.token};start('online');
      function accept(next,session){
        state=next;state.inventorySelection=inventoryChoice;
        currentWalls=getVisibleChunks(state.cam).concat(state.arena?.walls||[]);
        el('playerInfo').textContent=profile.name+' · X '+Math.round(state.player.x)+'  Y '+Math.round(state.player.y)+' · Código '+session.code;
      }
      let streaming=false;
      async function receive(session){
        try{
          const response=await fetch(multiplayerServer+'/api/stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(session)});
          if(!response.ok||!response.body)return;
          const reader=response.body.pipeThrough(new TextDecoderStream()).getReader();
          let pending='';
          while(session===netSession){
            const part=await reader.read();if(part.done || session!==netSession)break;
            pending+=part.value;
            const lines=pending.split('\n');pending=lines.pop();
            if(lines.length){streaming=true;accept(JSON.parse(lines[lines.length-1]),session);}
          }
          await reader.cancel();
        }catch{}finally{streaming=false;}
      }
      receive(netSession);
      let previousInput='',lastInputAt=0;
      async function sync(session){
        if(session!==netSession)return;
        const sent=performance.now();
        const input={dx:(mouse.x-W/2)/state.cam.zoom,dy:(mouse.y-H/2)/state.cam.zoom,fire:mouse.down};
        for(const [k,arrow] of Object.entries({w:'arrowup',a:'arrowleft',s:'arrowdown',d:'arrowright'}))input[k]=Boolean(keys[k]||keys[arrow]);
        try{
          const currentInput=JSON.stringify(input);
          if(streaming && !queuedActions.length && currentInput===previousInput && sent-lastInputAt<1000){
            setTimeout(()=>sync(session),16);return;
          }
          previousInput=currentInput;lastInputAt=sent;
          const next=await roomRequest(streaming?'input':'step',{...session,input,actions:queuedActions.splice(0)});
          if(session!==netSession)return;
          if(!streaming && next.player)accept(next,session);
          setTimeout(()=>sync(session),Math.max(0,33-(performance.now()-sent)));
        }catch(err){if(session===netSession)end(err.message);}
      }
      sync(netSession);
    }catch(err){el('notice').textContent=err.message;}
    finally{buttons.forEach(b=>b.disabled=false);}
  };
}
window.addEventListener('DOMContentLoaded',initializeMenu);
