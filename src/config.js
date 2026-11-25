'use strict';
let playMode = 'menu';
let rules = { difficulty: 1, xp: 1, disabled: [], color: '#4df3ff' };
const BOSS_NAMES = Object.freeze({boss:'Gran Malabarista',worm:'Gusano Esmeralda',singular:'Círculo Singular',fractal:'Cuadrado Fractal',clock:'Reloj Roto',crown:'Corona Vacía',beacon:'Faro de Aniquilación',twins:'Gemelos de Polaridad',heart:'Corazón Mecánico',monolith:'Monolito Sísmico',dawn:'La Madre del Alba',prism:'Emperatriz Prismática',sovereign:'Gran Invocador',channel:'CANAL CERO',general:'La Última Orden',frontier:'La Frontera Voraz'});
// Relative execution difficulty: overlapping patterns, moving gaps and phase mechanics.
const BOSS_DIFFICULTY = Object.freeze({
  boss:1, monolith:1.5, fractal:2, twins:2.5, clock:3, heart:3,
  worm:3.5, beacon:4, crown:4.5, singular:4.5,
  sovereign:5, general:5, channel:5.5, dawn:5.5, prism:6, frontier:6
});
const BALANCE = Object.freeze({ bossHp: 1200, bossGrowth: 1.25, ballDamage: 0.5, cellSize: 180 });
const initialSeed = Number(new URLSearchParams(location.search).get('seed') ?? 123456789) >>> 0;
let randomState = initialSeed;
function gameRandom() {
  randomState = (randomState + 0x6D2B79F5) >>> 0;
  let t=randomState;
  t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;
}
const gameRand=(a,b)=>a+gameRandom()*(b-a);
