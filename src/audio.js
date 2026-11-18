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
  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
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
  noise(dur, vol, cutoff) {
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
    f.type = 'lowpass'; f.frequency.value = cutoff || 1000;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  },
  play(name, throttle) {
    if (!this.ctx) return;
    const now = performance.now();
    if (throttle && this.last[name] && now - this.last[name] < throttle) return;
    this.last[name] = now;
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

