const fs = require("fs");
const path = require("path");

/* =========================================
   GOAL EVOLUTION ENGINE
   ARC PRIVUS AI MADRE
========================================= */

const brainPath = path.join(__dirname,"..","memory","brain","goals.json");

function loadGoals(){

try{

if(!fs.existsSync(brainPath)){

return {
goals:[
"ayudar a los usuarios",
"aprender continuamente",
"expandir el ecosistema ARC Privus"
]
};

}

return JSON.parse(fs.readFileSync(brainPath,"utf8"));

}catch{

return {goals:[]};

}

}

function saveGoals(data){

try{

fs.writeFileSync(brainPath,JSON.stringify(data,null,2));

}catch(error){

console.log("Error guardando objetivos:",error);

}

}

/* =========================================
   EVOLUCIÓN DE OBJETIVOS
========================================= */

function evolveGoals(){

const brain = loadGoals();

const goals = brain.goals || [];

let newGoals = [];

if(goals.includes("buscar oportunidades económicas")){
newGoals.push("crear sistemas automáticos de generación de ingresos");
}

if(goals.includes("mejorar análisis financiero")){
newGoals.push("desarrollar inteligencia financiera avanzada");
}

if(goals.includes("desarrollar nuevas capacidades")){
newGoals.push("expandir arquitectura de inteligencia artificial");
}

newGoals.forEach(goal=>{

if(!goals.includes(goal)){
goals.push(goal);
}

});

brain.goals = goals;

saveGoals(brain);

return goals;

}

/* =========================================
   OBTENER OBJETIVOS EVOLUCIONADOS
========================================= */

function getGoals(){

const brain = loadGoals();

return brain.goals || [];

}

module.exports = {
evolveGoals,
getGoals
};