'use strict';
// A move belongs to exactly one phase of its encounter. The laboratory and the
// encounter director read the same catalogue.
const ENCORE = {
  dawn: {name:'La Madre del Alba',color:'#ffda83',size:150,limits:[.70,.40,.15],final:8,
    moves:[['needles','loom','suns','silkRain'],['silkPrison','halos','descent'],['eclipse','threads'],[]],
    duets:[['needles','silkRain','suns'],['loom','suns','halos'],['descent','loom','silkRain'],['silkPrison','suns'],['eclipse','threads','silkRain']]},
  prism:{name:'Emperatriz Prismática',color:'#ff93e3',size:120,limits:[.55],final:7,
    moves:[['comets','swords','imperialFlower','pursuit'],['rainbow','judgment','waltz']],
    duets:[['comets','swords','imperialFlower'],['pursuit','imperialFlower'],['waltz','rainbow','swords'],['judgment','comets']]},
  sovereign:{name:'Gran Invocador',color:'#c887ff',size:158,limits:[.60,.30],final:7,
    moves:[['army','portals','sacrifice','huntOrder'],['generals','obedience','siegeCall'],['legion','lastSacrifice']],
    duets:[['army','huntOrder'],['portals','sacrifice'],['generals','obedience','portals'],['siegeCall','huntOrder'],['legion','lastSacrifice','obedience']]},
  channel:{name:'CANAL CERO · El presentador',color:'#ff5a74',size:174,limits:[.60,.25],final:7,
    moves:[['cameras','flashShow','ads','replay'],['splitScreen','paparazzi','censor'],['broadcast','signalDrop']],
    duets:[['cameras','ads','replay'],['flashShow','replay'],['splitScreen','flashShow'],['paparazzi','censor'],['broadcast','signalDrop','replay']]},
  general:{name:'La Última Orden',color:'#ff6665',size:168,limits:[.75,.45,.15],final:8,
    moves:[['formation','bombard','march'],['chains','siegeMemory','counter'],['protocol','absoluteOrder','echoes'],[]],
    duets:[['formation','bombard','march'],['chains','siegeMemory','bombard'],['counter','march'],['protocol','echoes','bombard'],['absoluteOrder','siegeMemory','march']]},
  frontier:{name:'La Frontera Voraz',color:'#ff774e',size:166,limits:[.50],final:8.6,
    moves:[['jaws','grind','quakes','bulldoze'],['rubble','gates','chaseLasers','headfall','trains','terminal']],
    duets:[['jaws','grind'],['bulldoze','quakes'],['gates','rubble','headfall'],['chaseLasers','trains'],['terminal','rubble','trains']]}
};
const ENCORE_MOVES={
  needles:'Agujas del amanecer',loom:'Telar celestial',suns:'Soles suspendidos',silkRain:'Lluvia de seda',silkPrison:'Prisión de seda',halos:'Coronas del amanecer',descent:'Descenso celestial',eclipse:'Eclipse total',threads:'Mil hilos',
  comets:'Danza de cometas',swords:'Espadas prismáticas',imperialFlower:'Flor imperial',pursuit:'Persecución celestial',rainbow:'Arcoíris de exterminio',judgment:'Juicio de la Emperatriz',waltz:'Último vals',
  army:'Ejército circular',portals:'Portales del asedio',sacrifice:'Sacrificio circular',huntOrder:'Mandato de persecución',generals:'Generales del vacío',obedience:'Círculo de obediencia',siegeCall:'Llamado desesperado',legion:'Legión absoluta',lastSacrifice:'Último sacrificio',
  cameras:'Cámaras indiscretas',flashShow:'Flash de audiencia',ads:'Publicidad invasiva',replay:'Repetición vergonzosa',splitScreen:'Pantalla dividida',paparazzi:'Acoso mediático',censor:'Censura',broadcast:'Última transmisión',signalDrop:'Caída de señal',
  formation:'Formación de exterminio',bombard:'Bombardeo del frente',march:'Marcha de guerra',chains:'Cadenas de obediencia',siegeMemory:'Recuerdos del asedio',counter:'Contraofensiva',protocol:'Protocolo de exterminio',absoluteOrder:'Orden absoluta',echoes:'Memoria fragmentada',
  jaws:'Mandíbulas mecánicas',grind:'Trituración circular',quakes:'Golpes de frontera',bulldoze:'Avance destructor',rubble:'Cañón de escombros',gates:'Puertas del pánico',chaseLasers:'Láseres de persecución',headfall:'Alud frontal',trains:'Trenes circulares',terminal:'Aceleración terminal',
  zero:'Hora Cero · Perímetro',zeroClassic:'Hora Cero · Esfera original',edgeTicks:'Agujas de borde'
};
const PRISM_COLORS=['#ff87db','#71ffff','#b39aff','#ffec84','#82ffb6','#8eb1ff'];
const BIG_PATTERNS=['needles','loom','descent','eclipse','threads','rainbow','swords','judgment','splitScreen','broadcast','protocol','absoluteOrder','formation','jaws','gates','terminal','zeroClassic'];
Object.assign(ENCOUNTER_SPECS,ENCORE);Object.assign(PATTERN_BOSSES,ENCORE);Object.assign(MOVE_NAMES,ENCORE_MOVES);
for(const k of Object.keys(ENCORE)){FINAL_TIME[k]=ENCORE[k].final;PAIRINGS[k]=ENCORE[k].duets;}
for(const m of BIG_PATTERNS)HEAVY_MOVES.add(m);
PATTERN_BOSSES.clock.moves[2].push('zeroClassic');
SCORED_MOVES.add('zeroClassic');
PAIRINGS.beacon=[['sweep','emitters','curtain','tracking'],['tracking','curtain'],['refraction','emitters'],['curtain','fusion','emitters']];
PAIRINGS.heart=[['pistons','turret','shock'],['transmission','shock','turret'],['machineCycle','discharge'],['leak','transmission','turret'],['rebuild','discharge']];
PAIRINGS.clock.push(['pendulum','edgeTicks'],['rewind','seconds','edgeTicks'],['zeroClassic','edgeTicks']);
PAIRINGS.worm=[['rush','zigzag'],['lanes','rush']];

// The same cue names travel over the wire; each browser synthesizes the voice.
const SIGNATURE_VOICES={
  dawn:[780,'sine',1.5],prism:[635,'triangle',1.88],sovereign:[175,'triangle',.67],
  channel:[302,'square',1.32],general:[106,'sawtooth',.75],frontier:[74,'triangle',.5]
};
for(const [kind,[hz,voice,fifth]] of Object.entries(SIGNATURE_VOICES)){
  const spec=ENCORE[kind];
  for(const [i,move] of spec.moves.flat().entries()){
    const f=hz*2**((i%6)/12);
    BOSS_SCORES[move+'Charge']={notes:[[f*.51,.26,voice,.09,f],[f*fifth,.17,'sine',.10,f*1.12,.12]]};
    BOSS_SCORES[move+'Beat']={notes:[[f,.12,voice,.11,f*fifth],[f*.54,.17,'sine',.13,f*.27,.03]]};
    BOSS_SCORES[move+'End']={notes:[[f,.2,'sine',.09,f*.49]]};
  }
  BOSS_SCORES[kind+'Phase']={notes:[[hz,.53,voice,.14,hz*.35],[hz*fifth,.38,'sine',.13,hz*2,.25]]};
  BOSS_SCORES[kind+'Omen']={notes:[[hz*.7,.25,voice,.09,hz*fifth]]};
  BOSS_SCORES[kind+'FinalBeat']={notes:[[hz*.66,.27,voice,.12,hz*.36]]};
  BOSS_SCORES[kind+'Release']={notes:[[hz,.78,voice,.17,hz*.26],[hz*fifth,.85,'sine',.14,hz*.12,.17]],noise:[.38,.13,4200,210]};
  BOSS_SCORES[kind+'Death']=BOSS_SCORES[kind+'Phase'];
}
BOSS_SCORES.loomCharge={notes:[[980,.46,'sine',.13,540],[1102,.25,'triangle',.08,650,.16]]};
BOSS_SCORES.signalDropCharge={noise:[.24,.13,6100,820],notes:[[180,.10,'square',.10,980]]};
for(const suffix of ['Charge','Beat','End'])BOSS_SCORES['zeroClassic'+suffix]=BOSS_SCORES['zero'+suffix];
