const fs = require("fs");
const path = require("path");

const MEMORY_FOLDER = path.join(__dirname,"..","memory");

let memoryIndex = {
files: [],
keywords: {}
};

/* =========================
   ESCANEAR MEMORIA
========================= */

function scanMemory(){

try{

if(!fs.existsSync(MEMORY_FOLDER)){
return memoryIndex;
}

const files = fs.readdirSync(MEMORY_FOLDER);

memoryIndex.files = files;

files.forEach(file=>{

const filePath = path.join(MEMORY_FOLDER,file);

try{

const content = fs.readFileSync(filePath,"utf8");

const words = content
.toLowerCase()
.replace(/[^\w\s]/g,"")
.split(/\s+/)
.filter(w=>w.length>4);

words.forEach(word=>{

if(!memoryIndex.keywords[word]){
memoryIndex.keywords[word] = [];
}

if(!memoryIndex.keywords[word].includes(file)){
memoryIndex.keywords[word].push(file);
}

});

}catch(e){
}

});

console.log("AI Memory Index actualizado");

return memoryIndex;

}catch(error){

console.log("Error memory index:",error);

return memoryIndex;

}

}

/* =========================
   BUSCAR EN MEMORIA
========================= */

function searchMemory(query){

const word = String(query || "")
.toLowerCase()
.replace(/[^\w\s]/g,"")
.trim();

return memoryIndex.keywords[word] || [];

}

/* =========================
   OBTENER ESTADO
========================= */

function getIndexState(){
return memoryIndex;
}

module.exports = {
scanMemory,
searchMemory,
getIndexState
};