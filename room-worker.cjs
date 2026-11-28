const {Worker,isMainThread,workerData,parentPort}=require('node:worker_threads');

if(isMainThread){
  module.exports=function roomWorker(settings,onFailure,onContacts){
    const worker=new Worker(__filename,{workerData:settings});
    const pending=new Map();
    let closed=false,serial=0;
    function close(reason){
      if(closed)return;
      closed=true;
      for(const {reject,timer} of pending.values()){
        clearTimeout(timer);reject(Object.assign(Error('La sala se cerró.'),{status:503}));
      }
      pending.clear();worker.terminate();
      if(reason)onFailure(reason);
    }
    worker.on('error',close);
    worker.on('exit',()=>close(Error('El proceso de la sala terminó.')));
    worker.on('message',({id,packet,contacts})=>{
      if(contacts){onContacts(contacts);return;}
      const call=pending.get(id);if(!call)return;
      clearTimeout(call.timer);pending.delete(id);call.resolve(packet);
    });
    const send=(op,data={})=>{if(!closed)worker.postMessage({op,...data});};
    return {
      add:(token,profile)=>send('add',{token,profile}),remove:token=>send('remove',{token}),
      input:(token,input,actions)=>send('input',{token,input,actions}),start:()=>send('start'),close:()=>close(),
      snapshot(token,compact,waiting){
        if(closed)return Promise.reject(Object.assign(Error('La sala se cerró.'),{status:503}));
        const id=++serial;
        return new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>close(Error('La simulación dejó de responder.')),6000);
          pending.set(id,{resolve,reject,timer});send('snapshot',{id,token,compact,waiting});
        });
      }
    };
  };
}else{
  const game=require('./room-engine.cjs')(workerData);
  const {packHostileShots}=require('./src/shot-wire.js');
  let lastImpact=0,running=!workerData.manualStart,cacheTime=-1,shotTable,last=performance.now(),debt=0;
  const members=new Set(),step=1000/30;
  setInterval(()=>{
    const now=performance.now();debt=Math.min(step*4,debt+now-last);last=now;
    while(debt>=step){debt-=step;if(running&&members.size)game.tick(1/30);}
    const fresh=game.impactsSince(lastImpact);
    if(fresh.length){lastImpact=fresh.at(-1).seq;parentPort.postMessage({contacts:JSON.stringify({type:'contacts',hits:fresh})});}
  },step);
  function wire(key,value){
    if(['owner','target','prevX','prevY','tracks'].includes(key))return;
    if(key==='events'&&Array.isArray(value))return value.filter(e=>e.kind!=='volley'&&e.start<=this.age+.1&&e.end>=this.age);
    return value;
  }
  parentPort.on('message',m=>{
    if(m.op==='start'){running=true;return;}
    if(m.op==='add'){game.add(m.token,m.profile);members.add(m.token);return;}
    if(!members.has(m.token))return;
    if(m.op==='remove'){game.remove(m.token);members.delete(m.token);}
    if(m.op==='input'&&running)game.input(m.token,m.input,m.actions);
    if(m.op==='snapshot'){
      const s=game.snapshot(m.token);
      if(m.waiting)s.waiting=m.waiting;
      if(m.compact&&s.enemyBullets.length>=64){
        if(cacheTime!==s.time){shotTable=packHostileShots(s.enemyBullets);cacheTime=s.time;}
        s.shotTable=shotTable;delete s.enemyBullets;
      }
      parentPort.postMessage({id:m.id,packet:JSON.stringify(s,wire)});
    }
  });
}
