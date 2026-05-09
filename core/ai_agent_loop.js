const orchestrator = require("./ai_orchestrator");
const learning = require("./ai_learning");
const brain = require("./ai_brain");

/* =========================================
   AGENTE IA - CICLO DE PENSAMIENTO
========================================= */

async function runAgent(message, user="usuario", history=[], profile={}){

try{

console.log("AI Madre iniciando ciclo de agente...");

/* PASO 1 - ANALIZAR MENSAJE */

learning.analyze(message);

/* PASO 2 - PENSAR */

const plan = analyzeGoal(message);

console.log("Plan detectado:", plan);

/* PASO 3 - ACTUAR */

const response = await orchestrator.orchestrate(
message,
user,
history,
profile
);

/* PASO 4 - EVALUAR */

evaluateResult(message, response);

/* PASO 5 - APRENDER */

learning.analyze(response);
brain.analyzeMessage(message);

console.log("Ciclo de agente completado.");

return response;

}catch(error){

console.log("Error en agente IA:",error);

return "La IA encontró un problema ejecutando el agente.";

}

}

/* =========================================
   ANALIZAR OBJETIVO
========================================= */

function analyzeGoal(message){

const text = String(message || "").toLowerCase();

if(text.includes("crear")){
return "creation";
}

if(text.includes("buscar")){
return "search";
}

if(text.includes("invertir") || text.includes("trading")){
return "finance";
}

if(text.includes("imagen") || text.includes("video")){
return "media_generation";
}

return "conversation";

}

/* =========================================
   EVALUAR RESULTADO
========================================= */

function evaluateResult(message,response){

if(!response){
console.log("La IA no generó respuesta.");
return;
}

if(response.length < 5){
console.log("Respuesta demasiado corta.");
}

}

module.exports = {
runAgent
};