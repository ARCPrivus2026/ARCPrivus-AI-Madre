const fs = require("fs");
const path = require("path");

const capabilityManager = require("./ai_capability_manager");

/* ===============================
   ARCHIVO DE CAPACIDADES
================================ */

const DB = path.join(__dirname,"..","memory","synthesized_capabilities.json");

function loadDB(){

if(!fs.existsSync(DB)){
fs.writeFileSync(DB,JSON.stringify({capabilities:[]},null,2));
}

return JSON.parse(fs.readFileSync(DB,"utf8"));

}

function saveDB(data){
fs.writeFileSync(DB,JSON.stringify(data,null,2));
}

/* ===============================
   SINTETIZAR CAPACIDADES
================================ */

function synthesizeCapabilities(){

try{

const capabilities = capabilityManager.detectNewCapabilities
? capabilityManager.detectNewCapabilities()
: [];

if(!capabilities || capabilities.length < 2){
return [];
}

const db = loadDB();

let newCaps = [];

for(let i=0;i<capabilities.length;i++){

for(let j=i+1;j<capabilities.length;j++){

const capA = capabilities[i];
const capB = capabilities[j];

const name = capA + "_" + capB;

const exists = db.capabilities.find(c=>c.name===name);

if(!exists){

const newCapability = {
name,
source:[capA,capB],
created:Date.now()
};

db.capabilities.push(newCapability);
newCaps.push(newCapability);

console.log("Nueva capacidad sintetizada:",name);

}

}

}

saveDB(db);

return newCaps;

}catch(error){

console.log("Error capability synthesizer:",error);

return [];

}

}

/* ===============================
   OBTENER CAPACIDADES
================================ */

function getSynthesizedCapabilities(){

const db = loadDB();

return db.capabilities;

}

module.exports={
synthesizeCapabilities,
getSynthesizedCapabilities
};