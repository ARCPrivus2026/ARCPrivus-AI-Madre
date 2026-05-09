console.log("ARC PRIVUS FEATURES ACTIVADO");

function showTyping(){

const messages=document.getElementById("messages");

const div=document.createElement("div");

div.className="bubble system";

div.id="typing";

div.innerText="ARC Privus está escribiendo...";

messages.appendChild(div);

}

function removeTyping(){

const t=document.getElementById("typing");

if(t) t.remove();

}

window.ARC_FEATURES={

showTyping,

removeTyping

};