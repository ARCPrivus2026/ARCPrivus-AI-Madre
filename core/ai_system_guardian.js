const fs = require("fs");
const path = require("path");

const CORE_FOLDER = __dirname;

/* =========================
   MÓDULOS CRÍTICOS
========================= */

const CRITICAL_MODULES = [
"ai_orchestrator.js",
"ai_learning.js",
"ai_brain_map.js",
"ai_goals_engine.js",
"ai_reasoning_engine.js",
"ai_decision_engine.js",
"ai_evolution_controller.js"
];

/* =========================
   VERIFICAR MÓDULOS
========================= */

function checkCriticalModules(){

let missing = [];

CRITICAL_MODULES.forEach(moduleName=>{

const modulePath = path.join(CORE_FOLDER,moduleName);

if(!fs.existsSync(modulePath)){
missing.push(moduleName);
}

});

return missing;

}

/* =========================
   DETECTAR DUPLICADOS
========================= */

function detectDuplicates(){

const files = fs.readdirSync(CORE_FOLDER);

let duplicates = [];

files.forEach(file=>{

if(file.includes("copy") || file.includes("backup")){
duplicates.push(file);
}

});

return duplicates;

}

/* =========================
   EVALUAR SISTEMA
========================= */

function evaluateSystem(){

try{

console.log("AI System Guardian revisando sistema...");

const missingModules = checkCriticalModules();
const duplicateModules = detectDuplicates();

let status = "stable";

if(missingModules.length > 0){
status = "warning";
}

if(duplicateModules.length > 0){
status = "warning";
}

return {
status,
missingModules,
duplicateModules
};

}catch(error){

console.log("Error guardian:",error);

return {
status:"error",
missingModules:[],
duplicateModules:[]
};

}

}

module.exports = {
evaluateSystem
};