const fs = require("fs");
const path = require("path");

class AISystemBootManager {

constructor(){
console.log("AI Boot Manager iniciado");
}

/* =========================
   VERIFICAR MÓDULOS
========================= */

checkModules(modules){

const result = {
ok: [],
missing: []
};

modules.forEach(mod => {

try{

require(mod);
result.ok.push(mod);

}catch{

result.missing.push(mod);

}

});

return result;

}

/* =========================
   VERIFICAR FUNCIONES
========================= */

checkFunctions(object, functions){

const result = {
ok: [],
missing: []
};

functions.forEach(fn=>{

if(typeof object[fn] === "function"){
result.ok.push(fn);
}else{
result.missing.push(fn);
}

});

return result;

}

/* =========================
   ARRANQUE DEL SISTEMA
========================= */

boot(){

console.log("=================================");
console.log("ARC PRIVUS AI MADRE");
console.log("Verificando sistema...");
console.log("=================================");

const modules = [

"./ai_learning",
"./ai_capability_manager",
"./ai_system_awareness",
"./ai_global_observer",
"./ai_absorption_engine",
"./ai_strategic_brain",
"./ai_decision_engine",
"./ai_evolution_engine"

];

const scan = this.checkModules(modules);

if(scan.missing.length){

console.log("ERROR: módulos faltantes");

scan.missing.forEach(m=>{
console.log("Falta módulo:",m);
});

return false;

}

console.log("Todos los módulos esenciales cargados correctamente");

return true;

}

}

module.exports = new AISystemBootManager();