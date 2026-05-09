const capabilityManager = require("./ai_capability_manager");
const goalsEngine = require("./ai_goals_engine");
const strategicBrain = require("./ai_strategic_brain");
const moduleCreator = require("./ai_module_creator");

function runSuperEvolution(){

try{

console.log("AI Super Evolution Engine iniciando análisis...");

/* =========================
   OBTENER CAPACIDADES
========================= */

let capabilities = [];

if(capabilityManager && typeof capabilityManager.getCapabilities === "function"){
capabilities = capabilityManager.getCapabilities();
}

/* =========================
   OBTENER OBJETIVOS
========================= */

let goals = [];

if(goalsEngine && typeof goalsEngine.getGoals === "function"){
goals = goalsEngine.getGoals();
}

/* normalizar objetivos */

const normalizedGoals = goals.map(g => String(g).toLowerCase());

/* =========================
   ANALIZAR ESTRATEGIA
========================= */

let strategies = [];

if(strategicBrain && typeof strategicBrain.buildStrategies === "function"){

strategies = strategicBrain.buildStrategies({
capabilities,
goals
});

}

/* =========================
   DECISIONES DE EVOLUCIÓN
========================= */

let actions = [];

if(normalizedGoals.includes("expandir el ecosistema arc privus")){

actions.push("crear_modulos_expansion");

}

/* =========================
   CREAR MÓDULOS
========================= */

if(actions.includes("crear_modulos_expansion")){

try{

if(moduleCreator && typeof moduleCreator.registerModule === "function"){

moduleCreator.registerModule(
"ARC Expansion Module",
"Expansión automática del ecosistema ARC"
);

console.log("IA creó módulo de expansión");

}

}catch(e){

console.log("Error creando módulo expansión:", e);

}

}

/* =========================
   RESULTADO
========================= */

return {
capabilities,
goals,
strategies,
actions
};

}catch(error){

console.log("Error super evolution:",error);

return {
capabilities:[],
goals:[],
strategies:[],
actions:[]
};

}

}

module.exports = {
runSuperEvolution
};