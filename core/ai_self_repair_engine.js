const fs = require("fs");
const path = require("path");

class AISelfRepairEngine {

constructor(){
console.log("AI Self Repair Engine iniciado");
}

/* ===============================
   VERIFICAR CARPETAS CRÍTICAS
================================ */

checkFolders(){

const folders = [
path.join(__dirname,"..","memory"),
path.join(__dirname,"..","memory","errors"),
path.join(__dirname,"..","memory","health"),
path.join(__dirname,"..","memory","evolution")
];

const created = [];

folders.forEach(folder=>{

if(!fs.existsSync(folder)){
fs.mkdirSync(folder,{recursive:true});
created.push(folder);
}

});

return created;

}

/* ===============================
   VERIFICAR ARCHIVOS CRÍTICOS
================================ */

checkFiles(){

const files = [

{
path:path.join(__dirname,"..","memory","errors","errors.json"),
default:[]
},

{
path:path.join(__dirname,"..","memory","health","health.json"),
default:{}
},

{
path:path.join(__dirname,"..","memory","evolution","evolution.json"),
default:{
lastRun:null,
recommendations:[],
scores:{}
}
}

];

const created = [];

files.forEach(file=>{

if(!fs.existsSync(file.path)){

fs.writeFileSync(
file.path,
JSON.stringify(file.default,null,2),
"utf8"
);

created.push(file.path);

}

});

return created;

}

/* ===============================
   EJECUTAR REPARACIÓN
================================ */

runRepair(){

try{

console.log("AI Self Repair ejecutando diagnóstico");

const createdFolders = this.checkFolders();
const createdFiles = this.checkFiles();

const report = {

time:new Date().toISOString(),

foldersCreated:createdFolders,

filesCreated:createdFiles,

status:"completed"

};

console.log("AI Self Repair completado");

return report;

}catch(error){

console.log("Error Self Repair:",error);

return {

status:"failed",
error:String(error)

};

}

}

}

module.exports = new AISelfRepairEngine();