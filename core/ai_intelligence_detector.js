const creator = require("./ai_intelligence_creator");

class AIIntelligenceDetector {

constructor(){
console.log("AI Intelligence Detector iniciado");
}

/* =====================================
 DETECTAR TIPO DE MENSAJE
===================================== */

detect(message){

if(!message) return "unknown";

message = message.toLowerCase();

/* preguntas */

if(message.includes("?")){
return "question";
}

/* saludo */

if(
message.includes("hola") ||
message.includes("buenos") ||
message.includes("saludos")
){
return "greeting";
}

/* imagen */

if(
message.includes("imagen") ||
message.includes("dibuja") ||
message.includes("crear imagen")
){
return "image_request";
}

/* video */

if(
message.includes("video") ||
message.includes("crear video")
){
return "video_request";
}

/* general */

return "general";

}

/* =====================================
 DETECTAR NUEVA INTELIGENCIA
===================================== */

detectNewIntelligence(message){

const text = String(message || "").toLowerCase();

if(text.includes("bot") || text.includes("inteligencia")){

const name = "generated_ai_" + Date.now();

creator.createNewIntelligence(
name,
"Inteligencia generada a partir de conversación"
);

}

}

}

module.exports = new AIIntelligenceDetector();