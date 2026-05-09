const supervisor = require("./ai_supervisor");
const orchestrator = require("./ai_orchestrator");

/* ===============================
   CEREBRO CENTRAL AI MADRE
================================ */

async function processMessage(message,user){

try{

if(!message){
return "No recibí ningún mensaje.";
}

/* supervisión del sistema */

await supervisor.supervise(message,user);

/* procesamiento principal */

const response = await orchestrator.orchestrate(message,user);

return response;

}catch(error){

console.log("Error AI Madre:",error);

return "AI Madre encontró un problema procesando el mensaje.";

}

}

module.exports = {
processMessage
};