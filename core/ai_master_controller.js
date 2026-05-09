const healthMonitor = require("./ai_system_health_monitor");
const evolutionEngine = require("./ai_evolution_engine");
const selfRepairEngine = require("./ai_self_repair_engine");
const errorGuardian = require("./ai_error_guardian");

class AIMasterController {

constructor(){
console.log("AI Master Controller iniciado");
this.lastRun = null;
}

/* ===============================
   EJECUTAR CICLO GENERAL IA
================================ */

runCycle(){

try{

console.log("AI Master Controller ejecutando ciclo");

const health = healthMonitor.getHealthSummary();

let evolution = null;

if(health.status !== "critical"){

evolution = evolutionEngine.evaluateCapabilities();

}

/* si sistema está crítico, intentar reparación */

if(health.status === "critical"){

console.log("Sistema en estado crítico, ejecutando reparación");

selfRepairEngine.runRepair();

}

/* resultado del ciclo */

this.lastRun = {

time:new Date().toISOString(),
health,
evolution

};

return this.lastRun;

}catch(error){

console.log("Error en Master Controller:",error);

errorGuardian.registerError(error,"master_controller");

return null;

}

}

/* ===============================
   OBTENER ESTADO
================================ */

getState(){

return {
lastRun:this.lastRun
};

}

}

module.exports = new AIMasterController();