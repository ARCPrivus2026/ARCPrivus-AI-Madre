const fs = require("fs");
const path = require("path");

/* ===============================
   CARPETA DE DATOS
================================ */

function actionsFolder(){

const folder = path.join(__dirname,"..","memory","actions");

if(!fs.existsSync(folder)){
fs.mkdirSync(folder,{recursive:true});
}

return folder;

}

/* ===============================
   NOMBRE SEGURO
================================ */

function safeUser(user){

return String(user || "usuario")
.replace(/[^\w\-]/g,"_")
.toLowerCase();

}

/* ===============================
   GUARDAR RECORDATORIO
================================ */

function addReminder(user,text){

const file = path.join(actionsFolder(),safeUser(user)+"_reminders.json");

let data=[];

try{

if(fs.existsSync(file)){
data = JSON.parse(fs.readFileSync(file,"utf8"));
}

}catch{
data=[];
}

data.push({
text:text,
date:new Date().toISOString()
});

fs.writeFileSync(file,JSON.stringify(data,null,2));

return "📝 He guardado tu recordatorio.";

}

/* ===============================
   LISTAR RECORDATORIOS
================================ */

function listReminders(user){

const file = path.join(actionsFolder(),safeUser(user)+"_reminders.json");

if(!fs.existsSync(file)){
return "No tienes recordatorios guardados.";
}

let data=[];

try{

data = JSON.parse(fs.readFileSync(file,"utf8"));

}catch{

return "Hubo un problema leyendo tus recordatorios.";

}

if(data.length===0){
return "No tienes recordatorios.";
}

let text="📌 Tus recordatorios:\n\n";

data.forEach((r,i)=>{

const date = new Date(r.date).toLocaleDateString("es-CO");

text+= (i+1)+". "+r.text+" ("+date+")\n";

});

return text;

}

module.exports = {
addReminder,
listReminders
};