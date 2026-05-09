const fs = require("fs");
const path = require("path");

class AIModuleRegistry {

constructor(){
this.modules = {};
console.log("AI Module Registry iniciado");
}

/* =========================
   ESCANEAR CARPETA CORE
========================= */

scanCore(){

const corePath = path.join(__dirname);

const files = fs.readdirSync(corePath);

files.forEach(file => {

if(!file.endsWith(".js")) return;

if(file === "ai_module_registry.js") return;

const moduleName = file.replace(".js","");

try{

const mod = require("./" + moduleName);

this.modules[moduleName] = mod;

console.log("Módulo cargado:", moduleName);

}catch(error){

console.log("Error cargando módulo:", moduleName);

}

});

}

/* =========================
   OBTENER MÓDULOS
========================= */

getModules(){

return this.modules;

}

/* =========================
   OBTENER UN MÓDULO
========================= */

getModule(name){

return this.modules[name];

}

}

const registry = new AIModuleRegistry();

registry.scanCore();

module.exports = registry;