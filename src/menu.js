'use strict';
const ENEMY_NAMES={pulseRing:'Anillo pulsante',erratic:'Cuadrado errático',twinCannon:'Cañón gemelo',rebound:'Círculo rebotador',tackler:'Tacleador',splitter:'Divisor',cannon:'Cañón',frostMage:'Hechicero helado',normal:'Normal',fast:'Veloz',tank:'Tanque',shooter:'Tirador',invoker:'Invocador',teleporter:'Teletransportador',kamikaze:'Kamikaze',dardante:'Dardante',juggernaut:'Juggernaut',...BOSS_NAMES};
let netSession=null, queuedActions=[], inventoryChoice=null;
let actionSeq=0;
function sendGameAction(action){if(state.waiting)return;queuedActions.push({...action,id:++actionSeq,offer:action.kind==='pick'?state.offerId:undefined});}
const multiplayerServer = String(window.MULTIPLAYER_SERVER_URL || '').replace(/\/$/, '');
function handleNetKey(e){
  const k=e.key.toLowerCase();
  if(k==='e'||(k==='escape'&&state.inventoryOpen)){ if(!e.repeat)sendGameAction({kind:'inventory'}); }
  else if(/^[1-5]$/.test(k)){if(!e.repeat)sendGameAction({kind:state.cardChoices?'pick':'slot',i:Number(k)-1});}
  else if(k!=='r')return false;
  e.preventDefault();return true;
}
function handleNetClick(e){
  updateUILayout();
  const hit=r=>mouse.x>=r.x&&mouse.x<=r.x+r.w&&mouse.y>=r.y&&mouse.y<=r.y+r.h;
  if(state.over)return true;
  if(state.cardChoices){
    const i=state.cardRects.findIndex(hit);
    if(i>=0)sendGameAction({kind:'pick',i});
    return true;
  }
  if(state.inventoryOpen){
    const card=state.inventoryCardRects.find(hit);
    if(card)inventoryChoice=card.id;
    const i=state.inventorySlotRects.findIndex(hit);
    if(i>=0&&(inventoryChoice||e.button===2))sendGameAction({kind:'equip',i,card:e.button===2?null:inventoryChoice});
    return true;
  }
  return false;
}
async function roomRequest(action,data){
  let response;
  try {response=await fetch(multiplayerServer+'/api/'+action,data?{method:'POST',signal:AbortSignal.timeout(action==='step'?5500:60000),headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{cache:'no-store',signal:AbortSignal.timeout(6000)});}
  catch {throw Error('No se pudo conectar con el servidor de salas.');}
  if(!response.headers.get('content-type')?.includes('application/json'))throw Error(response.status>=500?'El servidor está iniciándose o temporalmente fuera de servicio.':'Respuesta inesperada del servidor de salas.');
  const result=await response.json();
  if(!response.ok)throw Object.assign(Error(result.error),{status:response.status});
  return result;
}
let syncLocalUI=()=>{};
function initializeMenu(){
  const el=id=>document.getElementById(id);
  const setup=el('setup'), identity=el('identity'), screens=['home','setup','lobby','identity','extras','rushSetup','rushResults','extraResults','extraSetup'];

  el('menu').addEventListener('click',ensureAudio,{once:true});
  let screen='home',creating=false,code='',listed=[], multiplayerSettings;
  function show(next){
    screen=next;
    for(const id of screens)el(id).hidden=id!==next;
    el('notice').textContent='';
  }
  function start(mode){
    playMode=mode;startActivity();if(mode==='online'){activity.time=state.time;activity.defeats=state.totalDefeats||0;}el('rushHUD').classList.toggle('trialHUD',mode==='trial');el('rushHUD').classList.remove('lastMinute');el('sandboxDebug').hidden=true;el('labTool').hidden=mode!=='sandbox';el('menu').hidden=true;el('sessionHUD').hidden=false;
    mouse.down=false;for(const k in keys)keys[k]=false;
  }
  function end(message='',destination='home'){
    checkpointActivity(true);activity=null;
    if(sandboxTab)closeSandboxPanel();
    el('rushHUD').hidden=el('rushBanner').hidden=true;
    el('roomWait').hidden=true;netSession=null;queuedActions=[];inventoryChoice=null;playMode='menu';restart();el('playerInfo').textContent='';
    el('menu').hidden=false;el('sessionHUD').hidden=true;show(destination);el('notice').textContent=message;
  }
  el('exit').onclick=()=>{
    if(netSession)roomRequest('leave',netSession).catch(()=>{});end('',state.rush||state.extra||playMode==='sandbox'?'extras':'home');
  };
  for(const key of ['difficulty','xp'])for(const rate of [0.5,1,1.5,2,3]){
    const option=new Option(rate+'×',rate,rate===1,rate===1);setup.elements[key].add(option);
  }
  for(const [id,name] of Object.entries(ENEMY_NAMES)){
    const label=document.createElement('label'),box=document.createElement('input');
    box.type='checkbox';box.checked=true;box.value=id;label.append(box,name);el(BOSS_NAMES[id]?'setupBosses':'roster').append(label);
  }
  const options=createLaunchOptions(el);
  function configure(multi){
    options.open(multi?'online':'solo',setup);
    creating=multi;el('roomOptions').hidden=!multi;el('soloColor').hidden=multi;
    el('setupTitle').textContent=multi?'Crear partida':'Singleplayer';show('setup');
  }
  el('extrasButton').onclick=()=>show('extras');
  el('rushButton').onclick=()=>{options.open('rush',el('rushSetup'));show('rushSetup');};
  for(const [id,name] of Object.entries(BOSS_NAMES)){
    const label=document.createElement('label'),box=document.createElement('input');
    box.type='checkbox';box.checked=true;box.value=id;label.append(box,name);el('rushRoster').append(label);
  }
  function startRush(){
    const disabled=[...el('rushRoster').querySelectorAll('input:not(:checked)')].map(n=>n.value);
    if(disabled.length===Object.keys(BOSS_NAMES).length){el('notice').textContent='Habilita al menos un jefe para comenzar.';return;}
    rules={difficulty:1,xp:1,color:setup.elements.color.value,disabled,...options.read('rush')};
    screen='playing';start('rush');beginRush(el('botPlay').checked);
  }
  el('rushSetup').onsubmit=e=>{e.preventDefault();startRush();};
  el('retryRush').onclick=startRush;el('leaveRush').onclick=()=>end('','extras');
  syncRushUI=()=>{
    const rush=state.rush;
    if(state.over){
      if(screen==='rushResults')return;
      el('rushHUD').hidden=el('rushBanner').hidden=el('sessionHUD').hidden=true;
      el('menu').hidden=false;show('rushResults');
      const stats=el('rushStats');stats.replaceChildren();
      for(const [name,value] of rushResults()){
        const dt=document.createElement('dt'),dd=document.createElement('dd');
        dt.textContent=name;dd.textContent=value;stats.append(dt,dd);
      }
      return;
    }
    el('rushHUD').hidden=false;
    const hud='BOSS RUSH · RONDA '+rush.round+' · '+rushStage(state.groupSize)+'\n'+threatLabel(state.threat)+' · '+rush.stageWins+' / '+chooseCount(rush.enabled,state.groupSize)+' encuentros · '+rush.defeated+' jefes'+(rush.bot?'\nBOT PLAY · ACTIVO · '+rush.action:'');
    if(el('rushHUD').textContent!==hud)el('rushHUD').textContent=hud;
    const banner=el('rushBanner');banner.hidden=rush.phase!=='countdown';
    if(!banner.hidden){
      banner.classList.toggle('stageChange',rush.newStage);
      const text=(rush.newStage?'ETAPA COMPLETADA · '+rushStage(state.groupSize):'BOSS RUSH · RONDA '+rush.round)+'\n'+Math.ceil(rush.timer);
      if(banner.textContent!==text)banner.textContent=text;
    }
  };
  function startExtra(id){
    rules={difficulty:1,xp:1,color:setup.elements.color.value,disabled:[],...options.read(id)};
    screen='playing';start(id);beginExtra(id);
  }
  let extraId;
  for(const id of [...Object.keys(EXTRA_NAMES),'sandbox'])el(id).onclick=()=>{
    extraId=id;el('setupExtraTitle').textContent=EXTRA_NAMES[id]||'Sandbox';
    options.open(id,el('extraSetup'));show('extraSetup');
  };
  el('extraSetup').onsubmit=e=>{e.preventDefault();
    if(extraId==='siege'&&!options.read('siege').enemyPool.length){el('notice').textContent='Habilita al menos un enemigo para el asedio.';return;}
    if(extraId==='sandbox')startSandbox();else startExtra(extraId);};
  el('retryExtra').onclick=()=>startExtra(state.extra.id);
  el('leaveExtra').onclick=()=>end('','extras');
  syncLocalUI=()=>{
    const m=state.extra,hud=el('rushHUD');
    if(m&&state.over){
      if(screen==='extraResults')return;
      hud.hidden=el('sessionHUD').hidden=true;el('menu').hidden=false;show('extraResults');
      el('extraTitle').textContent=EXTRA_NAMES[m.id];el('extraStats').replaceChildren();
      for(const [label,value] of extraResults(m)){
        const term=document.createElement('dt'),val=document.createElement('dd');
        term.textContent=label;val.textContent=value;el('extraStats').append(term,val);
      }
      return;
    }
    hud.hidden=false;hud.classList.toggle('lastMinute',m?.id==='trial'&&state.time>=(m.duration||600)*.9);
    const info=(m?extraHUD(m)+'\n':'')+threatLabel(state.threat);
    if(hud.textContent!==info)hud.textContent=info;
  };
  function startSandbox(){
    rules={difficulty:1,xp:1,disabled:[],color:'#4df3ff',...options.read('sandbox')};
    restart();Object.assign(lab,{god:false,speed:1,debug:false,hitboxes:false,spawnWaves:false,bossId:0});lab.group.clear();sandboxEnemy='normal';start('sandbox');if(rules.boss)spawnEncounter([rules.boss]);applyStartingDeck();sandboxHint();
  };
  el('labTool').onclick=()=>openSandboxPanel('lab');
  el('sandboxClose').onclick=closeSandboxPanel;
  el('sandboxPanel').addEventListener('close',()=>{if(!el('sandboxPanel').open)sandboxTab=null;});
  el('solo').onclick=()=>configure(false);el('create').onclick=()=>configure(true);
  setup.onsubmit=e=>{
    e.preventDefault();const f=setup.elements;
    const chosen={...options.read(creating?'online':'solo'),difficulty:Number(f.difficulty.value),xp:Number(f.xp.value),disabled:[...setup.querySelectorAll('#roster input:not(:checked),#setupBosses input:not(:checked)')].map(n=>n.value)};
    if(!creating){rules={...chosen,color:f.color.value};restart();start('solo');applyStartingDeck();return;}
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
      button.append(room.name,meta);meta.textContent+=' · '+(room.started?'En curso':'En espera')+' · '+(room.lateJoin?'Admite entrada tardía':'Solo antes de iniciar');button.disabled=room.count>=room.max||(room.started&&!room.lateJoin);button.onclick=()=>join(room.code);list.append(button);
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
    if(screen==='rushSetup'||screen==='extraSetup')show('extras');
    else if(screen==='identity'&&creating)configure(true);
    else if(screen==='identity'||screen==='setup'&&creating)lobby();else show('home');
  };
  identity.onsubmit=async e=>{
    e.preventDefault();const buttons=identity.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);
    const profile={name:identity.elements.nick.value.trim(),color:identity.elements.color.value};
    try{
      const r=await roomRequest(creating?'create':'join',{code,settings:multiplayerSettings,profile});
      resetPresentation();actionSeq=0;queuedActions=[];
      rules={...r.settings,color:profile.color};chunkCache.clear();state=r.state;netSession={code:r.code,token:r.token,shotFormat:1,impactFormat:1};start('online');
      const session=netSession;
      let socket=null,live=false,lastFrameSent=0,seen=0,nextPing=0,nextAttempt=0,lastStateAt=0;
      let fallbackBusy=0,lastFallback=-Infinity;
      function waiting(next){
        const info=next.waiting,panel=el('roomWait');panel.hidden=!info;
        if(!info)return;
        el('waitMembers').textContent=info.participants.map(m=>m.name+(m.host?' ★':'')+(m.ready?' · Listo':' · En espera')).join(' / ');
        el('markReady').textContent=info.ready?'Cancelar listo':'Estoy listo';el('hostStart').hidden=!info.host;
        const send=(action,data)=>roomRequest(action,{...session,...data}).catch(e=>{el('waitMembers').textContent=e.message;});
        el('markReady').onclick=()=>send('ready',{ready:!info.ready});el('hostStart').onclick=()=>send('start',{});
      }
      waiting(state);
      function accept(next){
        if(session!==netSession || next.time<state.time || (next.ack??0)<(state.ack??0))return;
        if(next.shotTable){next.enemyBullets=unpackHostileShots(next.shotTable);delete next.shotTable;}
        const now=performance.now();
        lastStateAt=now;queuedActions=queuedActions.filter(a=>a.id>(next.actionAck||0));
        prepareMotion(state,next,now);
        if(state.waiting&&!next.waiting){mouse.down=false;queuedActions=[];actionSeq=next.actionAck||0;}
        state=next;waiting(next);state.inventorySelection=inventoryChoice;
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
          else if(msg.type==='contacts')presentConfirmedContacts(msg.hits,performance.now(),state);
          else if(msg.type==='pong')netPingMs=performance.now()-msg.stamp;
        };
        ws.onclose=()=>{if(socket===ws){socket=null;live=false;if(session===netSession)netPingMs=null;}};
      }
      function controls(frames,now){
        const p=state.player;
        const target=getWorldMouse();
        return {frames,width:W,height:H,stamp:now,angle:p.angle,reach:Math.hypot(target.x-p.x,target.y-p.y),dx:(mouse.x-W/2)/viewZoom(),
          dy:(mouse.y-H/2)/viewZoom(),fire:mouse.down,
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
              socket.send(JSON.stringify({type:'input',seen,input:controls(frames,now),actions:queuedActions.slice(0,16)}));
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
          roomRequest('step',{...session,input:controls(inputHistory.slice(-48),now),actions:queuedActions.slice(0,16)})
            .then(next=>{if(!live && session===netSession){netPingMs=performance.now()-now;accept(next);}})
            .catch(err=>{
              if(live||session!==netSession)return;
              if(err.status===403||err.status===404){end('La sala se cerró o caducó la sesión.','lobby');refresh();}
              else el('playerInfo').textContent='Reconectando con la sala '+session.code+'…';
            })
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
