const os = require("os");
const fs = require("fs");
const path = require("path");

const errorGuardian = require("./ai_error_guardian");

/* ===============================
   CARPETA DE ESTADO DEL SISTEMA
================================ */

function healthFolder(){

const folder = path.join(__dirname,"..","memory","health");

if(!fs.existsSync(folder)){
fs.mkdirSync(folder,{recursive:true});
}

return folder;

}

/* ===============================
   ARCHIVO DE ESTADO
================================ */

function healthFile(){
return path.join(healthFolder(),"health.json");
}

/* ===============================
   GUARDAR ESTADO
================================ */

function saveHealth(data){

const file = healthFile();

fs.writeFileSync(
file,
JSON.stringify(data,null,2),
"utf8"
);

}

/* ===============================
   OBTENER ESTADO DEL SISTEMA
================================ */

function getSystemHealth(){

try{

const totalMem = os.totalmem();
const freeMem = os.freemem();

const health = {

time:new Date().toISOString(),

system:{

platform:os.platform(),
uptime:os.uptime(),
cpuCount:os.cpus().length,
loadAverage:os.loadavg()

},

memory:{

total:totalMem,
free:freeMem,
used:totalMem-freeMem

},

process:{

pid:process.pid,
nodeVersion:process.version,
uptime:process.uptime()

},

errors:errorGuardian.getErrors()

};

saveHealth(health);

return health;

}catch(error){

console.log("Error health monitor:",error);

return null;

}

}

/* ===============================
   RESUMEN DE SALUD
================================ */

function getHealthSummary(){

const health = getSystemHealth();

if(!health){
return {status:"unknown"};
}

const usedMemoryPercent =
(health.memory.used/health.memory.total)*100;

let status = "healthy";

if(usedMemoryPercent > 80){
status = "warning";
}

if(usedMemoryPercent > 90){
status = "critical";
}

return {

status,
memoryUsage:usedMemoryPercent,
errors:health.errors.length,
cpuLoad:health.system.loadAverage

};

}

module.exports = {

getSystemHealth,
getHealthSummary

};