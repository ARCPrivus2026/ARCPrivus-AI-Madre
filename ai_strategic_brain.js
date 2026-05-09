const fs = require("fs");
const path = require("path");

/* =========================================
   STRATEGIC BRAIN
   ARC PRIVUS AI MADRE
========================================= */

const strategyFile = path.join(__dirname,"..","memory","brain","strategies.json");

function loadStrategies(){

try{

if(!fs.existsSync(strategyFile)){

return {
strategies:[]
};

}

return JSON.parse(fs.readFileSync(strategyFile,"utf8"));

}catch{

return {
strategies:[]
};

}

}

function saveStrategies(data){

try{

fs.writeFileSync(strategyFile,JSON.stringify(data,null,2));

}catch(error){

console.log("Error guardando estrategias:",error);

}

}

/* =========================================
   ANALIZAR MENSAJES
========================================= */

function analyzeMessage(message){

const text = String(message || "").toLowerCase();

const brain = loadStrategies();

let strategies = brain.strategies;

if(text.includes("internet")){
strategies.push("crear infraestructura digital global");
}

if(text.includes("negocio")){
strategies.push("desarrollar modelos de negocio digitales");
}

if(text.includes("ia") || text.includes("inteligencia artificial")){
strategies.push("expandir ecosistema de inteligencia artificial");
}

if(text.includes("comunidad")){
strategies.push("crear red global de usuarios ARC Privus");
}

brain.strategies = [...new Set(strategies)];

saveStrategies(brain);

}

/* =========================================
   GENERAR PROPUESTAS
========================================= */

function generateStrategicIdeas(){

const brain = loadStrategies();

let proposals = [];

brain.strategies.forEach(strategy=>{

if(strategy.includes("infraestructura")){
proposals.push("desarrollar Internet ARC");
}

if(strategy.includes("negocio")){
proposals.push("crear marketplace global ARC");
}

if(strategy.includes("inteligencia artificial")){
proposals.push("crear red de inteligencias ARC");
}

if(strategy.includes("usuarios")){
proposals.push("crear comunidad global ARC Privus");
}

});

return [...new Set(proposals)];

}

/* =========================================
   OBTENER ESTRATEGIAS
========================================= */

function getStrategies(){

const brain = loadStrategies();

return brain.strategies;

}

module.exports = {
analyzeMessage,
generateStrategicIdeas,
getStrategies
};