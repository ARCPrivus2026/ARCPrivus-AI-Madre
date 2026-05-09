const fs = require("fs");
const path = require("path");
const learning = require("./learning_engine");

/* cargar identidad */

const identityPath = path.join(__dirname,"..","memory","identity.json");

let identity = {};

try{
identity = JSON.parse(fs.readFileSync(identityPath,"utf8"));
}catch{
identity = {};
}

async function processMessage(message,user){

try{

message = String(message || "").toLowerCase();

/* aprendizaje */
learning.analyzeMessage(message);

/* respuestas */

if(message.includes("hola")){
return "Hola. Soy ARC Privus AI Madre. ¿En qué puedo ayudarte?";
}

if(message.includes("quien eres")){
return "Soy ARC Privus AI Madre, el núcleo inteligente del ecosistema ARC Privus.";
}

if(message.includes("arc privus")){
return "ARC Privus es un ecosistema de inteligencia artificial creado por Arnaldo Ramírez Campiño.";
}

if(message.includes("creador") || message.includes("quien te creo")){
return "Mi creador es " + identity.creator + ", " + identity.role + ".";
}

if(message.includes("que has aprendido")){
const topics = learning.getTopTopics(5);
return "Estoy aprendiendo sobre: " + topics.join(", ");
}

/* respuesta por defecto */

return "He recibido tu mensaje: " + message;

}catch(error){

console.log("Error AI Madre:",error.message);

return "Hubo un problema procesando el mensaje.";

}

}

module.exports = {
processMessage
};