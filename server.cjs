const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const engine=require('./room-engine.cjs');
const {packHostileShots}=require('./src/shot-wire.js');
function clientSnapshot(room,token,compact){
  const snapshot=room.game.snapshot(token);
  if(compact&&snapshot.enemyBullets.length>=64){
    if(room.shotTime!==snapshot.time){
      room.packedShots=packHostileShots(snapshot.enemyBullets);room.shotTime=snapshot.time;
    }
    snapshot.shotTable=room.packedShots;delete snapshot.enemyBullets;
  }
  return snapshot;
}
const {WebSocketServer,WebSocket}=require('ws');
const rooms=new Map();
const sockets=new Map();
const streams=new Map();
const allowedOrigins=new Set((process.env.ALLOWED_ORIGINS||'https://ekarealoficial.github.io,http://localhost:3000').split(',').map(origin=>origin.trim()).filter(Boolean));
// Entity references and simulation-only choreography need not cross the wire.
function gameWire(key,value){
  if(['owner','target','prevX','prevY','tracks'].includes(key))return;
  if(key==='events' && Array.isArray(value))return value.filter(e=>e.kind!=='volley' && e.start<=this.age+.1 && e.end>=this.age);
  return value;
}
const types='pulseRing erratic twinCannon rebound tackler splitter cannon frostMage normal fast tank shooter invoker teleporter kamikaze dardante juggernaut boss worm singular fractal clock crown beacon twins heart monolith'.split(' ');
const rates=[0.5,1,1.5,2,3];
function requireValue(ok,message,status=400){if(!ok)throw Object.assign(new Error(message),{status});}
function settings(s) {
  requireValue(s && rates.includes(s.xp) && rates.includes(s.difficulty) && Array.isArray(s.disabled),'Ajustes inválidos');
  requireValue(Number.isInteger(s.max) && s.max>=2 && s.max<=12 && typeof s.name==='string' && s.name.trim(),'Revisa el nombre y el límite de jugadores');
  return {name:s.name.trim().slice(0,40),max:s.max,pvp:s.pvp===true,private:s.private===true,
    difficulty:s.difficulty,xp:s.xp,disabled:types.filter(t=>s.disabled.includes(t))};
}
function leave(room,token){
  sockets.get(token)?.close(1000);
  room.members.delete(token); room.game.remove(token);
  if(!room.members.size)rooms.delete(room.code);
}
const stepMs=1000/30;
let lastTick=performance.now(), debt=0;
setInterval(()=>{
  const now=performance.now();
  debt=Math.min(4*stepMs,debt+now-lastTick);
  lastTick=now;
  const steps=Math.floor(debt/stepMs);
  debt-=steps*stepMs;
  for(const r of rooms.values()){
    for(const [token,seen] of r.members)if(Date.now()-seen>20000)leave(r,token);
    if(r.members.size){
      try{for(let i=0;i<steps;i++)r.game.tick(1/30);}
      catch(error){console.error('Error de simulación',error);rooms.delete(r.code);}
    }
  }
},1000/30).unref();
async function body(req){
  let raw='';
  for await(const part of req){raw+=part;requireValue(raw.length<8192,'Solicitud demasiado grande',413);}
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
  function json(status,data){
    res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});
    res.end(JSON.stringify(data,gameWire));
  }
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/health')return json(200,{ok:true,rooms:rooms.size});
    if(!url.pathname.startsWith('/api/')){
      const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
      requireValue(req.method==='GET' && /^(index\.html|menu\.css|src\/[\w-]+\.js)$/.test(file),'No encontrado',404);
      const content=await fs.promises.readFile(path.join(__dirname,file));
      res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');
      return res.end(content);
    }
    if(req.method==='GET' && url.pathname==='/api/rooms'){
      return json(200,[...rooms.values()].filter(r=>!r.settings.private).map(r=>({...r.settings,code:r.code,opened:r.opened,count:r.members.size})));
    }
    requireValue(req.method==='POST','Método inválido',405);
    const data=await body(req);
    const action=url.pathname.slice(5);
    let room=rooms.get(String(data.code).toUpperCase());
    if(action==='create'||action==='join'){
      const p=data.profile;
      requireValue(typeof p?.name==='string'&&p.name.trim()&&/^#[0-9a-f]{6}$/i.test(p.color),'Elige nombre y color');
      if(action==='create'){
        requireValue(rooms.size<100,'Servidor lleno',503);
        const s=settings(data.settings);
        let code;do{code=crypto.randomBytes(4).toString('hex').toUpperCase();}while(rooms.has(code));
        room={settings:s,code,opened:Date.now(),members:new Map(),game:engine(s)};
        rooms.set(code,room);
      }
      requireValue(room,'Código desconocido o sala cerrada',404);
      requireValue(room.members.size<room.settings.max,'Sala llena',409);
      const token=crypto.randomUUID();
      room.game.add(token,{name:p.name.trim().slice(0,24),color:p.color});
      room.members.set(token,Date.now());
      return json(200,{code:room.code,token,settings:room.settings,state:room.game.snapshot(token)});
    }
    requireValue(room?.members.has(data.token),'Sesión terminada',403);
    if(action==='leave'){leave(room,data.token);return json(200,{});}
    if(action==='stream'){
      res.writeHead(200,{'Content-Type':'application/x-ndjson','Cache-Control':'no-store, no-transform','X-Accel-Buffering':'no'});
      streams.get(data.token)?.end();
      streams.set(data.token,res);
      res.flushHeaders();
      const timer=setInterval(()=>{
        if(!room.members.has(data.token)||!rooms.has(room.code)){res.end();return;}
        if(res.writableNeedDrain)return;
        const snapshot=room.game.snapshot(data.token);
        res.write(JSON.stringify(snapshot,gameWire)+'\n');
      },50);
      res.on('close',()=>{clearInterval(timer);if(streams.get(data.token)===res)streams.delete(data.token);});
      return;
    }
    requireValue(action==='input'||action==='step','No encontrado',404);
    room.members.set(data.token,Date.now());
    submitInput(room,data.token,data);
    return json(200,action==='input'?{}:clientSnapshot(room,data.token,data.shotFormat===1));
  }catch(e){json(e.status||500,{error:e.status?e.message:'Error del servidor'});}
});
function submitInput(room,token,data){
    const input=data.input||{};
    for(const k of ['dx','dy']) input[k]=Number.isFinite(input[k])?Math.max(-2000,Math.min(2000,input[k])):0;
    const actions=(Array.isArray(data.actions)?data.actions:[]).filter(a=>a && (a.kind==='inventory'||Number.isInteger(a.i)&&a.i>=0&&a.i<5));
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
  const authTimer=setTimeout(()=>ws.close(1008),5000);
  ws.on('error',()=>ws.terminate());
  ws.on('close',()=>{
    clearInterval(timer);clearTimeout(authTimer);
    if(sockets.get(token)===ws)sockets.delete(token);
  });
  ws.on('message',raw=>{
    try{
      const data=JSON.parse(raw);
      if(!room){
        room=rooms.get(data.code);token=data.token;compact=data.shotFormat===1;
        if(!room?.members.has(token)){ws.close(1008);return;}
        clearTimeout(authTimer);
        sockets.get(token)?.close(1000);
        sockets.set(token,ws);
        ws.send(JSON.stringify({type:'ready'}));
        timer=setInterval(()=>{
          if(!room.members.has(token)||!rooms.has(room.code)){ws.close(1000);return;}
          if(ws.readyState!==WebSocket.OPEN || ws.bufferedAmount>32768 || serial-seen>=8)return;
          const state=clientSnapshot(room,token,compact);
          ws.send(JSON.stringify({type:'state',serial:++serial,state},gameWire));
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
