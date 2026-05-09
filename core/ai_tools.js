/* ===============================
   HORA ACTUAL
================================ */

function getTime(){

const time = new Date().toLocaleTimeString("es-CO",{
hour:"2-digit",
minute:"2-digit",
second:"2-digit"
});

return "🕒 La hora actual es " + time;

}

/* ===============================
   FECHA ACTUAL
================================ */

function getDate(){

const date = new Date().toLocaleDateString("es-CO",{
weekday:"long",
year:"numeric",
month:"long",
day:"numeric"
});

return "📅 Hoy es " + date;

}

/* ===============================
   AYUDA IA
================================ */

function help(){

return `
🤖 **ARC Privus AI Madre**

Puedo ayudarte con:

• conversar contigo
• responder preguntas
• recordar información
• guardar recordatorios
• generar imágenes
• traducir texto
• ayudarte con el proyecto ARC Privus

Ejemplos que puedes probar:

hora  
fecha  
traduce: hola mundo  
recuerda: reunión mañana  
imagen: pantera futurista azul

Estoy aquí para ayudarte.
`;

}

/* ===============================
   EXPORTAR HERRAMIENTAS
================================ */

module.exports={
getTime,
getDate,
help
};