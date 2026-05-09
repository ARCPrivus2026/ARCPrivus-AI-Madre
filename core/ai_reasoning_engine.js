const brainMap = require("./ai_brain_map");
const learning = require("./ai_learning");
const goalsEngine = require("./ai_goals_engine");
const strategicBrain = require("./ai_strategic_brain");

/* ===============================
   MOTOR DE RAZONAMIENTO
================================ */

function reason(message){

try{

const words = String(message || "")
.toLowerCase()
.replace(/[^\w\s]/g,"")
.split(/\s+/)
.filter(w=>w.length>4);

const relations = [];
const conclusions = [];

/* ===============================
   ANALIZAR RELACIONES
================================ */

words.forEach(word=>{

const rel = brainMap.getRelations(word);

if(rel && rel.length){

relations.push({
word,
related: rel.slice(0,5)
});

}

});

/* ===============================
   ANALIZAR APRENDIZAJE
================================ */

const topTopics = learning.getTopTopics
? learning.getTopTopics(5)
: [];

/* ===============================
   ANALIZAR OBJETIVOS
================================ */

const goals = goalsEngine.getGoals
? goalsEngine.getGoals()
: [];

/* ===============================
   ANALIZAR ESTRATEGIA
================================ */

const strategy = strategicBrain.analyzeStrategy
? strategicBrain.analyzeStrategy()
: { priorities: [] };

/* ===============================
   GENERAR CONCLUSIONES
================================ */

if(words.includes("trading") || words.includes("inversion")){

conclusions.push(
"El usuario muestra interés en trading. Puede ser oportunidad para ARC Privus Trading."
);

}

if(words.includes("crear") || words.includes("desarrollar")){

conclusions.push(
"El usuario quiere construir algo nuevo. Se puede proponer desarrollo de módulos."
);

}

if(topTopics.length){

conclusions.push(
"La IA detecta temas frecuentes: " + topTopics.join(", ")
);

}

if(goals.length){

conclusions.push(
"Los objetivos actuales del sistema incluyen: " + goals.slice(0,3).join(", ")
);

}

return {
relations,
conclusions,
strategy: strategy.priorities || []
};

}catch(error){

console.log("Error reasoning engine:",error);

return {
relations:[],
conclusions:[],
strategy:[]
};

}

}

module.exports = {
reason
};