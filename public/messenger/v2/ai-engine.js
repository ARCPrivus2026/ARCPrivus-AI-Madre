const userMemory = window.ARC_USER_MEMORY;

console.log("ARC AI ENGINE CARGADO");

/* =========================
   MEMORIA DE CONVERSACIÓN
========================= */

function loadMemory(){
  try{
    return JSON.parse(localStorage.getItem("arcMemory") || "{}");
  }catch{
    return {};
  }
}

function saveMemoryStore(store){
  localStorage.setItem("arcMemory", JSON.stringify(store));
}

function getUserMemory(user){
  const store = loadMemory();
  return store[user] || [];
}

function pushUserMemory(user, message, response){
  const store = loadMemory();

  if(!store[user]){
    store[user] = [];
  }

  store[user].push({
    msg: message,
    reply: response,
    time: Date.now()
  });

  /* limitar memoria a 300 mensajes */

  if(store[user].length > 300){
    store[user].shift();
  }

  saveMemoryStore(store);
}

function getLastMessages(user, n=10){
  const mem = getUserMemory(user);
  if(!mem.length) return [];
  return mem.slice(-n).map(x => x.msg);
}

/* =========================
   MOTOR IA
========================= */

window.ARC_AI_ENGINE = {

  respond(user, message){

    const msg = String(message || "").toLowerCase().trim();

    let response = "He analizado tu mensaje y sigo aprendiendo contigo.";

    const last = getLastMessages(user,10);

    /* =========================
       INTERESES DEL USUARIO
    ========================= */

    if(msg.includes("me gusta")){

      const interest = message.replace("me gusta","").trim();

      if(interest){
        userMemory.addInterest(user,interest);
        response = "Entendido. Recordaré que te gusta " + interest;
      }

    }

    /* =========================
       PERFIL DEL USUARIO
    ========================= */

    else if(msg.includes("que sabes de mi") || msg.includes("qué sabes de mí")){

      const profile = userMemory.getUserProfile(user);

      const intereses = profile.interests.length
        ? profile.interests.join(", ")
        : "aún no tengo intereses registrados";

      response = "Sé que eres " + profile.name + ". Intereses: " + intereses;

    }

    /* =========================
       SALUDO
    ========================= */

    else if(msg.includes("hola") || msg.includes("buenas")){

      response = "Hola " + user + ". Soy ARC Privus AI Madre. ¿En qué puedo ayudarte hoy?";

    }

    /* =========================
       IDENTIDAD
    ========================= */

    else if(msg.includes("quien eres") || msg.includes("qué eres")){

      response = "Soy ARC Privus AI Madre, la inteligencia central de ARC Privus.";

    }

    /* =========================
       ARC PRIVUS
    ========================= */

    else if(msg.includes("arc privus")){

      response = "ARC Privus es una plataforma de mensajería inteligente con inteligencia artificial integrada.";

    }

    /* =========================
       AYUDA
    ========================= */

    else if(msg.includes("ayuda")){

      response = "Puedo conversar contigo, recordarte cosas, traducir mensajes y asistirte dentro de ARC Privus.";

    }

    /* =========================
       MEMORIA
    ========================= */

    else if(msg.includes("recuerdas") || msg.includes("memoria")){

      const mem = getUserMemory(user);

      if(mem.length === 0){

        response = "Aún no tengo recuerdos guardados contigo.";

      }else{

        const temas = mem.slice(-5).map(m => m.msg).join(" | ");

        response = "Recuerdo que hablamos de: " + temas;

      }

    }

    /* =========================
       CONTEXTO
    ========================= */

    else if(msg.includes("que te dije") || msg.includes("qué te dije")){

      if(last.length){

        response = "Hace poco mencionaste: " + last.join(" | ");

      }else{

        response = "Todavía no tengo suficiente contexto de nuestra conversación.";

      }

    }

    /* =========================
       RESPUESTA GENERAL
    ========================= */

    else{

      if(last.length){

        response = "He analizado tu mensaje. Antes hablábamos de: " + last.join(" | ");

      }

    }

    /* =========================
       GUARDAR MEMORIA
    ========================= */

    pushUserMemory(user,message,response);

    return response;

  }

};
const msg = String(message || "").toLowerCase().trim();
/* =========================
   DETECCIÓN EMOCIONAL
========================= */

if(
msg.includes("estoy triste") ||
msg.includes("me siento mal") ||
msg.includes("estoy deprimido")
){

response="Lamento que te sientas así. Si quieres puedes contarme qué sucede.";

}

else if(
msg.includes("estoy cansado") ||
msg.includes("estoy agotado")
){

response="Parece que has tenido un día largo. Tal vez deberías descansar un poco.";

}

else if(
msg.includes("estoy feliz") ||
msg.includes("me siento bien")
){

response="Me alegra escuchar eso. Siempre es bueno saber que te sientes bien.";

}

else if(
msg.includes("estoy frustrado") ||
msg.includes("esto es difícil")
){

response="Entiendo que pueda ser frustrante. Si quieres puedo ayudarte a encontrar una solución.";
}