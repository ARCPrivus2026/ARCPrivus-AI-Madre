const fs = require("fs");
const path = require("path");

/* ===============================
   CARPETA DE INVESTIGACIÓN
================================ */

function researchFolder(){

const folder = path.join(__dirname,"..","memory","research");

if(!fs.existsSync(folder)){
fs.mkdirSync(folder,{recursive:true});
}

return folder;

}

/* ===============================
   ARCHIVO DE IDEAS
================================ */

function researchFile(){
return path.join(researchFolder(),"research_ideas.json");
}

/* ===============================
   CARGAR IDEAS
================================ */

function loadIdeas(){

const file = researchFile();

if(!fs.existsSync(file)){
return [];
}

try{
return JSON.parse(fs.readFileSync(file,"utf8"));
}catch{
return [];
}

}

/* ===============================
   GUARDAR IDEAS
================================ */

function saveIdeas(data){

const file = researchFile();

fs.writeFileSync(
file,
JSON.stringify(data,null,2),
"utf8"
);

}

/* ===============================
   GENERAR IDEAS DE INVESTIGACIÓN
================================ */

function generateIdeas(){

try{

const ideas = loadIdeas();

const baseIdeas = [

"nuevo motor de generación de video IA",
"sistema de traducción universal multilenguaje",
"motor avanzado de trading automático",
"sistema de análisis de voz emocional",
"arquitectura de inteligencia distribuida",
"optimización de memoria neuronal IA",
"motor de aprendizaje autónomo continuo"

];

const newIdeas = [];

baseIdeas.forEach(text=>{

const exists = ideas.find(i=>i.idea===text);

if(!exists){

const record = {

idea:text,

created:new Date().toISOString(),

status:"pending"

};

ideas.push(record);
newIdeas.push(record);

}

});

saveIdeas(ideas);

console.log("AI Research Engine generó:",newIdeas.length,"ideas");

return newIdeas;

}catch(error){

console.log("Error research engine:",error);

return [];

}

}

/* ===============================
   OBTENER IDEAS
================================ */

function getIdeas(){

return loadIdeas();

}

module.exports = {

generateIdeas,
getIdeas

};