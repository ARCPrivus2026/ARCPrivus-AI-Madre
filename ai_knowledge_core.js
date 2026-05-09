const fs = require("fs");
const path = require("path");

const MEMORY_FOLDER = path.join(__dirname,"..","memory");
const DB = path.join(MEMORY_FOLDER,"ai_knowledge.json");

/* =========================
   ASEGURAR CARPETA
========================= */

function ensureFolder(){

if(!fs.existsSync(MEMORY_FOLDER)){
fs.mkdirSync(MEMORY_FOLDER,{recursive:true});
}

}

/* =========================
   CARGAR CONOCIMIENTO
========================= */

function loadKnowledge(){

ensureFolder();

if(!fs.existsSync(DB)){
fs.writeFileSync(DB,JSON.stringify({knowledge:[]},null,2));
}

try{
return JSON.parse(fs.readFileSync(DB,"utf8"));
}catch{
return {knowledge:[]};
}

}

/* =========================
   GUARDAR CONOCIMIENTO
========================= */

function saveKnowledge(data){

fs.writeFileSync(DB,JSON.stringify(data,null,2));

}

/* =========================
   AGREGAR CONOCIMIENTO
========================= */

function addKnowledge(title,content){

const db = loadKnowledge();

const exists = db.knowledge.find(k=>k.title===title);

if(exists){
return exists;
}

const entry = {
title,
content,
created:new Date().toISOString()
};

db.knowledge.push(entry);

saveKnowledge(db);

console.log("AI Knowledge agregado:",title);

return entry;

}

/* =========================
   BUSCAR CONOCIMIENTO
========================= */

function searchKnowledge(query){

const db = loadKnowledge();

const q = String(query || "").toLowerCase();

return db.knowledge.filter(k=>

k.title.toLowerCase().includes(q) ||
k.content.toLowerCase().includes(q)

);

}

/* =========================
   OBTENER TODO
========================= */

function getKnowledge(){

return loadKnowledge().knowledge;

}

module.exports = {
addKnowledge,
searchKnowledge,
getKnowledge
};