document.addEventListener("DOMContentLoaded",()=>{

const messages = document.getElementById("messages")
const input = document.getElementById("messageInput")
const sendBtn = document.getElementById("sendBtn")

if(!messages || !input || !sendBtn){
console.error("Elementos del chat no encontrados")
return
}

/* ===============================
MOSTRAR MENSAJE
================================ */

function addMessage(text,type){

const msg = document.createElement("div")

msg.classList.add("msg")

if(type==="ai"){
msg.classList.add("ai")
}

if(type==="user"){
msg.classList.add("user")
}

msg.innerText = text

messages.appendChild(msg)

messages.scrollTop = messages.scrollHeight

}

/* ===============================
CONSULTAR IA
================================ */

async function askAI(message){

try{

const res = await fetch("/api/chat",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
message:message,
userId:"web-user"
})

})

const data = await res.json()

if(data.reply){

addMessage(data.reply,"ai")

}else{

addMessage("La IA no devolvió respuesta.","ai")

}

}catch(error){

console.error("Error conectando con IA:",error)

addMessage("Error conectando con ARC Privus AI Madre.","ai")

}

}

/* ===============================
ENVIAR MENSAJE
================================ */

function sendMessage(){

const text = input.value.trim()

if(!text) return

addMessage(text,"user")

input.value=""

addMessage("Procesando...","ai")

askAI(text)

}

/* ===============================
EVENTOS
================================ */

sendBtn.addEventListener("click",sendMessage)

input.addEventListener("keydown",(e)=>{

if(e.key==="Enter"){

e.preventDefault()

sendMessage()

}

})

/* ===============================
MENSAJE INICIAL
================================ */

addMessage("Hola, soy ARC Privus AI Madre. ¿En qué puedo ayudarte?","ai")

})