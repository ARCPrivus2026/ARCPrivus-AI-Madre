async function send(){

const msg = document.getElementById("msg").value;

const res = await fetch("/api/chat",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({message:msg})
});

const data = await res.json();

const chat = document.getElementById("chat");

chat.innerHTML += "<p><b>Tu:</b> "+msg+"</p>";
chat.innerHTML += "<p><b>IA:</b> "+data.reply+"</p>";

document.getElementById("msg").value="";

}