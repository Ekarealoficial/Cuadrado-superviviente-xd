'use strict';
function readLocal(key,fallback=null){
  try{
    const value=JSON.parse(localStorage.getItem('cs.'+key));
    if(value==null)return fallback;
    if(fallback!==null&&(typeof value!==typeof fallback||Array.isArray(value)!==Array.isArray(fallback)))return fallback;
    return value;
  }catch{return fallback;}
}
function writeLocal(key,value){try{localStorage.setItem('cs.'+key,JSON.stringify(value));}catch{}}
function applyStartingDeck(){
  for(const id of rules.starters||[]){const card=[...CARD_TYPES,...SPECIAL_CARDS].find(c=>c.id===id);if(card)applyCard(card);}
}
function createLaunchOptions(el){
  const panel=document.createElement('fieldset'),summary=document.createElement('small');
  let mode,fields,form;
  const schema={
    seed:['Semilla opcional','seed'],intensity:['Amenaza inicial',[1,2,3,5]],progression:['Progresión',[1,1.5]],
    bossFrequency:['Frecuencia de jefes',[1,1.5,2]],manualStart:['Esperar al anfitrión',false],lateJoin:['Permitir incorporación tardía',true],
    starters:['Cartas iniciales · partida personalizada','deck'],boss:['Jefe inicial','boss'],wave:['Oleada inicial · personalizada desde la 2',[1,5,10,20,50]],
    duration:['Duración en minutos',[10,5,15]],difficulty:['Ritmo de dificultad',[1,.5,1.5,2,3]],
    chaosPeriod:['Segundos entre cambios',[30,20,45,60]],chaosDuration:['Duración del modificador en segundos',[12,8,16,20]],
    doubleChaos:['Dos modificadores después de tres minutos',false],chaosPool:['Modificadores disponibles','chaos'],
    enemyPool:['Familias de enemigos','enemies'],botSkill:['Nivel de Bot Play',['Normal','Avanzado','Experto']],botVision:['Ver decisiones del bot',false]
  };
  const keysByMode={solo:'seed intensity bossFrequency starters',online:'seed bossFrequency progression manualStart lateJoin',
    sandbox:'seed intensity boss starters',rush:'seed intensity progression botSkill botVision',siege:'seed difficulty wave enemyPool',trial:'seed duration',
    chaos:'seed chaosPeriod chaosDuration chaosPool doubleChaos',duel:'boss difficulty seed',daily:'',pursuit:'seed'};
  function build(k){
    const [label,type]=schema[k],node=document.createElement('label'),select=type==='seed'||typeof type==='boolean'?'input':'select';
    const input=document.createElement(select);node.append(label,input);panel.append(node);
    if(typeof type==='boolean'){input.type='checkbox';input.checked=type;}
    else if(type==='seed'){input.type='number';input.min=0;input.max=4294967295;input.placeholder='Aleatoria';}
    else{
      let pairs;
      if(Array.isArray(type))pairs=type.map(t=>[t,t]);
      else if(type==='boss')pairs=[...(mode==='sandbox'?[['','Ninguno']]:[]),...Object.entries(BOSS_NAMES)];
      else{
        input.multiple=true;input.size=4;
        pairs=type==='deck'?[...CARD_TYPES,...SPECIAL_CARDS].map(c=>[c.id,c.name]):Object.entries(type==='chaos'?CHAOS_RULES:ENEMY_NAMES).filter(([id])=>!BOSS_NAMES[id]);
      }
      for(const [val,name] of pairs)input.add(new Option(name,val,false,input.multiple&&type!=='deck'));
    }
    fields.set(k,input);
  }
  function snapshot(){
    const values={};
    for(const [k,input] of fields){
      if(input.multiple)values[k]=Array.from(input.selectedOptions,o=>o.value);
      else if(input.type==='checkbox')values[k]=input.checked;
      else if(k==='seed')values[k]=input.value===''?null:Number(input.value);
      else values[k]=typeof schema[k][1][0]==='number'?Number(input.value):input.value;
    }
    if(values.seed!=null&&(!Number.isInteger(values.seed)||values.seed<0||values.seed>4294967295))values.seed=null;
    return values;
  }
  function read(id){
    const values=snapshot();
    const standard=Array.from(form.elements).filter(i=>i.name||i.closest('#roster,#setupBosses,#rushRoster')||i.id==='botPlay')
      .map(i=>[i.name||i.id||i.value,i.type==='checkbox'?i.checked:i.value]);
    writeLocal('options.'+id,{values,standard});
    if(values.enemyPool)values.disabled=Object.keys(ENEMY_NAMES).filter(k=>!BOSS_NAMES[k]&&!values.enemyPool.includes(k));
    return values;
  }
  function open(id,target,reset=false){
    mode=id;form=target;fields=new Map();panel.replaceChildren();
    const saved=reset?{}:readLocal('options.'+id,{});
    form.reset();
    for(const input of form.querySelectorAll('#roster input,#setupBosses input,#rushRoster input'))input.checked=true;
    const stored=new Map(Array.isArray(saved.standard)?saved.standard.filter(a=>Array.isArray(a)&&a.length===2):[]);
    for(const i of form.elements){
      const v=stored.get(i.name||i.id||i.value);if(v==null)continue;
      if(i.type==='checkbox')i.checked=v===true;
      else if(i.type==='select-one'){if(Array.from(i.options).some(o=>o.value===v))i.value=v;}
      else if(typeof v==='string'){i.value=v;if(!i.validity.valid)i.value=i.defaultValue;}
    }
    const keys=keysByMode[id].split(' ').filter(Boolean);
    for(const k of keys){build(k);const input=fields.get(k),v=saved.values?.[k];if(v==null)continue;
      if(input.multiple&&Array.isArray(v)){for(const o of input.options)o.selected=v.includes(o.value);}
      else if(input.type==='checkbox')input.checked=v===true;
      else if(input.type==='number'){if(Number.isInteger(v)&&v>=0&&v<=4294967295)input.value=v;}
      else if(Array.from(input.options||[]).some(o=>o.value===String(v)))input.value=v;
    }
    const groups=[
      ['Dificultad y reglas',['intensity','progression','bossFrequency','difficulty','wave','duration','chaosPeriod','chaosDuration','doubleChaos']],
      ['Enemigos y modificadores',['boss','enemyPool','chaosPool']],
      ['Opciones avanzadas',['seed','starters']]
    ];
    for(const [name,list] of groups){
      const inputs=list.map(k=>fields.get(k)).filter(Boolean);
      if(inputs.length&&(keys.length>3||inputs.some(i=>i.multiple))){
        const details=document.createElement('details'),title=document.createElement('summary');title.textContent=name;details.append(title);
        for(const i of inputs)details.append(i.parentElement);panel.append(details);
      }
    }
    const resetBtn=document.createElement('button');resetBtn.type='button';resetBtn.textContent='Restaurar valores predeterminados';resetBtn.onclick=()=>open(id,target,true);panel.append(resetBtn,summary);
    target.insertBefore(panel,target.querySelector('button:not([type])'));
    const describe=()=>{const v=snapshot();summary.textContent=id==='daily'?dailyChallenge().description:
      [v.starters?.length||v.wave>1?'Partida personalizada':null,form.elements.difficulty?'Ritmo '+form.elements.difficulty.value+'× de progresión y aparición':null,
       v.seed!=null?'Semilla '+v.seed:null,v.duration?v.duration+' minutos':null,v.intensity?'Amenaza '+v.intensity:null].filter(Boolean).join(' · ');};
    form.oninput=describe;describe();
  }
  return {open,read};
}
