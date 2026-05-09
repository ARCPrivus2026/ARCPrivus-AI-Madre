const fs = require("fs");
const path = require("path");

const { loadCapabilitiesSafe } = require("./ai_capability_reader");

/* ===============================
   CARPETA DE CAPACIDADES GENERADAS
================================ */

function capabilityFolder(){

const folder = path.join(__dirname,"..","memory","generated_capabilities");

if(!fs.existsSync(folder)){
fs.mkdirSync(folder,{recursive:true});
}

return folder;

}

/* ===============================
   ARCHIVO DE CAPACIDADES
================================ */

function capabilityFile(){
return path.join(capabilityFolder(),"capabilities.json");
}

/* ===============================
   CARGAR CAPACIDADES
================================ */

function loadGenerated(){

const file = capabilityFile();

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
   GUARDAR CAPACIDADES
================================ */

function saveGenerated(data){

const file = capabilityFile();

fs.writeFileSync(
file,
JSON.stringify(data,null,2),
"utf8"
);

}

/* ===============================
   GENERAR NUEVAS CAPACIDADES
================================ */

function generateCapabilities(){

try{

const baseCapabilities = loadCapabilitiesSafe() || [];
const generated = loadGenerated();

const newCapabilities = [];

for(let i=0;i<baseCapabilities.length;i++){

for(let j=i+1;j<baseCapabilities.length;j++){

const capA = baseCapabilities[i].name || "";
const capB = baseCapabilities[j].name || "";

const combined = capA + "_" + capB;

const exists = generated.find(c=>c.name===combined);

if(!exists){

const capability = {

name:combined,

description:`Capacidad generada combinando ${capA} y ${capB}`,

created:new Date().toISOString()

};

generated.push(capability);
newCapabilities.push(capability);

}

}

}

saveGenerated(generated);

console.log("AI Capability Generator creó:",newCapabilities.length,"capacidades");

return newCapabilities;

}catch(error){

console.log("Error capability generator:",error);

return [];

}

}

/* ===============================
   OBTENER CAPACIDADES GENERADAS
================================ */

function getGenerated(){

return loadGenerated();

}

module.exports = {

generateCapabilities,
getGenerated

};