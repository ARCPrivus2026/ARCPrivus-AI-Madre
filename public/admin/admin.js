async function updateSystemPanel(){

try{

const res = await fetch("/api/system/status");
const data = await res.json();

const users = document.getElementById("usersCount");
const bots = document.getElementById("botsCount");
const messages = document.getElementById("messagesCount");

if(users) users.innerText = data.users;
if(bots) bots.innerText = data.bots;
if(messages) messages.innerText = data.messages;

}catch(e){

console.log("Error actualizando panel:", e);

}

}

setInterval(updateSystemPanel,3000);

updateSystemPanel();