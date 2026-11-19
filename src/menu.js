'use strict';
const ENEMY_NAMES={tackler:'Tacleador',splitter:'Divisor',cannon:'Cañón',frostMage:'Hechicero helado',normal:'Normal',fast:'Veloz',tank:'Tanque',shooter:'Tirador',invoker:'Invocador',teleporter:'Teletransportador',kamikaze:'Kamikaze',dardante:'Dardante',juggernaut:'Juggernaut',...BOSS_NAMES};
let netSession=null, queuedActions=[], inventoryChoice=null;
const multiplayerServer = String(window.MULTIPLAYER_SERVER_URL || '').replace(/\/$/, '');
function handleNetKey(e){
  const k=e.key.toLowerCase();
  if(k==='e'||(k==='escape'&&state.inventoryOpen)){ if(!e.repeat)queuedActions.push({kind:'inventory'}); }
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

  el('menu').addEventListener('click',ensureAudio,{once:true});
  let screen='home',creating=false,code='',listed=[], multiplayerSettings;
  function show(next){
    screen=next;
    for(const id of screens)el(id).hidden=id!==next;
    el('notice').textContent='';
  }
  function start(mode){
    playMode=mode;el('sandboxDebug').hidden=true;el('labTool').hidden=mode!=='sandbox';el('menu').hidden=true;el('sessionHUD').hidden=false;
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
  for(const [id,name] of Object.entries(ENEMY_NAMES)){
    const label=document.createElement('label'),box=document.createElement('input');
    box.type='checkbox';box.checked=true;box.value=id;label.append(box,name);el('roster').append(label);
  }
  function configure(multi){
    creating=multi;el('roomOptions').hidden=!multi;el('soloColor').hidden=multi;
    el('setupTitle').textContent=multi?'Crear partida':'Singleplayer';show('setup');
  }
  el('sandbox').onclick=()=>{
    rules={difficulty:1,xp:1,disabled:[],color:'#4df3ff'};
    restart();Object.assign(lab,{god:false,speed:1,debug:false,bossId:0});lab.group.clear();sandboxEnemy='normal';start('sandbox');sandboxHint();
  };
  el('labTool').onclick=()=>openSandboxPanel('lab');
  el('sandboxClose').onclick=closeSandboxPanel;
  el('sandboxPanel').addEventListener('close',()=>{if(!el('sandboxPanel').open)sandboxTab=null;});
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
      resetPresentation();
      rules={...r.settings,color:profile.color};state=r.state;netSession={code:r.code,token:r.token};start('online');
      const session=netSession;
      let socket=null,live=false,lastFrameSent=0,seen=0,nextPing=0,nextAttempt=0,lastStateAt=0;
      let fallbackBusy=0,lastFallback=-Infinity;
      function accept(next){
        if(session!==netSession || next.time<state.time || (next.ack??0)<(state.ack??0))return;
        const now=performance.now();
        lastStateAt=now;
        prepareMotion(state,next,now);
        state=next;state.inventorySelection=inventoryChoice;
        currentWalls=state.arena?state.arena.walls:getVisibleChunks(state.cam);
        const ping=netPingMs==null?'…':Math.round(netPingMs)+' ms';
        el('playerInfo').textContent=profile.name+' · X '+Math.round(state.player.x)+'  Y '+Math.round(state.player.y)+' · Código '+session.code+' · Ping '+ping;
      }
      function connect(now){
        nextAttempt=now+5000;
        const url=new URL('/api/live',multiplayerServer || location.origin);
        url.protocol=url.protocol==='https:'?'wss:':'ws:';
        const ws=new WebSocket(url);
        socket=ws;
        ws.onopen=()=>{if(session===netSession)ws.send(JSON.stringify(session));else ws.close();};
        ws.onmessage=e=>{
          if(session!==netSession || socket!==ws)return;
          const msg=JSON.parse(e.data);
          if(msg.type==='ready'){
            live=true;seen=0;lastFrameSent=state.ack||0;nextPing=0;lastStateAt=performance.now();
          }else if(msg.type==='state'){seen=msg.serial;accept(msg.state);}
          else if(msg.type==='pong')netPingMs=performance.now()-msg.stamp;
        };
        ws.onclose=()=>{if(socket===ws){socket=null;live=false;if(session===netSession)netPingMs=null;}};
      }
      function controls(frames,now){
        const p=state.player;
        const target=getWorldMouse();
        return {frames,width:W,height:H,stamp:now,angle:p.angle,reach:Math.hypot(target.x-p.x,target.y-p.y),dx:(mouse.x-W/2)/state.cam.zoom,
          dy:(mouse.y-H/2)/state.cam.zoom,fire:mouse.down,
          w:!!(keys.w||keys.arrowup),a:!!(keys.a||keys.arrowleft),
          s:!!(keys.s||keys.arrowdown),d:!!(keys.d||keys.arrowright)};
      }
      async function sync(){
        if(session!==netSession){socket?.close();return;}
        const now=performance.now();
        if(!socket && now>=nextAttempt)connect(now);
        if(live){
          if(now-lastStateAt>3000)socket.close();
          else if(socket.readyState===WebSocket.OPEN && socket.bufferedAmount<8192){
            // Ordered delivery lets us send new frames immediately, without waiting for the next ACK.
            const frames=inputHistory.filter(c=>c[0]>lastFrameSent).slice(-48);
            if(frames.length || queuedActions.length || seen){
              socket.send(JSON.stringify({type:'input',seen,input:controls(frames,now),actions:queuedActions.splice(0)}));
              if(frames.length)lastFrameSent=frames.at(-1)[0];
              seen=0;
            }
            if(now>=nextPing){
              socket.send(JSON.stringify({type:'ping',stamp:now}));
              nextPing=now+1000;
            }
          }
        }else if(fallbackBusy<3 && now-lastFallback>=60){
          lastFallback=now;fallbackBusy++;
          roomRequest('step',{...session,input:controls(inputHistory.slice(-48),now),actions:queuedActions.splice(0)})
            .then(next=>{if(!live && session===netSession){netPingMs=performance.now()-now;accept(next);}})
            .catch(err=>{if(!live && session===netSession)end(err.message);})
            .finally(()=>{fallbackBusy--;});
        }
        setTimeout(sync,20);
      }
      sync();
    }catch(err){el('notice').textContent=err.message;}
    finally{buttons.forEach(b=>b.disabled=false);}
  };
}
window.addEventListener('DOMContentLoaded',initializeMenu);
