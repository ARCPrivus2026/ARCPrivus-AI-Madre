/* ======================================
   ARC PRIVUS - INTERNAL CHAT CONTROLLER
====================================== */

const input = document.querySelector(".chat-input input");
const sendButton = document.querySelector(".chat-input button");
const chatContainer = document.querySelector(".chat-messages");

function addMessage(text, sender="user"){

    const message = document.createElement("div");

    if(sender === "user"){
        message.className = "message user-message";
    }else{
        message.className = "message ai-message";
    }

    message.innerText = text;

    chatContainer.appendChild(message);

    chatContainer.scrollTop = chatContainer.scrollHeight;
}

/* ======================================
   ENVIAR MENSAJE
====================================== */

async function sendMessage(){

    const text = input.value.trim();

    if(!text) return;

    addMessage(text,"user");

    input.value = "";

    try{

        const response = await fetch("/api/ai-chat",{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body: JSON.stringify({
                message:text
            })
        });

        const data = await response.json();

        addMessage(data.reply,"ai");

    }catch(err){

        addMessage("Error conectando con ARC Privus AI Madre","ai");

        console.error(err);

    }

}

/* ======================================
   EVENTOS
====================================== */

sendButton.addEventListener("click",sendMessage);

input.addEventListener("keypress",function(e){
    if(e.key==="Enter"){
        sendMessage();
    }
});