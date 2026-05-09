const kernel = require("./ai_mother_kernel");
const guardian = require("./ai_system_guardian");
const memoryIndex = require("./ai_memory_index");

function analyzeSystem(){

try{

console.log("AI System Awareness analizando estado del sistema...");

/* =========================
   ESTADO DEL KERNEL
========================= */

let kernelState = {};

try{
kernelState = kernel.getState();
}catch{
kernelState = {};
}

/* =========================
   ESTADO DEL GUARDIAN
========================= */

let guardianState = {};

try{
guardianState = guardian.evaluateSystem();
}catch{
guardianState = {};
}

/* =========================
   ESTADO DE MEMORIA
========================= */

let memoryState = {};

try{
memoryState = memoryIndex.getIndexState();
}catch{
memoryState = {};
}

/* =========================
   RESUMEN DEL SISTEMA
========================= */

const summary = {
status: "operational",
modulesActive: kernelState.modulesActive || [],
memoryFiles: memoryState.files || [],
memoryKeywords: Object.keys(memoryState.keywords || {}).length,
warnings: []
};

if(guardianState.missingModules && guardianState.missingModules.length){
summary.status = "warning";
summary.warnings.push("Faltan módulos críticos");
}

if(guardianState.duplicateModules && guardianState.duplicateModules.length){
summary.status = "warning";
summary.warnings.push("Se detectaron módulos duplicados");
}

return {
kernel: kernelState,
guardian: guardianState,
memory: memoryState,
summary
};

}catch(error){

console.log("Error system awareness:",error);

return {
summary:{
status:"error"
}
};

}

}

module.exports = {
analyzeSystem
};