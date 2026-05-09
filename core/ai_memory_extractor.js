const { addFact, setProfile, setPreference } = require("./ai_user_memory");

/* ===============================
   LIMPIAR TEXTO
================================ */

function clean(text){
return String(text || "")
.replace(/[.,!?]/g,"")
.trim();
}

/* ===============================
   EXTRAER INFORMACIÓN DEL USUARIO
================================ */

function extractUserInfo(user, message){

const raw = String(message || "");
const text = raw.toLowerCase();

/* ===============================
   NOMBRE DEL USUARIO
================================ */

if(text.includes("me llamo")){

const parts = raw.toLowerCase().split("me llamo");

if(parts[1]){

const name = clean(parts[1]).split(" ")[0];

setProfile(user,"nombre",name);

addFact(user,`El usuario se llama ${name}`);

}

}

/* ===============================
   PROFESIÓN
================================ */

if(text.includes("soy ") && !text.includes("soy de")){

const parts = raw.toLowerCase().split("soy ");

if(parts[1]){

const job = clean(parts[1]).split(" ")[0];

setProfile(user,"profesion",job);

addFact(user,`El usuario es ${job}`);

}

}

/* ===============================
   EMPRESA
================================ */

if(text.includes("mi empresa")){

const parts = raw.toLowerCase().split("mi empresa");

if(parts[1]){

const company = clean(parts[1]);

setProfile(user,"empresa",company);

addFact(user,`La empresa del usuario es ${company}`);

}

}

/* ===============================
   IDIOMA PREFERIDO
================================ */

if(text.includes("prefiero español")){
setPreference(user,"language","es");
}

if(text.includes("prefiero ingles") || text.includes("prefiero inglés")){
setPreference(user,"language","en");
}

}

/* ===============================
   EXPORTAR
================================ */

module.exports = {
extractUserInfo
};