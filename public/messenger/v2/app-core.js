console.log("ARC PRIVUS CORE CARGADO");

document.addEventListener("DOMContentLoaded",()=>{

const socket = io();

const messages = document.getElementById("messages");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const logo = document.getElementById("logoArc");

const msgSound = new Audio("./assets/msg.mp3");

let user = "Arnaldo";

/* =====================
   LOGO INTERACTIVO
===================== */

let zoom=false;

if(logo){

logo.onclick=()=>{

zoom=!zoom;

if(zoom){

logo.classList.add("zoom");

}else{

logo.classList.remove("zoom");

}

};

}

/* =====================
   CREAR BURBUJAS
===================== */

function createBubble(text,who){

const div=document.createElement("div");
div.className="bubble "+who;

const span=document.createElement("span");
span.innerText=text;

div.appendChild(span);

/* hora */

const time=document.createElement("span");
time.className="msgTime";

const now=new Date();

time.innerText =
now.getHours()+":"+String(now.getMinutes()).padStart(2,"0");

div.appendChild(time);

/* checks estilo WhatsApp */

if(who==="user"){

const check=document.createElement("span");
check.className="checks";
check.innerText="✓";

div.appendChild(check);

setTimeout(()=>{
check.innerText="✓✓";
},800);

}

messages.appendChild(div);
messages.scrollTop=messages.scrollHeight;

}

/* =====================
   ENVIAR MENSAJE
===================== */

function sendMessage(){

const text=input.value.trim();

if(!text) return;

createBubble(text,"user");

input.value="";

/* sonido */

msgSound.play().catch(()=>{});

/* respuesta IA simulada */

setTimeout(()=>{

const reply="He analizado tu mensaje.";

createBubble(reply,"bot");

msgSound.play().catch(()=>{});

},900);

}

/* =====================
   EVENTOS
===================== */

sendBtn.onclick=sendMessage;

input.addEventListener("keypress",(e)=>{

if(e.key==="