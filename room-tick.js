(() => {
  playMode = 'online';
  rules = settings;
  configureCardUpgrades();
  const world = newState();
  const shared = 'iceZones stopUntil time enemies enemyBullets enemyDarts orbs potions spawnTimer potionTimer boss bossEncounters bossActive arena bossBombs bossLasers bossLaserActive bossLaserTimer bossSpawnTimer bossWarningShown enemyHpMult spawnRateMult adaptiveCheckTimer'.split(' ');
  const party = new Map();
  function add(id, profile) {
    const personal = newState();
    for (const key of shared) Object.defineProperty(personal,key,{
      enumerable:true, get:()=>world[key], set:value=>{world[key]=value;}
    });
    const leader = party.values().next().value;
    if (leader) Object.assign(personal.player,{x:leader.state.player.x,y:leader.state.player.y});
    personal.player.color = profile.color;
    party.set(id,{state:personal,profile,input:{},actions:[],queue:[],ack:0,credit:0,sequenced:false});
  }
  function tick(dt) {
    for(const group of [world.enemies,world.enemyBullets,world.enemyDarts])
      for(const e of group)rememberPosition(e,world.time);
    if(world.boss){
      rememberPosition(world.boss,world.time);
      for(const ball of world.boss.balls)rememberPosition(ball,world.time);
    }
    const ready = [...party.values()].filter(m=>!m.state.over);
    const focus = ready[Math.floor(world.time/3)%ready.length];
    for (const member of new Set([focus,...party.values()])) {
      if (!member) continue;
      state = member.state;
      const input = member.input;
      state.viewWidth=Number.isFinite(input.width)?clamp(input.width,240,4096):W;
      state.viewHeight=Number.isFinite(input.height)?clamp(input.height,160,2160):H;
      for (const key of ['w','a','s','d']) keys[key]=Boolean(input[key]);
      mouse.x = W/2 + (input.dx || 0);
      mouse.y = H/2 + (input.dy || 0);
      if (Number.isFinite(input.angle)) {
        const p = state.player;
        mouse.x = W/2 + (p.x - state.cam.x + 1000*Math.cos(input.angle))*state.cam.zoom;
        mouse.y = H/2 + (p.y - state.cam.y + 1000*Math.sin(input.angle))*state.cam.zoom;
      }
      mouse.down = Boolean(input.fire || member.tap);
      member.tap = false;
      if (member.applied !== input) {
        member.applied = input;
        member.inputTime = input.stamp;
      }
      if (Number.isFinite(member.inputTime)) member.inputTime += dt * 1000;
      for (const action of member.actions.splice(0)) {
        if (state.over) continue;
        if (action.kind==='pick' && state.cardChoices?.[action.i]) pickCard(state.cardChoices[action.i]);
        if (action.kind==='inventory' && !state.cardChoices) state.inventoryOpen=!state.inventoryOpen;
        if (action.kind==='slot' && !state.inventoryOpen && !state.cardChoices){
          if(state.slots[action.i]==='reverse' && state.specialCards.reverse.charges){
            for(const other of party.values())if(other!==member){
              other.state.bullets=other.state.bullets.filter(b=>{
                if(!inversionVisible(b))return true;
                b.homing=true;delete b.volley;state.bullets.push(b);return false;
              });
            }
          }
          useSlot(action.i);
        }
        if (action.kind==='equip' && state.inventoryOpen && (action.card===null || state.specialCards[action.card]?.totalCards>0)) state.slots[action.i]=action.card;
      }
      if (state.inventoryOpen || state.cardChoices) mouse.down = false;
      let commands=null;
      if (member.sequenced) {
        commands=[];
        member.credit=Math.min(.24,member.credit+dt);
        while (member.queue.length && member.queue[0][1]<=member.credit+1e-9) {
          const c=member.queue.shift();
          member.credit-=c[1];
          member.ack=c[0];
          commands.push(c);
        }
      }
      update(dt,member===focus,commands);
      // The focus advances boss AI once. Its active attacks can hit every player.
      if(world.stopUntil<=world.time && world.boss && member!==focus && !state.over && state.player.invuln<=0){
        const p=state.player,b=world.boss;
        const near=(object,radius)=>Math.hypot(p.x-object.x,p.y-object.y)<radius;
        if(b.state==='dash' && visibleContact(b,p,(b.size+p.size)/2))damagePlayer(2);
        else if(b.balls.some(ball=>ball.state==='flying' && visibleContact(ball,p,ball.r+p.size/2))
          || world.bossBombs.some(bomb=>bomb.exploded && bomb.fadeTimer===0 && near(bomb,100))
          || world.bossLasers.some(laser=>laser.state==='active' && laserHits(p.x,p.y,p.size/2,laser.x,laser.y,laser.angle,laser.width,3000)))damagePlayer(1);
      }
      if(world.arena) {
        const a=world.arena,p=state.player;
        p.x=clamp(p.x,a.x+15,a.x+a.w-15); p.y=clamp(p.y,a.y+15,a.y+a.h-15);
      }
    }
    if(settings.pvp && world.stopUntil<=world.time) for(const attacker of party.values()) {
      const shots=attacker.state.bullets;
      for(let i=shots.length-1;i>=0;i--) {
        const b=shots[i];
        for(const victim of party.values()) {
          if(victim===attacker || victim.state.over) continue;
          const p=victim.state.player;
          if(p.plasma?.end>world.time && reflectPlasmaShot(p,p.plasma,b))continue;
          if(bulletEntry(b,p,p.size/2+b.r)===Infinity)continue;
          state=attacker.state;
          const damage=b.damage*attackMultiplier(victim.state.player);
          state=victim.state;
          damagePlayer(damage); shots.splice(i,1); break;
        }
      }
    }
  }
  let nextEntityId=0;
  const wireIds=new WeakMap();
  function wireId(entity){
    if(!wireIds.has(entity))wireIds.set(entity,++nextEntityId);
    return wireIds.get(entity);
  }
  function snapshot(id) {
    const self=party.get(id), others=[...party.values()].filter(m=>m!==self);
    for(const group of [world.enemies,world.enemyBullets,world.enemyDarts,world.orbs,world.potions,...[...party.values()].map(m=>m.state.bullets)]){
      for(const e of group)e.netId=wireId(e);
    }
    const members = [...party.values()];
    const bullets = members.flatMap(m=>m.state.bullets.map(b=>{
      b.shooterId = wireId(m);
      return b;
    }));
    return {...self.state, bullets, selfId:wireId(self), inputTime:self.inputTime, ack:self.ack, controlVersion:2,
      peers:others.map(m=>{
        const s=m.state, p=s.player;
        return {...m.profile,netId:wireId(m),x:p.x,y:p.y,size:p.size,angle:p.angle,
          vx:p.vx,vy:p.vy,backShots:p.backShots,dashTimer:p.dashTimer,invuln:p.invuln,
          pulses:p.pulses?.filter(hit=>world.time-hit.born<.7),fury:p.fury,missingHealth:1-s.halfHearts/s.maxHalfHearts,beam:p.beam,plasma:p.plasma,cast:p.cast,iceUntil:p.iceUntil,field:p.field,burst:p.burst,impact:p.impact,blades:p.blades,echoes:p.echoes,
          drones:s.drones,shields:s.shields,darts:s.darts.map(({x,y,angle,type})=>({x,y,angle,type})),
          laserCharging:s.laserCharging,laserChargeTime:s.laserChargeTime,lasersFiring:s.lasersFiring,over:s.over};
      })};
  }
  return {add,tick,snapshot,remove:id=>party.delete(id),input(id,input,actions){
    const member=party.get(id);
    member.actions.push(...actions.slice(0,32-member.actions.length));
    if (Array.isArray(input.frames)) {
      member.sequenced=true;
      let last=member.queue.at(-1)?.[0] ?? member.ack;
      for (const c of input.frames.slice(0,48)) {
        if (!Array.isArray(c) || (c.length!==6 && c.length!==7) || !Number.isSafeInteger(c[0]) || c[0]<=last ||
            !Number.isFinite(c[1]) || c[1]<=0 || c[1]>.05 ||
            ![-1,0,1].includes(c[2]) || ![-1,0,1].includes(c[3]) || !Number.isFinite(c[4])) continue;

        member.queue.push(c); last=c[0];
      }
      // After a stall, accept only a bounded interval of recent controls.
      let duration=0;
      for(let i=member.queue.length-1;i>=0;i--){
        duration+=member.queue[i][1];
        if(duration>.24+1e-9){member.queue.splice(0,i+1);break;}
      }
    }
    if (Number.isFinite(input.stamp) && input.stamp <= (member.input.stamp ?? -1)) return;
    member.tap ||= Boolean(input.tap);
    member.input=input;
  }};
})()
