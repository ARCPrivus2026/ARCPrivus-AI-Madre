const externalObserver = require("./ai_external_observer");
const capabilityManager = require("./ai_capability_manager");
const evolutionEngine = require("./ai_evolution_engine");
const moduleCreator = require("./ai_module_creator");
const learning = require("./ai_learning");

const { extractUserInfo } = require("./ai_memory_extractor");
const { getUserMemory } = require("./ai_user_memory");

const intelligenceDetector = require("./ai_intelligence_detector");

/* NUEVO: MOTOR DE ABSORCIÓN */
const absorptionEngine = require("./ai_absorption_engine");

/* =========================================
   SUPERVISOR CENTRAL AI MADRE
========================================= */

async function supervise(message, user){

try{

const text = String(message || "").trim();

if(!text){
return null;
}

/* ===============================
   DETECTOR DE NUEVAS INTELIGENCIAS
================================ */

if(intelligenceDetector && intelligenceDetector.detectNewIntelligence){
intelligenceDetector.detectNewIntelligence(text);
}

/* ===============================
   APRENDIZAJE GLOBAL
================================ */

if(learning && learning.analyze){
learning.analyze(text);
}

/* ===============================
   DETECTAR IDEAS DE MÓDULOS
================================ */

if(moduleCreator && moduleCreator.detectModuleIdea){
moduleCreator.detectModuleIdea(text);
}

/* ===============================
   DETECTAR NUEVAS CAPACIDADES
================================ */

if(capabilityManager && capabilityManager.detectCapabilityIdea){
capabilityManager.detectCapabilityIdea(text);
}

/* ===============================
   OBSERVADOR EXTERNO
================================ */

if(externalObserver && externalObserver.detectExternalIdeas){
externalObserver.detectExternalIdeas(text);
}

/* ===============================
   ABSORCIÓN DE CONOCIMIENTO
================================ */

if(absorptionEngine && absorptionEngine.absorbKnowledge){

absorptionEngine.absorbKnowledge(
"conversation",
text
);

}

/* ===============================
   EVOLUCIÓN DEL SISTEMA
================================ */

if(evolutionEngine && evolutionEngine.evaluateCapabilities){

const evolution = evolutionEngine.evaluateCapabilities();

if(evolution.recommendations && evolution.recommendations.length){

console.log(
"Recomendación principal IA Madre:",
evolution.recommendations[0].name
);

}

}

/* ===============================
   EXTRAER INFORMACIÓN DEL USUARIO
================================ */

if(extractUserInfo){
extractUserInfo(user, text);
}

/* ===============================
   LEER MEMORIA DEL USUARIO
================================ */

let memory = {};

if(getUserMemory){
memory = getUserMemory(user) || {};
}

/* ===============================
   ANALIZAR PERFIL
================================ */

if(memory.profile && memory.profile.nombre){

console.log(
"Usuario identificado:",
memory.profile.nombre
);

}

/* ===============================
   ANALIZAR PREFERENCIAS
================================ */

if(memory.preferences && memory.preferences.language){

console.log(
"Idioma preferido:",
memory.preferences.language
);

}

/* ===============================
   REGISTRO DEL SISTEMA
================================ */

console.log("AI Madre supervisó mensaje de:", user);

}catch(error){

console.log("Error supervisor IA:", error);

}

}

module.exports = { supervise };