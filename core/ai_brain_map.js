const fs = require("fs");
const path = require("path");

const MEMORY_FOLDER = path.join(__dirname,"..","memory");
const DB = path.join(MEMORY_FOLDER,"ai_brain.json");

/* =========================
   ASEGURAR CARPETA
========================= */

function ensureFolder(){

if(!fs.existsSync(MEMORY_FOLDER)){
fs.mkdirSync(MEMORY_FOLDER,{recursive:true});
}

}

/* =========================
   CARGAR CEREBRO
========================= */

function loadBrain(){

ensureFolder();

if(!fs.existsSync(DB)){
fs.writeFileSync(DB,JSON.stringify({nodes:{}},null,2));
}

try{
return JSON.parse(fs.readFileSync(DB,"utf8"));
}catch{
return {nodes:{}};
}

}

/* =========================
   GUARDAR CEREBRO
========================= */

function saveBrain(brain){

fs.writeFileSync(DB,JSON.stringify(brain,null,2));

}

/* =========================
   APRENDER RELACIÓN
========================= */

function learnRelation(a,b){

if(!a || !b || a===b) return;

const brain = loadBrain();

if(!brain.nodes[a]){
brain.nodes[a] = [];
}

if(!brain.nodes[b]){
brain.nodes[b] = [];
}

if(!brain.nodes[a].includes(b)){
brain.nodes[a].push(b);
}

if(!brain.nodes[b].includes(a)){
brain.nodes[b].push(a);
}

/* limitar tamaño */

if(brain.nodes[a].length > 50){
brain.nodes[a].shift();
}

if(brain.nodes[b].length > 50){
brain.nodes[b].shift();
}

saveBrain(brain);

}

/* =========================
   OBTENER RELACIONES
========================= */

function getRelations(word){

const brain = loadBrain();

return brain.nodes[word] || [];

}

/* =========================
   ANALIZAR MENSAJE
========================= */

function analyzeMessage(message){

const words = String(message || "")
.toLowerCase()
.replace(/[^\w\s]/g,"")
.split(/\s+/)
.filter(w=>w.length>4);

/* eliminar duplicados */

const uniqueWords = [...new Set(words)];

for(let i=0;i<uniqueWords.length-1;i++){

learnRelation(uniqueWords[i],uniqueWords[i+1]);

}

}

module.exports = {
analyzeMessage,
getRelations
};