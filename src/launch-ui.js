'use strict';
function actNumeral(number){
  let result='';
  for(const [unit,glyph] of [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']]){
    while(number>=unit){result+=glyph;number-=unit;}
  }
  return result;
}
const ACTS=[{number:1,title:'Lanzamiento',version:'1.0.0',date:'2026-11-28',
  heading:'El último cuadrado libre',
  description:'La guerra contra la Nación Círculo dejó un solo cuadrado libre. Sobrevive a sus ejércitos y aprende el ritmo de sus dieciséis jefes.',
  changes:['Siete cartas normales y cuatro especiales amplían el arsenal.','Desafío diario, Duelo de jefes y Persecución infinita llegan a Extras.',
    'Salas con anfitrión y confirmación de impactos en multijugador.','Tres niveles de Bot Play, controles de audio y efectos, y pausa local.']}];
const GUIDE=[
 ['↔','Movimiento','WASD o flechas. En móvil, mueve el joystick izquierdo.'],
 ['◎','Apuntar y disparar','Mantén el botón principal o mueve el joystick derecho. Con Rayo Láser, suelta para disparar.'],
 ['▣','Inventario y cartas','Pulsa E o Inventario. Las cartas normales se aplican al elegirlas. Asigna las especiales a una de las cinco ranuras.'],
 ['»','Dash y habilidades','Usa las teclas 1–5 o toca la ranura. Dash sale hacia tu puntero y consume una carga.'],
 ['◇','Experiencia y reliquias','Recoge orbes para subir de nivel. Cada reliquia de jefe también te deja elegir una carta entre tres.'],
 ['◌','Cancelación','Tus balas desgastan las enemigas. Una bala grande puede necesitar varios impactos pequeños.'],
 ['◈','Encuentros','Los avisos anticipan cada patrón. Tras los jefes individuales llegan duplas, tríos y grupos mayores.'],
 ['±','Vista y pausa','En móvil, + y − cambian el zoom. P abre el menú de partida. En línea el mundo sigue avanzando.']
];

const prefs=readLocal('preferences',{});
for(const k of Object.keys(visualPrefs))if(Number.isFinite(prefs[k]))visualPrefs[k]=clamp(prefs[k],0,1);
let launchDialog=false;
let activity=null;
function checkpointActivity(force=false){
  if(!activity||playMode==='menu'||state.waiting)return;
  if(!force&&state.time-activity.time<10&&!state.over)return;
  const stats=readLocal('stats',{}),count=k=>Number.isFinite(stats[k])?stats[k]:0;
  stats.sessions=count('sessions')+Number(!activity.started);activity.started=true;
  stats.time=count('time')+Math.max(0,state.time-activity.time);activity.time=state.time;
  const defeats=state.totalDefeats||0;
  stats.bosses=count('bosses')+Math.max(0,defeats-activity.defeats);activity.defeats=defeats;
  stats.level=Math.max(count('level'),state.level);stats.round=Math.max(count('round'),state.rush?.round||0);
  stats.wave=Math.max(count('wave'),state.extra?.cleared||0);stats.distance=Math.max(count('distance'),state.extra?.distance||0);
  writeLocal('stats',stats);if(state.over)activity=null;
}
function startActivity(){activity={started:false,time:0,defeats:0};}
function setupLaunchUI(){
  const el=id=>document.getElementById(id),dialog=el('launchDialog'),body=el('launchBody');
  let index=ACTS.length-1;
  function board(mark=false){
    const act=ACTS[index];if(mark)writeLocal('lastAct',Math.max(Number(readLocal('lastAct',0))||0,act.number));
    el('newAct').hidden=(readLocal('lastAct',0)||0)>=ACTS.at(-1).number;
    el('actName').textContent='ACTO '+actNumeral(act.number)+' — '+act.title.toUpperCase();
    el('actVersion').textContent='VERSIÓN '+act.version+(act.date?' · '+act.date:'');
    el('actHeading').textContent=act.heading;el('actIntro').textContent=act.description;
    el('actPrev').hidden=index===0;el('actNext').hidden=index===ACTS.length-1;
  }
  const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
  function button(text,fn){const b=node('button',text);b.onclick=fn;body.append(b);}
  function open(page){
    mouse.down=false;touchMove.x=touchMove.y=0;for(const k in keys)keys[k]=false;
    launchDialog=true;if(!dialog.open)dialog.showModal();body.replaceChildren();el('launchTitle').textContent=page;
    if(page==='Menú de partida'){
      button('Continuar',()=>dialog.close());button('Cómo jugar',()=>open('Cómo jugar'));button('Audio y efectos',()=>open('Audio y efectos'));
      button('Salir al menú',()=>{dialog.close();el('exit').click();});
    }else if(page==='Cómo jugar'){
      for(const [symbol,title,text] of GUIDE){const row=node('article','');row.className='guideRow';row.append(node('i',symbol),node('strong',title),node('p',text));body.append(row);}
    }else if(page==='Audio y efectos'){
      for(const [k,label] of Object.entries({volume:'Volumen general',effects:'Efectos sonoros',shake:'Sacudidas de cámara',flash:'Destellos de pantalla',particles:'Partículas decorativas'})){
        const box=node('label',label),slider=node('input','');slider.type='range';slider.min=0;slider.max=100;slider.value=visualPrefs[k]*100;box.append(slider);body.append(box);
        slider.oninput=()=>{visualPrefs[k]=Number(slider.value)/100;writeLocal('preferences',visualPrefs);if(Sfx.master)Sfx.master.gain.value=.5*visualPrefs.volume*visualPrefs.effects;};
      }
    }else if(page==='Estadísticas'){
      const stats=readLocal('stats',{});for(const [k,name] of Object.entries({sessions:'Partidas',time:'Tiempo jugado',level:'Mayor nivel',bosses:'Jefes derrotados',round:'Ronda de Boss Rush',wave:'Oleada superada',distance:'Distancia récord'})){
        body.append(node('p',name+' · '+(k==='time'?clockText(stats[k]||0):stats[k]||0)));
      }
    }else if(page==='Créditos'){body.append(node('p','Un proyecto de Ekarealoficial, construido con JavaScript, Canvas 2D, Web Audio, Node.js y WebSocket.'),node('p','Gracias a quienes ponen a prueba las peleas. La coreografía geométrica toma inspiración de Just Shapes & Beats, Geometry Dash, Terraria, Hollow Knight, Touhou y The Binding of Isaac.'));}
    else {const act=ACTS[index];body.append(node('h3',act.heading),node('p',act.description));const list=node('ul','');for(const change of act.changes)list.append(node('li',change));body.append(list);}
    if(playMode!=='menu'&&page!=='Menú de partida')button('Volver al menú de partida',()=>open('Menú de partida'));
  }
  board();el('actRead').onclick=()=>{board(true);open(el('actName').textContent);};
  el('actPrev').onclick=()=>{index--;board(true);};el('actNext').onclick=()=>{index++;board(true);};
  for(const b of document.querySelectorAll('[data-launch]'))b.onclick=()=>open(b.dataset.launch);
  el('launchClose').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{launchDialog=false;});
  window.addEventListener('keydown',e=>{if(playMode!=='menu'&&!state.over&&e.key.toLowerCase()==='p'&&!e.repeat&&!sandboxTab){
    e.preventDefault();if(dialog.open)dialog.close();else open('Menú de partida');
  }});
  window.addEventListener('pagehide',()=>checkpointActivity(true));
}
window.addEventListener('DOMContentLoaded',setupLaunchUI);
