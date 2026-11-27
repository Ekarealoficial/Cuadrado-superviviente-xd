'use strict';
/* =============== AUDIO =============== */
const Sfx = {
  ctx: null, master: null, last: {}, noiseBuffers: new Map(),
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.4;
    this.master.connect(this.ctx.destination);
  },
  tone(freq, dur, type, vol, slideTo, delay=0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime+delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol, cutoff, endCutoff) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const size = Math.floor(this.ctx.sampleRate * dur);
    let buf = this.noiseBuffers.get(size);
    if (!buf) {
      buf = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
      this.noiseBuffers.set(size,buf);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.setValueAtTime(cutoff||1000,t);
    if(endCutoff)f.frequency.exponentialRampToValueAtTime(endCutoff,t+dur);
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  },
  play(name, throttle) {
    if (!this.ctx) return;
    const now = performance.now();
    if (throttle && this.last[name] && now - this.last[name] < throttle) return;
    this.last[name] = now;
    const score=BOSS_SCORES[name];
    if(score){
      for(const note of score.notes)this.tone(...note);
      if(score.noise)this.noise(...score.noise);
      return;
    }
    switch (name) {
      case 'timeCrack': this.noise(.055,.24,6400);this.tone(1350,.075,'triangle',.15,380);this.tone(95,.09,'sine',.2,42);break;
      case 'gravityPull': this.tone(105,1.25,'sine',.22,420);this.tone(160,.8,'triangle',.09,75);break;
      case 'gravityBurst': this.tone(150,.36,'sine',.32,32);this.noise(.18,.2,1200);break;
      case 'speedHit': this.tone(650,.075,'triangle',.14,180);break;
      case 'shoot':   this.tone(900, 0.06, 'square', 0.10, 260); break;
      case 'hit':     this.tone(320, 0.05, 'square', 0.12, 140); break;
      case 'kill':    this.tone(460, 0.18, 'sawtooth', 0.2, 90); this.noise(0.14, 0.15, 900); break;
      case 'damage':  this.tone(150, 0.35, 'sawtooth', 0.3, 55); this.noise(0.25, 0.22, 350); break;
      case 'pickup':  this.tone(720, 0.06, 'triangle', 0.13); setTimeout(() => this.tone(1080, 0.08, 'triangle', 0.13), 45); break;
      case 'potion':  this.tone(523, 0.09, 'triangle', 0.22); setTimeout(() => this.tone(659, 0.09, 'triangle', 0.22), 70); setTimeout(() => this.tone(784, 0.15, 'triangle', 0.22), 140); break;
      case 'levelup': this.tone(523, 0.1, 'sine', 0.22); setTimeout(() => this.tone(784, 0.12, 'sine', 0.22), 90); break;
      case 'pick':    this.tone(880, 0.08, 'triangle', 0.25); setTimeout(() => this.tone(1320, 0.15, 'triangle', 0.25), 80); break;
      case 'cardpop': this.tone(660, 0.05, 'sine', 0.15); setTimeout(() => this.tone(990, 0.1, 'sine', 0.15), 60); break;
      case 'enemyshoot': this.tone(400, 0.08, 'sawtooth', 0.15, 200); break;
      case 'shieldblock': this.tone(700, 0.06, 'sine', 0.18, 500); break;
      case 'shieldbreak': this.tone(300, 0.25, 'sawtooth', 0.25, 100); this.noise(0.15, 0.15, 800); break;
      case 'explode': this.tone(120, 0.4, 'sawtooth', 0.35, 40); this.noise(0.3, 0.3, 400); break;
      case 'teleport': this.tone(600, 0.15, 'sine', 0.18, 1200); break;
      case 'dash':    this.tone(200, 0.3, 'sawtooth', 0.25, 80); break;
      case 'laser':   this.tone(1400, 0.6, 'sawtooth', 0.20, 200); this.noise(0.4, 0.2, 2000); break;
      case 'lasercharge': this.tone(600, 0.3, 'sine', 0.10, 1800); break;
      case 'lightning': this.tone(80, 0.3, 'sawtooth', 0.35, 30); this.noise(0.2, 0.3, 600); break;
      case 'bossroar': this.tone(90, 0.8, 'sawtooth', 0.4, 30); this.noise(0.6, 0.35, 300); break;
      case 'bossdie': this.tone(120, 1.2, 'sawtooth', 0.4, 20); this.noise(0.8, 0.4, 250); break;
      case 'regen':   this.tone(660, 0.15, 'sine', 0.2); setTimeout(() => this.tone(880, 0.2, 'sine', 0.2), 100); break;
      case 'blink':   this.tone(1200, 0.15, 'sine', 0.25, 2400); setTimeout(() => this.tone(1800, 0.2, 'sine', 0.2, 800), 100); break;
      case 'inventory': this.tone(500, 0.08, 'triangle', 0.15); setTimeout(() => this.tone(700, 0.08, 'triangle', 0.15), 60); break;
      case 'dashplayer': this.tone(300, 0.2, 'sawtooth', 0.3, 600); this.noise(0.15, 0.2, 1200); break;
      case 'thunderrain': this.tone(60, 0.5, 'sawtooth', 0.4, 30); this.noise(0.4, 0.35, 500); break;
    }
  }
};


// Each score uses the audio clock for the attack and its overtones, even at low frame rates.
const BOSS_SCORES={
  wormZig:{notes:[[310,.12,'triangle',.18,860],[840,.14,'triangle',.14,290,.13],[340,.18,'triangle',.13,910,.27]],noise:[.18,.10,3300,850]},
  wormAim:{notes:[[240,.19,'triangle',.16,510],[480,.14,'sine',.10,730,.07]]},
  wormRush:{notes:[[160,.21,'sawtooth',.12,43]],noise:[.24,.23,4600,320]},
  wormLane:{notes:[[760,.09,'sine',.15,890],[980,.14,'triangle',.13,1150,.15]]},
  wormCut:{notes:[[1500,.14,'triangle',.16,190],[145,.23,'sine',.19,45,.04]],noise:[.22,.28,8200,660]},
  wormFrenzy:{notes:[[95,.36,'sawtooth',.18,240],[380,.22,'triangle',.15,130,.20]],noise:[.33,.14,600,3000]},
  wormRest:{notes:[[270,.34,'triangle',.15,65]],noise:[.32,.11,1450,200]},
  wormBreak:{notes:[[660,.12,'triangle',.12,180]],noise:[.13,.22,5000,650]},
  massPull:{notes:[[48,1.4,'sine',.26,102],[74,1.18,'triangle',.12,187,.12]],noise:[.58,.14,300,2200]},
  massHold:{notes:[[122,.41,'triangle',.19,530],[171,.42,'sine',.11,680]]},
  massEject:{notes:[[180,.4,'sine',.33,30],[680,.18,'triangle',.14,100]],noise:[.32,.26,4200,200]},
  voidBlink:{notes:[[850,.11,'sine',.19,110],[120,.15,'triangle',.17,1040,.07]]},
  voidBeam:{notes:[[71,.34,'sawtooth',.16,40],[350,.25,'triangle',.16,92]],noise:[.30,.19,4200,1200]},
  solarCharge:{notes:[[540,.48,'sine',.10,1270],[820,.36,'triangle',.07,1650,.12]]},
  solarStrike:{notes:[[930,.13,'triangle',.17,226],[120,.29,'sine',.23,38]],noise:[.22,.22,5500,420]},
  orbitRise:{notes:[[220,.38,'sine',.16,270],[330,.38,'sine',.14,408,.10],[495,.48,'sine',.12,600,.20]]},
  lunarAim:{notes:[[440,.27,'sine',.14],[554,.26,'sine',.12,0,.12],[659,.33,'sine',.12,0,.24]]},
  lunarVolley:{notes:[[980,.17,'triangle',.16,390],[820,.19,'triangle',.12,270,.09]],noise:[.16,.10,2900,760]},
  voidWell:{notes:[[146,.58,'triangle',.14,58],[221,.45,'sine',.12,69,.09]]},
  starCollapse:{notes:[[52,1.75,'sine',.30,122],[86,1.42,'sawtooth',.10,238,.18]],noise:[.78,.16,180,2900]},
  wellFuse:{notes:[[90,.4,'triangle',.17,690]]},
  wellBurst:{notes:[[185,.38,'sine',.28,32]],noise:[.24,.17,4800,350]},
  beamCharge:{notes:[[120,.42,'triangle',.1,980],[210,.38,'sine',.08,1350]]},
  beamDecay:{notes:[[800,.18,'triangle',.12,85]],noise:[.14,.11,4800,260]},
  starNova:{notes:[[210,.75,'sine',.31,24],[880,.47,'triangle',.14,170]],noise:[.66,.32,7500,220]}
};
function bossCue(name,origin){
  state.bossCues.push({id:++state.bossCueId,name,time:state.time,x:origin.x,y:origin.y});
  if(state.bossCues.length>32)state.bossCues.shift();
}
let lastBossSound=0,lastBossFrame=-1;
function presentBossCues(){
  if(state.time<lastBossFrame || state.bossCueId<lastBossSound)lastBossSound=0;
  lastBossFrame=state.time;
  for(const cue of state.bossCues||[]){
    if(cue.id<=lastBossSound)continue;
    lastBossSound=cue.id;
    if(state.time-cue.time<.35)Sfx.play(cue.name,100);
  }
}
for(const [i,name] of ['omega','omegaFire','nullArc','starTide','resNet','resonance','chain','reaction','tide','crush','crushBeat','army','anchor','anchorBeat','needles','needlesBeat'].entries()){
  const f=170+43*i;BOSS_SCORES[name]={notes:[[f,.18,'triangle',.13,f*1.6],[f*.66,.25,'sine',.11,f*.36,.06]]};
}
// Each boss has a timbre, and each attack has a different pitch contour and beat length.
for(const [family,moves,base,wave] of [
  ['beacon',['tracking','curtain','sweep','refraction','emitters','fusion','overload'],155,'sawtooth'],
  ['twins',['link','exchange','pulses','pincer','binary','positiveStorm','negativeStorm','absorb'],330,'triangle'],
  ['heart',['pistons','turret','transmission','discharge','shock','rebuild','machineCycle','leak'],118,'square'],
  ['monolith',['stomp','wall','avalanche','impact','rhythm','landing'],74,'triangle'],
  ['fractal',['cuts','lunge','fault','replicas','prison','collapse'],210,'sawtooth'],
  ['clock',['hands','seconds','pendulum','ticks','rewind','zero','chime'],440,'sine'],
  ['crown',['garden','petals','dance','stars','inverse','rain','flower'],580,'triangle']
]){
  moves.forEach((name,i)=>{
    const hz=base*2**(i/9);
    BOSS_SCORES[name+'Charge']={notes:[[hz*.55,.34,wave,.10,hz],[hz,.16,'sine',.10,hz*1.25,.16]]};
    BOSS_SCORES[name+'Beat']={notes:[[hz,.08,wave,.14,hz*.64],[hz*.5,.18,'sine',.12,hz*.24,.025]]};
    BOSS_SCORES[name+'End']={notes:[[hz,.20,'triangle',.10,hz*.3]]};
  });
  BOSS_SCORES[family+'FinalBeat']={notes:[[base*1.5,.28,wave,.15,base*.7],[base*.5,.35,'sine',.17,base*.25]]};
  BOSS_SCORES[family+'Phase']={notes:[[base*.35,.42,wave,.16,base],[base*1.5,.3,'sine',.12,base*2,.28]]};
  BOSS_SCORES[family+'Omen']={notes:[[base,.10,wave,.10,base*.8]]};
  BOSS_SCORES[family+'Release']={notes:[[base,.65,'sine',.19,base*.35],[base*2,.4,'triangle',.09,base,.08]]};
  BOSS_SCORES[family+'Death']={notes:[[base,.8,wave,.14,base*.16],[base*1.5,.9,'sine',.13,base*.3,1.1]],noise:[.55,.14,3200,300]};
}

BOSS_SCORES.clockRelease={notes:[[440,2.1,'sine',.22,419],[883,1.65,'sine',.12,848],[1217,1.2,'triangle',.07,1078]],noise:[.26,.06,1800,260]};

BOSS_SCORES.pendulumBeat={notes:[[775,.075,'triangle',.13,385],[235,.16,'sine',.13,88]],noise:[.09,.08,3600,620]};
BOSS_SCORES.rewindBeat={notes:[[180,.16,'triangle',.12,920],[610,.28,'sine',.12,170,.06]]};
BOSS_SCORES.zeroBeat={notes:[[294,.18,'sine',.12,280],[588,.10,'triangle',.07,490,.04]]};
BOSS_SCORES.fusionBeat={notes:[[82,.83,'sawtooth',.13,46],[160,.75,'sine',.23,32]],noise:[.64,.18,5700,550]};
BOSS_SCORES.stompBeat={notes:[[91,.36,'sine',.3,28],[165,.1,'square',.055,62]],noise:[.22,.18,1850,180]};
BOSS_SCORES.rhythmBeat={notes:[[120,.22,'triangle',.2,34]],noise:[.13,.17,2500,180]};
BOSS_SCORES.refractionBeat={notes:[[690,.19,'sine',.13,250],[1030,.24,'triangle',.095,600,.07],[1360,.21,'sine',.09,620,.13]]};
BOSS_SCORES.binaryBeat={notes:[[330,.16,'triangle',.16,440],[495,.20,'sine',.13,370,.05]]};
BOSS_SCORES.heartRelease={notes:[[72,.85,'sine',.29,25],[148,.38,'sawtooth',.11,38]],noise:[.62,.2,3200,210]};
BOSS_SCORES.monolithRelease={notes:[[83,.9,'triangle',.22,23],[47,1.2,'sine',.24,26]],noise:[.65,.17,1600,180]};

for(let i=0;i<4;i++){
  const pitch=410*2**(i/5);
  BOSS_SCORES['emitter'+i]={notes:[[pitch,.11,'triangle',.14,pitch*1.35],[pitch*1.5,.16,'sine',.12,pitch*.52,.045]]};
}
