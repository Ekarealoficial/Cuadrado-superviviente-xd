const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});
 try{
 const host=await b.newPage({hasTouch:true,isMobile:true,viewport:{width:844,height:390}}),guest=await b.newPage();
 const errors=[];const url=process.argv[2]||'http://localhost:3000/';
 for(const p of [host,guest]){p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.click('#multi');}
 await host.click('#create');await host.check('[name=privateRoom]');await host.getByLabel('Esperar al anfitrión').check();await host.locator('#setup > button:not([type])').click();
 await host.fill('[name=nick]','Azul');await host.locator('#identity button').first().click();await host.locator('#roomWait').waitFor();const code=await host.evaluate(()=>netSession.code);
 await guest.fill('[name=code]',code);await guest.click('#byCode button');await guest.fill('[name=nick]','Verde');await guest.locator('#identity button').first().click();await guest.click('#markReady');
 await host.waitForFunction(()=>state.waiting.participants.some(x=>x.name==='Verde'&&x.ready));await host.click('#hostStart');
 for(const p of [host,guest])await p.waitForFunction(()=>!state.waiting&&state.time>.2);
 await guest.mouse.move(650,300);await guest.mouse.down();await host.waitForFunction(()=>state.bullets.some(q=>q.shooterId!==state.selfId));await guest.mouse.up();
 await host.tap('#zoomIn');assert.equal(await guest.evaluate(()=>localLens.target),1);
 const ws=await guest.context().newCDPSession(guest);await ws.send('Network.enable');
 await ws.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
 // Interrupt transport while retaining the session in this tab.
 await guest.context().setOffline(true);await guest.waitForTimeout(1200);await guest.context().setOffline(false);
 await ws.send('Network.emulateNetworkConditions',{offline:false,latency:60,downloadThroughput:1e7,uploadThroughput:1e7});
 await guest.keyboard.press('e');await guest.waitForFunction(()=>state.inventoryOpen&&state.actionAck>=1);
 const me=await guest.evaluate(()=>state.selfId);await guest.keyboard.press('e');await guest.waitForFunction(()=>!state.inventoryOpen&&state.actionAck>=2);
 assert.equal(await guest.evaluate(()=>state.selfId),me);
 await host.click('#exit');await guest.click('#exit');assert.deepEqual(errors,[]);console.log('Dos navegadores: sala manual, controles, disparo, inventario y reconexión OK');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
