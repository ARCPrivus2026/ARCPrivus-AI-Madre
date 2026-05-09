const consciousMonitor = require("./ai_conscious_monitor");

let systemState = {
status: "booting",
lastCycle: null,
cycleCount: 0,
events: [],
modulesActive: [],
bootTime: null
};

/* ===============================
   INICIAR KERNEL
================================ */

function boot(modules){

try{

if(systemState.status === "active"){
console.log("AI Mother Kernel ya estaba activo");
return;
}

systemState.status = "active";
systemState.bootTime = new Date().toISOString();

if(Array.isArray(modules)){
systemState.modulesActive = modules;
}

consciousMonitor.logEvent(
"kernel_boot",
"AI Mother Kernel iniciado"
);

console.log("AI Mother Kernel activo");

}catch(error){

console.log("Error boot kernel:",error);

}

}

/* ===============================
   PROCESAR EVENTO
================================ */

function processEvent(type,data){

try{

const event = {
type,
data,
time:new Date().toISOString()
};

systemState.events.unshift(event);

/* limitar memoria */

if(systemState.events.length > 100){
systemState.events.pop();
}

consciousMonitor.logEvent(
"kernel_event",
type
);

}catch(error){

console.log("Kernel event error:",error);

}

}

/* ===============================
   CICLO DEL KERNEL
================================ */

function cycle(){

try{

systemState.lastCycle = new Date().toISOString();
systemState.cycleCount++;

console.log(
"AI Mother Kernel ciclo ejecutado",
"Total ciclos:",systemState.cycleCount
);

}catch(error){

console.log("Kernel cycle error:",error);

}

}

/* ===============================
   OBTENER ESTADO
================================ */

function getState(){
return systemState;
}

module.exports={
boot,
processEvent,
cycle,
getState
};