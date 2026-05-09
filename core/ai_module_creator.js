const fs = require("fs");
const path = require("path");

/* ===============================
   CARPETAS
================================ */

function modulesFolder(){

const folder = path.join(__dirname,"..","memory","modules");

if(!fs.existsSync(folder)){
fs.mkdirSync(folder,{recursive:true});
}

return folder;

}

function modulesCodeFolder(){

const folder = path.join(__dirname,"modules");

if(!fs.existsSync(folder)){
fs.mkdirSync(folder,{recursive:true});
}

return folder;

}

/* ===============================
   ARCHIVO DE MÓDULOS
================================ */

function modulesFile(){
return path.join(modulesFolder(),"modules.json");
}

/* ===============================
   CARGAR MÓDULOS
================================ */

function loadModules(){

const file = modulesFile();

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
   GUARDAR MÓDULOS
================================ */

function saveModules(data){

const file = modulesFile();

fs.writeFileSync(file,JSON.stringify(data,null,2));

}

/* ===============================
   REGISTRAR NUEVO MÓDULO
================================ */

function registerModule(name,description){

if(!name) return;

const modules = loadModules();

const exists = modules.find(m=>m.name===name);

if(exists) return;

modules.push({
name:name,
description:description || "",
createdAt:new Date().toISOString()
});

saveModules(modules);

console.log("Nuevo módulo IA registrado:",name);

}

/* ===============================
   CREAR MÓDULO EN EL SISTEMA
================================ */

function createModule(name){

if(!name) return;

const file = path.join(modulesCodeFolder(),`${name}.js`);

if(fs.existsSync(file)){

console.log("El módulo ya existe:",name);

return;

}

const template = `
class ${name.replace(/[^a-zA-Z0-9]/g,"")} {

constructor(){
console.log("Modulo ${name} cargado");
}

run(input){

console.log("Modulo ${name} ejecutando:",input);

return {
module:"${name}",
status:"ok",
result:null
};

}

}

module.exports = new ${name.replace(/[^a-zA-Z0-9]/g,"")}();
`;

fs.writeFileSync(file,template);

registerModule(name,"Modulo generado automáticamente por IA");

console.log("Nuevo módulo IA creado:",name);

}

/* ===============================
   DETECTAR IDEAS DE MÓDULOS
================================ */

function detectModuleIdea(message){

const text = String(message || "").toLowerCase();

if(text.includes("crear video") || text.includes("generar video")){
createModule("ai_video_generator");
}

if(text.includes("trading") || text.includes("invertir")){
createModule("ai_trading");
}

if(text.includes("internet global")){
createModule("arc_internet");
}

}

module.exports = {
detectModuleIdea,
registerModule,
createModule
};