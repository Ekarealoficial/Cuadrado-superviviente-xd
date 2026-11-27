const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const net=require('node:net');
test('Sala manual con anfitrión transferible, semilla compartida y entrada tardía cerrada',async t=>{
  const probe=net.createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');
  const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
  const proc=spawn(process.execPath,['server.cjs'],{env:{...process.env,PORT:port},stdio:'ignore'});
  t.after(()=>proc.kill());
  const base='http://127.0.0.1:'+port;
  for(let i=0;i<80;i++){try{if((await fetch(base+'/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,25));}
  async function api(action,data){
    const res=await fetch(base+'/api/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    return {status:res.status,...await res.json()};
  }
  const profile={name:'Luz',color:'#abcdef'},settings={name:'Prueba',max:4,disabled:[],xp:1,difficulty:1,seed:0,manualStart:true,lateJoin:false};
  const a=await api('create',{settings,profile}),code=a.code,b=await api('join',{code,profile});
  assert.equal(a.settings.seed,0);assert.ok(a.state.waiting.host);assert.equal(b.state.waiting.host,false);
  assert.equal((await api('start',{code,token:b.token})).status,403);
  await api('ready',{code,token:b.token,ready:true});const snapshot=await api('step',{code,token:a.token});
  assert.equal(snapshot.time,0);assert.ok(snapshot.waiting.participants[1].ready);
  await api('leave',{code,token:a.token});assert.ok((await api('step',{code,token:b.token})).waiting.host);
  assert.ok((await api('start',{code,token:b.token})).started);
  assert.equal((await api('join',{code,profile})).status,409);
});
