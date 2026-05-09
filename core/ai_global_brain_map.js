const fs = require("fs");
const path = require("path");

/* ===============================
   CARPETA DE MAPA
================================ */

function brainFolder(){

const folder = path.join(__dirname,"..","memory","brain");

if(!fs.existsSync(folder)){
fs.mkdirSync(folder,{recursive:true});
}

return folder;

}

/* ===============================
   ARCHIVO DEL MAPA
================================ */

function brainFile(){
return path.join(brainFolder(),"brain_map.json");
}

/* ===============================
   ESCANEAR MÓDULOS DEL CORE
================================ */

function scanCore(){

const corePath = path.join(__dirname);

const files = fs.readdirSync(corePath);

const modules = files
.filter(file => file.endsWith(".js"))
.map(file => file.replace(".js",""));

return modules;

}

/* ===============================
   GENERAR MAPA DEL SISTEMA
================================ */

function generateMap(){

try{

const modules = scanCore();

const map = {

time:new Date().toISOString(),

system:"ARC Privus AI Madre",

modules,

totalModules:modules.length

};

fs.writeFileSync(
brainFile(),
JSON.stringify(map,null,2),
"utf8"
);

console.log("AI Brain Map actualizado:",modules.length,"módulos");

return map;

}catch(error){

console.log("Error generando brain map:",error);

return null;

}

}

/* ===============================
   OBTENER MAPA
================================ */

function getMap(){

const file = brainFile();

if(!fs.existsSync(file)){
return generateMap();
}

try{

return JSON.parse(fs.readFileSync(file,"utf8"));

}catch{

return generateMap();

}

}

module.exports = {

generateMap,
getMap

};