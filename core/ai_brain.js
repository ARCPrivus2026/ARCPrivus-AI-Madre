const fs = require("fs");
const path = require("path");

/* =========================================
   ARCHIVO DE OBJETIVOS
========================================= */

function brainFolder(){

const folder = path.join(__dirname,"..","memory","brain");

if(!fs.existsSync(folder)){
fs.mkdirSync(folder,{recursive:true});
}

return folder;

}

function brainFile(){
return path.join(brainFolder(),"goals.json");
}

/* =========================================
   CARGAR OBJETIVOS
========================================= */

function loadGoals(){

const file = brainFile();

if(!fs.existsSync(file)){

return {
goals:[
"ayudar a los usuarios",
"aprender continuamente",
"expandir el ecosistema ARC Privus"
]
};

}

try{

return JSON.parse(fs.readFileSync(file,"utf8"));

}catch{

return {
goals:[]
};

}

}

/* =========================================
   GUARDAR OBJETIVOS
========================================= */

function saveGoals(data){

const file = brainFile();

fs.writeFileSync(file,JSON.stringify(data,null,2));

}

/* =========================================
   ANALIZAR MENSAJE
========================================= */

function analyzeMessage(message){

const goals = loadGoals();

const text = String(message || "").toLowerCase();

if(text.includes("dinero") || text.includes("negocio")){
goals.goals.push("buscar oportunidades económicas");
}

if(text.includes("inversion") || text.includes("trading")){
goals.goals.push("mejorar análisis financiero");
}

if(text.includes("crear") || text.includes("construir")){
goals.goals.push("desarrollar nuevas capacidades");
}

saveGoals(goals);

}

/* =========================================
   OBTENER OBJETIVOS
========================================= */

function getGoals(){

const data = loadGoals();

return data.goals;

}

module.exports = {
analyzeMessage,
getGoals
};