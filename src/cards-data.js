'use strict';
const CHUNK_SIZE = 800;
const START_HALF_HEARTS = 8;
const START_MAGNET = 200;
const MAX_BULLETS = 200;
const BOSS_FIRST_TIME = 150;

/* =============== CARTAS =============== */
const CARD_TYPES = [
  ...[['vampirism','Vampirismo','½ ❤ cada 16 − N bajas. Cada 16 copias, reinicia el ciclo y cura ½ ❤ más.','#ff608a'],
      ['explosive','Balas explosivas','15% de explotar al impactar e infligir daño de área. Cada copia multiplica la probabilidad por 1,5.','#ff9c52'],
      ['frost','Congelación','Los impactos ralentizan durante 2 s. Cada copia añade 10 puntos de ralentización.','#85eaff'],
      ['critical','Golpe crítico','10% de daño doble. Cada copia añade 5 puntos. Al llegar a 100%, vuelve a 10% y aumenta el multiplicador.','#ffd95d'],
      ['armor','Armadura','10% de ignorar un golpe. Cada copia multiplica la probabilidad por 1,5.','#99baff'],
      ['fury','Furia','Por copia, cada 10% de vida perdida añade un 5% de daño.','#ff6868'],
      ['gravity','Singularidad','Atrae enemigos cada 7 s y estalla. Cada copia amplía el radio y el daño.','#b787ff'],
      ['venom','Veneno','Las balas envenenan. Cada copia aumenta el daño y la duración.','#8eff63'],
      ['swords','Espada Espectral','Añade una espada orbital que hiere al contacto.','#bbeaff']]
    .map(([id,name,desc,color])=>({id,name,desc,color,apply:p=>{p[id]=(p[id]||0)+1;}})),
  { id: 'fire',          name: 'Cadencia',       desc: 'Reduce el tiempo entre disparos un 15%.',                    color: '#4df3ff' },
  { id: 'multi',         name: 'Multidisparo',   desc: 'Añade una línea de disparo adicional.',                       color: '#ffc857' },
  { id: 'health',        name: 'Vitalidad',      desc: 'Aumenta vida máxima en medio corazón y te cura medio.',       color: '#ff3b6b' },
  { id: 'speed',         name: 'Agilidad',       desc: 'Aumenta tu velocidad un 10%.',                                color: '#8fff9e' },
  { id: 'back',          name: 'Retroceso',      desc: 'Dispara también hacia atrás. Acumulable.',                    color: '#c77dff' },
  { id: 'drone1',        name: 'Dron Básico',    desc: 'Añade un dron con 1 línea de disparo.',                       color: '#4dff88' },
  { id: 'drone2',        name: 'Dron Doble',     desc: 'Añade un dron con 2 líneas de disparo.',                      color: '#7dffb0' },
  { id: 'drone3',        name: 'Dron Triple',    desc: 'Añade un dron con 3 líneas de disparo.',                      color: '#a8ffcf' },
  { id: 'magnet',        name: 'Imán de XP',     desc: 'Aumenta el radio de atracción de orbes.',                     color: '#b0d4ff' },
  { id: 'shield',        name: 'Escudo',         desc: 'Añade un escudo orbital que bloquea balas.',                  color: '#4df3ff' },
  { id: 'bounce',        name: 'Rebote',         desc: 'Tus balas rebotan una vez más.',                              color: '#fbbf24' },
  { id: 'homing',        name: 'Teledirigido',   desc: '+30% de probabilidad de balas teledirigidas.',                color: '#a855f7' },
  { id: 'dupli',         name: 'Duplibala',      desc: '10% de balas que rebotan y se duplican. Acumulable.',         color: '#ff4dd2' },
  { id: 'size',          name: 'Tamaño',         desc: 'Aumenta el tamaño y daño de tus balas.',                     color: '#f59e0b' },
  { id: 'dart',          name: 'Dardos',         desc: 'Añade un dardo aliado que persigue enemigos.',                color: '#fcd34d' },
  { id: 'explosiveDart', name: 'Dardo Explosivo',desc: 'Añade un dardo que explota al impactar.',                     color: '#fb7185' },
  { id: 'rayolaser',     name: 'Rayo Láser',     desc: 'Mantén clic para cargar y suelta para disparar un rayo giratorio.', color: '#ff3366' },
  { id: 'lightning',     name: 'Rayo',           desc: 'Rayos caen periódicamente sobre enemigos.',                   color: '#fde047' },
  { id: 'regen',         name: 'Regeneración',   desc: 'Recupera medio corazón cada 50s. Acumulable: -1s al intervalo.', color: '#4ade80' },
  { id: 'greed',         name: 'Codicia',        desc: '15% de probabilidad de soltar XP extra al matar. Acumulable.', color: '#fbbf24' }
];
const KAME_DPS=285;
const expansionCards=[
  ['kame','Kamekameka','Rayo de '+KAME_DPS+' de daño/s durante 0,45 s. Cada copia añade una carga.',24,'#53dfff'],
  ['activeHeal','Regeneración activa','Cura 1 ❤ y +½ por copia. Con vida llena otorga corazones azules.',32,'#68b4ff'],
  ['reverse','Inversión','Convierte proyectiles en aliados guiados y dardos en explosivos. +1 carga por copia.',28,'#ff76ec'],
  ['plasma','Barrera de plasma','Durante 6 s repele enemigos y balas. Cada copia aumenta radio y daño.',36,'#86ffaf'],
  ['timeBreak','Tiempo roto','Detiene el combate 3 s. Cada copia añade 1 s.',48,'#ffe384']
];
const SPECIAL_CARDS = [
  ...expansionCards.map(([id,name,desc,cd,color])=>({id,name,color,desc:desc+' Recarga '+cd+' s.',apply:()=>{
    const sc=state.specialCards[id];sc.totalCards++;
    if(sc.totalCards===1 || id==='kame' || id==='reverse'){sc.maxCharges++;sc.charges++;}
  }})),
  {id:'frames',name:'Velocista a fotogramas',desc:'Velocidad ×4 e inmunidad durante 10 s. 34 de daño/s al contacto. Cada copia añade 2 s y 5 de daño/s. Recarga: 55 s.',color:'#ff78db',apply:()=>{const sc=state.specialCards.frames;sc.totalCards++;sc.maxCharges++;sc.charges++;}},
  { id: 'blink',       name: 'Distorsión',   desc: 'Cada 35s teletranspórtate al puntero. Asigna a un slot.',   color: '#a855f7' },
  { id: 'dash',        name: 'Dash',         desc: 'Dash rápido hacia el puntero. Cargas = número de cartas.',  color: '#22d3ee' },
  { id: 'thunderRain', name: 'Lluvia Truenos',desc: 'Rayos caen sobre todos los enemigos en pantalla. 3s base.', color: '#fbbf24' }
];

// One source of truth for bounded stat upgrades and their displayed limits.
const CARD_UPGRADES = {
 fire: {field:'fireCdBase',factor:0.85,label:'Intervalo entre disparos',unit:'s'},
 multi: {field:'shots',add:1,label:'Líneas frontales'},
 speed: {field:'speed',factor:1.10,label:'Velocidad'},
 back: {field:'backShots',add:1,label:'Disparos traseros'},
 magnet: {field:'magnetRange',root:true,add:80,label:'Radio de atracción'},
 bounce: {field:'bounces',add:1,label:'Rebotes'},
 homing: {field:'homingChance',add:0.30,label:'Probabilidad de guiado'},
 size: {field:'sizeLevel',add:1,label:'Nivel de tamaño'},
 rayolaser: {field:'laserCount',add:1,label:'Rayos láser'},
 lightning: {field:'lightningCount',add:1,label:'Rayos periódicos'},
 greed: {field:'greedLevel',add:1,label:'Nivel de codicia'}
};
function configureCardUpgrades() {
 for(const card of CARD_TYPES) {
   const spec=CARD_UPGRADES[card.id];
   if(!spec) continue;
   card.upgrade=spec;
   card.apply=p=>{
     const target=spec.root?state:p;
     target[spec.field]=target[spec.field]*(spec.factor||1)+(spec.add||0);
   };
 }
}


// Effects and metadata share the same registry.
[...CARD_TYPES,...SPECIAL_CARDS].find(c=>c.id==='fire').apply = (p,card) => { p.fireCdBase = Math.max(0.08, p.fireCdBase * 0.85);
};
[...CARD_TYPES,...SPECIAL_CARDS].find(c=>c.id==='multi').apply = (p,card) => { p.shots = p.shots + 1;
};
[...CARD_TYPES,...SPECIAL_CARDS].find(c=>c.id==='health').apply = (p,card) => {
      state.maxHalfHearts = state.maxHalfHearts + 1;
      state.halfHearts = Math.min(state.maxHalfHearts, state.halfHearts + 1);

};
[...CARD_TYPES,...SPECIAL_CARDS].find(c=>c.id==='speed').apply = (p,card) => { p.speed = Math.min(520, p.speed * 1.10);
};
[...CARD_TYPES,...SPECIAL_CARDS].find(c=>c.id==='back').apply = (p,card) => { p.backShots = p.backShots + 1;
};
[...CARD_TYPES,...SPECIAL_CARDS].find(c=>c.id==='drone1').apply = (p,card) => { {
      const lines = card.id === 'drone1' ? 1 : (card.id === 'drone2' ? 2 : 3);
      state.drones.push({ lines, x: p.x, y: p.y, angle: 0, cd: 0.2 + gameRandom() * 0.3, bob: gameRandom() * TAU });

    }
};
[...CARD_TYPES,...SPECIAL_CARDS].find(c=>c.id==='drone2').apply = (p,card) => { {
      const lines = card.id === 'drone1' ? 1 : (card.id === 'drone2' ? 2 : 3);
      state.drones.push({ lines, x: p.x, y: p.y, angle: 0, cd: 0.2 + gameRandom() * 0.3, bob: gameRandom() * TAU });

    }
};
[...CARD_TYPES,...SPECIAL_CARDS].find(c=>c.id==='drone3').apply = (p,card) => { {
      const lines = card.id === 'drone1' ? 1 : (card.id === 'drone2' ? 2 : 3);
      state.drones.push({ lines, x: p.x, y: p.y, angle: 0, cd: 0.2 + gameRandom() * 0.3, bob: gameRandom() * TAU });

    }
};
[...CARD_TYPES,...SPECIAL_CARDS].find(c=>c.id==='magnet').apply = (p,card) => { state.magnetRange = Math.min(800, state.magnetRange + 80);
};
[...CARD_TYPES,...SPECIAL_CARDS].find(c=>c.id==='shield').apply = (p,card) => { state.shields.push({ hp: 4, maxHp: 4, x: p.x, y: p.y, angle: 0 });
};
[...CARD_TYPES,...SPECIAL_CARDS].find(c=>c.id==='bounce').apply = (p,card) => { p.bounces = p.bounces + 1;
};
[...CARD_TYPES,...SPECIAL_CARDS].find(c=>c.id==='homing').apply = (p,card) => { p.homingChance = p.homingChance + 0.30;
};
[...CARD_TYPES,...SPECIAL_CARDS].find(c=>c.id==='dupli').apply = (p,card) => {
      p.dupliCount = p.dupliCount + 1;
      p.dupliChance = Math.min(1, p.dupliCount * 0.10);

};
[...CARD_TYPES,...SPECIAL_CARDS].find(c=>c.id==='size').apply = (p,card) => { p.sizeLevel = p.sizeLevel + 1;
};
[...CARD_TYPES,...SPECIAL_CARDS].find(c=>c.id==='dart').apply = (p,card) => {
      state.darts.push({ type: 'normal', x: p.x, y: p.y, vx: 0, vy: 0, angle: 0, state: 'follow', target: null, bob: gameRandom() * TAU });

};
[...CARD_TYPES,...SPECIAL_CARDS].find(c=>c.id==='explosiveDart').apply = (p,card) => {
      state.darts.push({ type: 'explosive', x: p.x, y: p.y, vx: 0, vy: 0, angle: 0, state: 'follow', target: null, bob: gameRandom() * TAU });

};
[...CARD_TYPES,...SPECIAL_CARDS].find(c=>c.id==='rayolaser').apply = (p,card) => { p.laserCount = p.laserCount + 1;
};
[...CARD_TYPES,...SPECIAL_CARDS].find(c=>c.id==='lightning').apply = (p,card) => { p.lightningCount = p.lightningCount + 1;
};
[...CARD_TYPES,...SPECIAL_CARDS].find(c=>c.id==='regen').apply = (p,card) => { {
      p.regenLevel++;
      const info = getRegenInfo(p.regenLevel);
      p.regenInterval = info.interval;
      p.regenAmount = info.amount;
      if (p.regenTimer <= 0) p.regenTimer = p.regenInterval;

    }
};
[...CARD_TYPES,...SPECIAL_CARDS].find(c=>c.id==='greed').apply = (p,card) => { p.greedLevel = p.greedLevel + 1;
};
[...CARD_TYPES,...SPECIAL_CARDS].find(c=>c.id==='blink').apply = (p,card) => { {
      const sc = state.specialCards.blink;
      sc.totalCards++;
      sc.maxCharges++;
      sc.charges++;

    }
};
[...CARD_TYPES,...SPECIAL_CARDS].find(c=>c.id==='dash').apply = (p,card) => { {
      const sc = state.specialCards.dash;
      sc.totalCards++;
      sc.maxCharges++;
      sc.charges++;

    }
};
[...CARD_TYPES,...SPECIAL_CARDS].find(c=>c.id==='thunderRain').apply = (p,card) => { {
      const sc = state.specialCards.thunderRain;
      sc.totalCards++;
      sc.maxCharges++;
      sc.charges++;

    }
};
