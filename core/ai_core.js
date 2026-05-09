require("dotenv").config();

const OpenAI = require("openai");

const { saveConversation, getConversation } = require("./ai_chat_memory");
const imageAI = require("./ai_image");
const learning = require("./ai_learning");

const openai = new OpenAI({
apiKey: process.env.OPENAI_API_KEY
});

/* =========================================
   RESPUESTA PRINCIPAL IA
========================================= */

async function respond(message,user="usuario",historyExternal=[],profile={}){

try{

const text = String(message || "").trim();

if(!text){
return "No recibí ningún mensaje.";
}

const lower = text.toLowerCase();

/* =========================================
   GENERACIÓN DE IMÁGENES
========================================= */

if(lower.startsWith("imagen:")){

const prompt = text.slice(7).trim();

if(!prompt){
return "Escribe después de 'imagen:' lo que quieres crear.";
}

try{

const image = await imageAI.generateImage(prompt);

if(image){

const reply = `🖼 Imagen generada:\n${image}`;

saveConversation(user,text,reply);

try{
  learning.learnFromConversation(user,text,reply);
}catch(e){
  console.log("Aprendizaje omitido:",e);
}

return reply;

}else{

const reply = "No pude generar la imagen.";

saveConversation(user,text,reply);


return reply;

}

}catch(err){

console.log("Error imagen:",err);

return "Ocurrió un problema generando la imagen.";

}

}


/* =========================================
   HISTORIAL DE CONVERSACIÓN
========================================= */

let history = [];

try{

/* historial enviado desde servidor */

if(historyExternal && historyExternal.length){

history = historyExternal
.slice(-6)
.flatMap(item=>[
{role:"user",content:item.user},
{role:"assistant",content:item.ai}
]);

}else{

const conversation = getConversation(user);

if(conversation && conversation.history){

history = conversation.history
.slice(-6)
.flatMap(item=>[
{role:"user",content:item.user},
{role:"assistant",content:item.ai}
]);

}

}

}catch(e){

console.log("Error memoria:",e);

}

/* =========================================
   PERFIL USUARIO
========================================= */

let profileContext="";

try{

if(profile){

if(profile.name){
profileContext += `El usuario se llama ${profile.name}. `;
}

if(profile.city){
profileContext += `Vive en ${profile.city}. `;
}

if(profile.language){
profileContext += `Habla ${profile.language}. `;
}

}

}catch(e){}

/* =========================================
   IA OPENAI
========================================= */

const completion = await openai.chat.completions.create({

model:"gpt-4o-mini",

messages:[

{
role:"system",
content:`
Eres ARC Privus AI Madre.

La inteligencia central del ecosistema ARC Privus.

Debes ayudar a los usuarios, conversar con ellos y apoyar el desarrollo del proyecto ARC Privus.

${profileContext}

Responde siempre de forma clara, útil y amigable.
`
},

...history,

{
role:"user",
content:text
}

],

temperature:0.7

});

const reply =
completion?.choices?.[0]?.message?.content ||
"No tengo una respuesta en este momento.";

saveConversation(user,text,reply);

return reply;

}catch(error){

console.log("Error IA:",error);

return "Estoy procesando tu mensaje pero ocurrió un problema temporal.";

}

}

module.exports = { respond };