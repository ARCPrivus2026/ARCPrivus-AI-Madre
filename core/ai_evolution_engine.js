const fs = require("fs");
const path = require("path");

const { loadCapabilitiesSafe } = require("./ai_capability_reader");
const autonomousModuleCreator = require("./ai_autonomous_module_creator");

/* ===============================
   CARPETA DE EVOLUCIÓN
================================ */

function evolutionFolder(){

const folder = path.join(__dirname,"..","memory","evolution");

if(!fs.existsSync(folder)){
fs.mkdirSync(folder,{recursive:true});
}

return folder;

}

/* ===============================
   ARCHIVO DE EVOLUCIÓN
================================ */

function evolutionFile(){
return path.join(evolutionFolder(),"evolution.json");
}

/* ===============================
   CARGAR ESTADO
================================ */

function loadEvolution(){

const file = evolutionFile();

if(!fs.existsSync(file)){
return {
lastRun:null,
recommendations:[],
scores:{}
};
}

try{
return JSON.parse(fs.readFileSync(file,"utf8"));
}catch{
return {
lastRun:null,
recommendations:[],
scores:{}
};
}

}

/* ===============================
   GUARDAR ESTADO
================================ */

function saveEvolution(data){

const file = evolutionFile();

fs.writeFileSync(file,JSON.stringify(data,null,2),"utf8");

}

/* ===============================
   CALCULAR PUNTUACIÓN
================================ */

function scoreCapability(capability){

let score = 0;

const name = String(capability.name || "").toLowerCase();
const description = String(capability.description || "").toLowerCase();

if(name.includes("video")) score += 30;
if(name.includes("voice")) score += 25;
if(name.includes("translation")) score += 20;
if(name.includes("trading")) score += 35;

if(description.includes("automática")) score += 10;
if(description.includes("avanzada")) score += 10;
if(description.includes("multilenguaje")) score += 10;

return score;

}

/* ===============================
   DETECTAR MÓDULOS FALTANTES
================================ */

function detectMissingModules(capabilities){

const expectedModules = [
"ai_video_generator",
"ai_voice_engine",
"ai_translation_engine",
"ai_trading_engine"
];

const currentModules = capabilities.map(c => c.name || "");

const missingModules = expectedModules.filter(
mod => !currentModules.includes(mod)
);

return missingModules;

}

/* ===============================
   EVALUAR CAPACIDADES
================================ */

function evaluateCapabilities(){

const capabilities = loadCapabilitiesSafe() || [];

const evolution = loadEvolution();

/* detectar módulos faltantes */

const missingModules = detectMissingModules(capabilities);

/* crear módulos automáticamente */

missingModules.forEach(mod => {

try{

autonomousModuleCreator.createModule(mod);

}catch(error){

console.log("Error creando módulo automático:",error);

}

});

/* calcular puntuación */

const scored = capabilities.map(capability=>{

const score = scoreCapability(capability);

return {
...capability,
score
};

}).sort((a,b)=>b.score-a.score);

/* recomendaciones */

const recommendations = scored.slice(0,5).map(item=>({
name:item.name,
score:item.score,
reason:"Capacidad prioritaria para evolución de ARC Privus AI Madre"
}));

/* mapa de puntuaciones */

const scoreMap = {};

scored.forEach(item=>{
scoreMap[item.name] = item.score;
});

/* resultado */

const result = {
lastRun:new Date().toISOString(),
recommendations,
scores:scoreMap,
missingModules
};

saveEvolution(result);

return result;

}

module.exports = {
evaluateCapabilities
};