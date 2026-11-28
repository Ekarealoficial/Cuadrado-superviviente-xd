const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});
try{for(const [w,h,touch] of [[1280,800,false],[390,844,true],[844,390,true]]){
 const p=await b.newPage({viewport:{width:w,height:h},hasTouch:touch,isMobile:touch});p.setDefaultTimeout(5000);
 const errors=[];p.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
 await p.goto(process.argv[2]||'http://localhost:3000/');
 const click=id=>p.locator('#'+id).click();
 await click('actRead');await click('launchClose');assert.equal(await p.locator('#newAct').isVisible(),false);
 await click('solo');await p.locator('#setup > button:not([type])').click();
 await p.locator('[data-launch="Menú de partida"]').click();const a=await p.evaluate(()=>state.time);await p.waitForTimeout(180);assert.equal(await p.evaluate(()=>state.time),a);await click('launchClose');await click('exit');
 await click('extrasButton');
 for(const id of ['daily','duel','pursuit','siege','trial','chaos','sandbox']){
   await click(id);await p.locator('#extraSetup > button:not([type])').click();
   await p.waitForFunction(id=>playMode===id&&state.time>.1,id);if(touch){await click('zoomIn');assert(await p.evaluate(()=>localLens.target>1));}
   if(id==='sandbox'){await click('labTool');await click('sandboxClose');}
   else{await p.evaluate(()=>damagePlayer(100));await p.locator('#extraResults').waitFor();await click('retryExtra');await p.waitForFunction(()=>!state.over);}
   await click('exit');
 }
 await click('rushButton');await p.locator('#botPlay').check();await p.getByLabel('Nivel de Bot Play').selectOption('Experto');await p.getByLabel('Ver decisiones del bot').check();
 await p.locator('#rushSetup > button:not([type])').click();await p.waitForFunction(()=>state.rush?.bot&&state.bossActive);
 assert.deepEqual(errors,[]);console.log('OK',w,h);await p.close();
}}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
