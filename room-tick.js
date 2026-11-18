(() => {
  playMode = 'online';
  rules = settings;
  configureCardUpgrades();
  const world = newState();
  const shared = 'time enemies enemyBullets enemyDarts orbs potions spawnTimer potionTimer boss bossEncounters bossActive arena bossBombs bossLasers bossLaserActive bossLaserTimer bossSpawnTimer bossWarningShown enemyHpMult spawnRateMult adaptiveCheckTimer'.split(' ');
  const party = new Map();
  function add(id, profile) {
    const personal = newState();
    for (const key of shared) Object.defineProperty(personal,key,{
      enumerable:true, get:()=>world[key], set:value=>{world[key]=value;}
    });
    const leader = party.values().next().value;
    if (leader) Object.assign(personal.player,{x:leader.state.player.x,y:leader.state.player.y});
    personal.player.color = profile.color;
    party.set(id,{state:personal,profile,input:{},actions:[]});
  }
  function tick(dt) {
    const ready = [...party.values()].filter(m=>!m.state.over);
    const focus = ready[Math.floor(world.time/3)%ready.length];
    for (const member of new Set([focus,...party.values()])) {
      if (!member) continue;
      state = member.state;
      const input = member.input;
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
        if (action.kind==='slot' && !state.inventoryOpen && !state.cardChoices) useSlot(action.i);
        if (action.kind==='equip' && state.inventoryOpen && (action.card===null || state.specialCards[action.card]?.totalCards>0)) state.slots[action.i]=action.card;
      }
      if (state.inventoryOpen || state.cardChoices) mouse.down = false;
      update(dt,member===focus);
      // The focus advances boss AI once. Its active attacks can hit every player.
      if(world.boss && member!==focus && !state.over && state.player.invuln<=0){
        const p=state.player,b=world.boss;
        const near=(object,radius)=>Math.hypot(p.x-object.x,p.y-object.y)<radius;
        if(b.state==='dash' && near(b,(b.size+p.size)/2))damagePlayer(2);
        else if(b.balls.some(ball=>ball.state==='flying' && near(ball,ball.r+p.size/2))
          || world.bossBombs.some(bomb=>bomb.exploded && bomb.fadeTimer===0 && near(bomb,100))
          || world.bossLasers.some(laser=>laser.state==='active' && laserHits(p.x,p.y,p.size/2,laser.x,laser.y,laser.angle,laser.width,3000)))damagePlayer(1);
      }
      if(world.arena) {
        const a=world.arena,p=state.player;
        p.x=clamp(p.x,a.x+15,a.x+a.w-15); p.y=clamp(p.y,a.y+15,a.y+a.h-15);
      }
    }
    if(settings.pvp) for(const attacker of party.values()) {
      const shots=attacker.state.bullets;
      for(let i=shots.length-1;i>=0;i--) {
        const b=shots[i];
        for(const victim of party.values()) {
          if(victim===attacker || victim.state.over) continue;
          const p=victim.state.player;
          if(Math.hypot(p.x-b.x,p.y-b.y)>15+b.r) continue;
          state=attacker.state;
          const damage=b.damage*attackMultiplier();
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
    return {...self.state, bullets, selfId:wireId(self), inputTime:self.inputTime,
      peers:others.map(m=>{
        const s=m.state, p=s.player;
        return {...m.profile,netId:wireId(m),x:p.x,y:p.y,size:p.size,angle:p.angle,
          vx:p.vx,vy:p.vy,backShots:p.backShots,dashTimer:p.dashTimer,invuln:p.invuln,
          field:p.field,burst:p.burst,impact:p.impact,blades:p.blades,echoes:p.echoes,
          drones:s.drones,shields:s.shields,darts:s.darts.map(({x,y,angle,type})=>({x,y,angle,type})),
          laserCharging:s.laserCharging,laserChargeTime:s.laserChargeTime,lasersFiring:s.lasersFiring,over:s.over};
      })};
  }
  return {add,tick,snapshot,remove:id=>party.delete(id),input(id,input,actions){
    const member=party.get(id);
    member.actions.push(...actions.slice(0,32-member.actions.length));
    if (Number.isFinite(input.stamp) && input.stamp <= (member.input.stamp ?? -1)) return;
    member.tap ||= Boolean(input.tap);
    member.input=input;
  }};
})()
