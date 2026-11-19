const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// One isolated copy of the existing game logic per room.
const files = ['config','spatial','entities','bootstrap','audio','geometry-cards','cards-data','state','input','abilities','world','collision','enemies','combat','cards','laser','death','worm','singular','pattern-bosses','boss','difficulty','lightning','expansion','simulation','effects'];
const scripts = files.map(name => new vm.Script(fs.readFileSync(path.join(__dirname,'src',name+'.js'),'utf8'), {filename:name+'.js'}));
const roomScript = new vm.Script(fs.readFileSync(path.join(__dirname,'room-tick.js'),'utf8'));
module.exports = function engine(settings) {
  const canvas = {getContext:()=>null, addEventListener(){}};
  const context = vm.createContext({settings, URLSearchParams, location:{search:''}, performance,
    document:{getElementById:()=>canvas},window:{innerWidth:1280,innerHeight:800,addEventListener(){}}});
  for (const script of scripts) script.runInContext(context);
  return roomScript.runInContext(context);
};
