const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const roomWorker=require('./room-worker.cjs');
function clientSnapshot(room,token,compact){
  const waiting=room.started?null:{host:room.host===token,ready:room.ready.has(token),
    participants:Array.from(room.members.keys(),id=>({name:room.names.get(id),ready:room.ready.has(id),host:room.host===id}))};
  return room.game.snapshot(token,compact,waiting);
}
const {WebSocketServer,WebSocket}=require('ws');
const rooms=new Map();
const sockets=new Map();
const streams=new Map();
const allowedOrigins=new Set((process.env.ALLOWED_ORIGINS||'https://ekarealoficial.github.io,http://localhost:3000').split(',').map(origin=>origin.trim()).filter(Boolean));
const types='pulseRing erratic twinCannon rebound tackler splitter cannon frostMage normal fast tank shooter invoker teleporter kamikaze dardante juggernaut boss worm singular fractal clock crown beacon twins heart monolith dawn prism sovereign channel general frontier'.split(' ');
const rates=[0.5,1,1.5,2,3];
function requireValue(ok,message,status=400){if(!ok)throw Object.assign(new Error(message),{status});}
function validated(value,valid){requireValue(valid(value),'Ajuste de sala inválido');return value;}
function settings(s) {
  requireValue(s && rates.includes(s.xp) && rates.includes(s.difficulty) && Array.isArray(s.disabled),'Ajustes inválidos');
  for(const key of ['pvp','private','lateJoin','manualStart'])if(s[key]!==undefined)validated(s[key],v=>typeof v==='boolean');
  requireValue(s.disabled.every(t=>typeof t==='string'&&types.includes(t)),'Familia de enemigos desconocida');
  requireValue(Number.isInteger(s.max) && s.max>=2 && s.max<=12 && typeof s.name==='string' && s.name.trim(),'Revisa el nombre y el límite de jugadores');
  return {name:s.name.trim().slice(0,40),max:s.max,pvp:s.pvp===true,private:s.private===true,
    seed:s.seed==null?crypto.randomBytes(4).readUInt32BE():validated(s.seed,v=>Number.isInteger(v)&&v>=0&&v<=4294967295),
    bossFrequency:validated(s.bossFrequency??1,v=>[1,1.5,2].includes(v)),progression:validated(s.progression??1,v=>[1,1.5].includes(v)),
    manualStart:s.manualStart===true,lateJoin:s.lateJoin!==false,
    difficulty:s.difficulty,xp:s.xp,disabled:types.filter(t=>s.disabled.includes(t))};
}
function leave(room,token){
  sockets.get(token)?.close(1000);streams.get(token)?.end();
  room.members.delete(token);room.names.delete(token);room.httpBudget.delete(token);room.ready.delete(token);room.game.remove(token);
  if(room.host===token)room.host=room.members.keys().next().value;
  if(!room.members.size){room.game.close();rooms.delete(room.code);}
}
const maxRooms=Math.max(1,Number(process.env.MAX_ROOMS)||8);
setInterval(()=>{
  for(const r of rooms.values())for(const [token,seen] of r.members)if(Date.now()-seen>20000)leave(r,token);
},1000).unref();
async function body(req){
  let raw='',size=0;
  for await(const part of req){size+=part.length;raw+=part;requireValue(size<=16384,'Solicitud demasiado grande',413);}
  try{return JSON.parse(raw);}catch{throw Object.assign(new Error('JSON inválido'),{status:400});}
}
const server=http.createServer(async(req,res)=>{
  const origin=req.headers.origin;
  if(origin && allowedOrigins.has(origin)){
    res.setHeader('Access-Control-Allow-Origin',origin);
    res.setHeader('Vary','Origin');
    res.setHeader('Access-Control-Max-Age','86400');
    res.setHeader('Access-Control-Allow-Headers','Content-Type');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  }
  if(req.method==='OPTIONS'){
    if(origin && !allowedOrigins.has(origin)){res.writeHead(403);return res.end();}
    res.writeHead(204);return res.end();
  }
  function json(status,data,encoded=false){
    res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});
    res.end(encoded?data:JSON.stringify(data));
  }
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/health')return json(200,{ok:true,version:require('./package.json').version,rooms:rooms.size});
    if(!url.pathname.startsWith('/api/')){
      const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
      requireValue(req.method==='GET' && /^(index\.html|menu\.css|favicon\.svg|portada\.png|src\/[\w-]+\.js)$/.test(file),'No encontrado',404);
      const content=await fs.promises.readFile(path.join(__dirname,file));
      res.setHeader('Content-Type',file.endsWith('.svg')?'image/svg+xml':file.endsWith('.png')?'image/png':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');
      return res.end(content);
    }
    if(req.method==='GET' && url.pathname==='/api/rooms'){
      return json(200,[...rooms.values()].filter(r=>!r.settings.private).map(r=>({...r.settings,code:r.code,opened:r.opened,started:r.started,count:r.members.size})));
    }
    requireValue(req.method==='POST','Método inválido',405);
    const data=await body(req);requireValue(data&&typeof data==='object'&&!Array.isArray(data),'Solicitud inválida');
    const action=url.pathname.slice(5);
    let room=rooms.get(String(data.code).toUpperCase());
    if(action==='create'||action==='join'){
      const p=data.profile;
      requireValue(typeof p?.name==='string'&&p.name.trim()&&/^#[0-9a-f]{6}$/i.test(p.color),'Elige nombre y color');
      if(action==='create'){
        requireValue(rooms.size<maxRooms,'Servidor lleno',503);
        const s=settings(data.settings);
        let code;do{code=crypto.randomBytes(4).toString('hex').toUpperCase();}while(rooms.has(code));
        room={settings:s,code,opened:Date.now(),members:new Map(),names:new Map(),ready:new Set(),started:!s.manualStart,httpBudget:new Map(),game:roomWorker(s,err=>{console.error('Sala cerrada',code,err.message);for(const id of room.members.keys())leave(room,id);},packet=>{
          for(const id of room.members.keys()){
            const ws=sockets.get(id);
            if(ws?.impactFormat===1&&ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<32768)ws.send(packet);
          }
        })};
        rooms.set(code,room);
      }
      requireValue(room,'Código desconocido o sala cerrada',404);
      requireValue(room.members.size<room.settings.max,'Sala llena',409);
      const token=crypto.randomUUID();
      requireValue(action==='create'||!room.started||room.settings.lateJoin,'Esta partida ya comenzó y no admite incorporaciones',409);
      room.host??=token;room.names.set(token,p.name.trim().slice(0,24));
      room.game.add(token,{name:p.name.trim().slice(0,24),color:p.color});
      room.members.set(token,Date.now());
      return json(200,{code:room.code,token,settings:room.settings,state:JSON.parse(await clientSnapshot(room,token,false))});
    }
    requireValue(room?.members.has(data.token),'Sesión terminada',403);
    const now=performance.now(),budget=room.httpBudget.get(data.token)||{at:now,left:64};
    budget.left=Math.min(64,budget.left+(now-budget.at)*.04);budget.at=now;room.httpBudget.set(data.token,budget);
    requireValue(--budget.left>=0,'Demasiadas solicitudes. Intenta de nuevo en un momento.',429);
    if(action==='ready'||action==='start'){
      if(action==='ready'){if(data.ready===true)room.ready.add(data.token);else room.ready.delete(data.token);}
      else {requireValue(data.token===room.host,'Solo el anfitrión puede iniciar',403);room.started=true;room.game.start();}
      return json(200,{started:room.started});
    }
    if(action==='leave'){leave(room,data.token);return json(200,{});}
    if(action==='stream'){
      res.writeHead(200,{'Content-Type':'application/x-ndjson','Cache-Control':'no-store, no-transform','X-Accel-Buffering':'no'});
      streams.get(data.token)?.end();
      streams.set(data.token,res);
      res.flushHeaders();
      let sending=false;
      const timer=setInterval(async()=>{
        if(!room.members.has(data.token)||!rooms.has(room.code)){res.end();return;}
        if(res.writableNeedDrain||sending)return;sending=true;
        try{const packet=await clientSnapshot(room,data.token,false);if(!res.destroyed)res.write(packet+'\n');}
        catch{res.end();}finally{sending=false;}
      },50);
      res.on('close',()=>{clearInterval(timer);if(streams.get(data.token)===res)streams.delete(data.token);});
      return;
    }
    requireValue(action==='input'||action==='step','No encontrado',404);
    room.members.set(data.token,Date.now());
    submitInput(room,data.token,data);
    if(action==='input')return json(200,{});
    return json(200,await clientSnapshot(room,data.token,data.shotFormat===1),true);
  }catch(e){json(e.status||500,{error:e.status?e.message:'Error del servidor'});}
});
function submitInput(room,token,data){
    if(!room.started)return;
    const incoming=data.input||{},input={};
    for(const key of ['w','a','s','d','tap','fire'])input[key]=incoming[key]===true;
    for(const key of ['stamp','width','height','reach','angle','dx','dy'])if(Number.isFinite(incoming[key]))input[key]=incoming[key];
    if(Array.isArray(incoming.frames))input.frames=incoming.frames.slice(0,48);
    for(const k of ['dx','dy']) input[k]=Number.isFinite(input[k])?Math.max(-2000,Math.min(2000,input[k])):0;
    const actions=(Array.isArray(data.actions)?data.actions:[]).filter(a=>a && (a.kind==='inventory'||['slot','pick','equip'].includes(a.kind)&&Number.isInteger(a.i)&&a.i>=0&&a.i<5&&(a.kind!=='equip'||a.card===null||typeof a.card==='string'&&a.card.length<=40)));
    room.game.input(token,input,actions);
}

// One ordered duplex channel per participant. Slow readers skip obsolete snapshots.
const wsServer=new WebSocketServer({noServer:true,maxPayload:16384,perMessageDeflate:{threshold:1500}});
server.on('upgrade',(req,socket,head)=>{
  if(req.url!=='/api/live' || (req.headers.origin && !allowedOrigins.has(req.headers.origin))){
    socket.destroy();return;
  }
  wsServer.handleUpgrade(req,socket,head,ws=>wsServer.emit('connection',ws));
});
wsServer.on('connection',ws=>{
  let room,token,timer,serial=0,seen=0,compact=false;
  let budget=120,lastMessage=performance.now();
  const authTimer=setTimeout(()=>ws.close(1008),5000);
  ws.on('error',()=>ws.terminate());
  ws.on('close',()=>{
    clearInterval(timer);clearTimeout(authTimer);
    if(sockets.get(token)===ws)sockets.delete(token);
  });
  ws.on('message',raw=>{
    try{
      const now=performance.now();budget=Math.min(120,budget+(now-lastMessage)*.09);lastMessage=now;
      if(--budget<0){ws.close(1008,'Demasiados mensajes');return;}
      const data=JSON.parse(raw);
      if(!room){
        room=rooms.get(data.code);token=data.token;compact=data.shotFormat===1;ws.impactFormat=data.impactFormat;
        if(!room?.members.has(token)){ws.close(1008);return;}
        clearTimeout(authTimer);
        sockets.get(token)?.close(1000);streams.get(token)?.end();
        sockets.set(token,ws);
        ws.send(JSON.stringify({type:'ready'}));
        let sending=false;
        timer=setInterval(async()=>{
          if(!room.members.has(token)||!rooms.has(room.code)){ws.close(1000);return;}
          if(ws.readyState!==WebSocket.OPEN || ws.bufferedAmount>32768 || serial-seen>=8)return;
          if(sending)return;sending=true;
          try{const packet=await clientSnapshot(room,token,compact);
            if(ws.readyState===WebSocket.OPEN)ws.send('{"type":"state","serial":'+(++serial)+',"state":'+packet+'}');
          }catch{ws.close();}finally{sending=false;}
        },40);
        return;
      }
      if(sockets.get(token)!==ws || !room.members.has(token)){ws.close(1008);return;}
      room.members.set(token,Date.now());
      if(Number.isSafeInteger(data.seen))seen=Math.max(seen,Math.min(serial,data.seen));
      if(data.type==='ping'){ws.send(JSON.stringify({type:'pong',stamp:data.stamp}));return;}
      if(data.type==='input')submitInput(room,token,data);
    }catch{ws.close(1008);}
  });
});
server.listen(process.env.PORT||3000);
