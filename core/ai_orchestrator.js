const reasoning = require("./ai_reasoning_engine");
const learning = require("./ai_learning");
const aiCore = require("./ai_core");
const tools = require("./ai_tools");
const actions = require("./ai_actions");
const memoryExtractor = require("./ai_memory_extractor");
const multiAI = require("./ai_multi_connector");
const openaiAI = require("./ai_openai_connector");
const agent = require("./ai_agent_loop");
multiAI.registerAI("openai",openaiAI.run);
/* ===============================
   DETECTAR INTENCIÓN
================================ */

function detectIntent(message){

const msg = String(message || "").toLowerCase();

if(msg.includes("hora")) return "time";

if(msg.includes("fecha")) return "date";

if(msg.includes("ayuda")) return "help";

if(msg.startsWith("traduce:")) return "translate";

if(msg.startsWith("recuerda:")) return "reminder";

if(msg.includes("mis recordatorios")) return "list_reminders";

return "chat";

}

/* ===============================
   ORQUESTADOR CENTRAL IA
================================ */

async function orchestrate(message,user,history=[],profile={}){

try{

/* analizar aprendizaje */
learning.analyze(message);

/* extraer datos del usuario */
memoryExtractor.extractUserInfo(user, message);

/* detectar intención */
const intent = detectIntent(message);
const analysis = reasoning.reason(message);

if(analysis.conclusions && analysis.conclusions.length){

console.log("AI razonamiento:",analysis.conclusions);

}
/* ===============================
   HERRAMIENTAS
================================ */

if(intent==="time"){
return tools.getTime();
}

if(intent==="date"){
return tools.getDate();
}

if(intent==="help"){
return tools.help();
}

if(intent==="translate"){

const text = message.replace("traduce:","").trim();

return await tools.translate(text,"en");

}

/* ===============================
   ACCIONES
================================ */

if(intent==="reminder"){

const text = message.replace("recuerda:","").trim();

return actions.addReminder(user,text);

}

if(intent==="list_reminders"){

return actions.listReminders(user);

}

/* ===============================
   IA PRINCIPAL
================================ */

return await agent.runAgent(
message,
user,
history,
profile
);

}catch(error){

console.log("Error en orquestador IA:",error);

return "Hubo un error procesando tu solicitud.";

}

}

module.exports = { orchestrate };