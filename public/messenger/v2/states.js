console.log("ARC PRIVUS STATES ACTIVADO");

let states=JSON.parse(localStorage.getItem("arcStates")||"[]");

function renderStates(){

const bar=document.getElementById("statesBar");

if(!bar) return;

bar.innerHTML="";

states.forEach(state=>{

if(Date.now()>state.expire) return;

const div=document.createElement("div");

div.className="state";

div.innerText=state.text;

bar.appendChild(div);

});

}

function saveState(text,time){

states.push({

text,

expire:Date.now()+time

});

localStorage.setItem("arcStates",JSON.stringify(states));

renderStates();

}

window.addEventListener("DOMContentLoaded",renderStates);

window.ARC_STATES={

saveState

};