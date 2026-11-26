'use strict';
/* =============== ESTADO =============== */
function newState() {
  return {
    player: {
      x: 0, y: 0, vx: 0, vy: 0,
      size: 30, speed: 320,
      angle: 0, invuln: 0,
      fireCd: 0, fireCdBase: 0.28, shots: 1, backShots: 0,
      bounces: 0, homingChance: 0,
      dupliCount: 0, dupliChance: 0,
      vampirism: 0, vampKills: 0, explosive: 0, frost: 0, critical: 0, armor: 0, fury: 0,
      volley: 0, sizeLevel: 0,
      laserCount: 0,
      lightningCount: 0,
      lightningCd: 5,
      regenLevel: 0,
      regenTimer: 0,
      regenInterval: 50,
      regenAmount: 1,
      greedLevel: 0,
      dashTimer: 0,
      dashAngle: 0,
      pendingDashes: 0
    },
    laserCharging: false,
    laserChargeTime: 0,
    lasersFiring: [],
    drones: [],
    darts: [],
    enemyDarts: [],
    lightningStrikes: [],
    shields: [],
    magnetRange: START_MAGNET,
    cam: { x: 0, y: 0, zoom: 1 },
    bullets: [], enemyBullets: [], enemies: [],
    particles: [], orbs: [], potions: [], floats: [],
    halfHearts: START_HALF_HEARTS,
    maxHalfHearts: START_HALF_HEARTS,
    xp: 0, xpNeeded: 8, level: 1,
    score: 0, kills: 0, time: 0,
    spawnTimer: 1.8, potionTimer: 9,
    shake: 0, flash: 0, flashRGB: '255,60,100',
    over: false, overTimer: 0,
    cardChoices: null, cardRects: null,
    pendingLevelUps: 0, bonusPicks: 0, cardRelics: [], remnants:[], cosmicZones: [], bossCues: [], bossCueId: 0,
    rush:null, extra:null, threat:1, upgrades:0, encounterTiers:null, boss: null, extraBosses: [], completedEncounters:0, unlockTimes:[], firstBossDefeatAt: null, bossActive: false, arena: null,
    bossBombs: [], bossLasers: [], bossLaserActive: false, bossLaserTimer: 0,
    bossSpawnTimer: BOSS_FIRST_TIME, bossCycle: [], nextBossId:0, groupSize:1, encounterRoster:null, bossOmen: null,
    playerDamageMult: 1.0, enemyHpMult: 1.0, spawnRateMult: 1.0,
    recentKills: [], levelTimer: 0, damageTimer: 0, adaptiveCheckTimer: 0,
    inventoryOpen: false,
    inventorySelection: null,
    inventoryCardRects: [],
    inventorySlotRects: [],
    slots: [null, null, null, null, null],
    iceZones:[],stopStarted:0,stopUntil:0,blueHealth:0,
    specialCards: {
      ...Object.fromEntries(expansionCards.map(([id,,,cooldownMax])=>[id,{totalCards:0,maxCharges:0,charges:0,cooldown:0,cooldownMax}])) ,
      frames:{totalCards:0,charges:0,maxCharges:0,cooldown:0,cooldownMax:55},
      blink:       { totalCards: 0, charges: 0, maxCharges: 0, cooldown: 0, cooldownMax: 35 },
      dash:        { totalCards: 0, charges: 0, maxCharges: 0, cooldown: 0, cooldownMax: 18 },
      thunderRain: { totalCards: 0, charges: 0, maxCharges: 0, cooldown: 0, cooldownMax: 45 }
    },
    thunderRain: { active: false, timer: 0, strikeTimer: 0 }
  };
}
let state = newState();
const chunkCache = new Map();
let currentWalls = [];

