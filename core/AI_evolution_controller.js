const moduleCreator = require("./ai_module_creator");
const superEvolution = require("./ai_super_evolution_engine");
class AISelfArchitectureEngine {

constructor(){
console.log("AI Self Architecture Engine iniciado");
}

/* =========================
   ANALIZAR ARQUITECTURA
========================= */

runArchitectureAnalysis(){

try{

console.log("AI Architecture Engine analizando arquitectura...");

const requiredModules = [
"./ai_orchestrator",
"./ai_learning",
"./ai_capability_manager",
"./ai_module_creator",
"./ai_absorption_engine",
"./ai_global_observer"
];

const scan = this.scanModules(requiredModules);

const suggestions = [];

if(scan.missing.length){

scan.missing.forEach(mod=>{

suggestions.push("Falta módulo: " + mod);

const name = mod.split("/").pop();

try{

moduleCreator.createModule(name);

console.log("IA creó automáticamente el módulo:",name);

}catch(e){

console.log("No se pudo crear módulo:",name);

}

});

}

return {
scan,
suggestions
};

}catch(error){

console.log("Error arquitectura IA:",error);

return {
scan:{ present:[], missing:[] },
suggestions:[]
};

}

}

/* =========================
   ESCANEAR MÓDULOS
========================= */

scanModules(modules){

const result = {
present: [],
missing: []
};

modules.forEach(mod => {

try{

require(mod);
result.present.push(mod);

}catch{

result.missing.push(mod);

}

});

return result;

}

}

module.exports = new AISelfArchitectureEngine();