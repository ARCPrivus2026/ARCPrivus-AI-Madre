console.log("ARC VOICE ENGINE ACTIVADO");

let recognition;

if ('webkitSpeechRecognition' in window) {

recognition = new webkitSpeechRecognition();

recognition.lang = "es-ES";

recognition.continuous = false;

recognition.interimResults = false;

recognition.onresult = function(event){

const text = event.results[0][0].transcript;

document.getElementById("messageInput").value = text;

};

}

function startVoice(){

if(recognition){

recognition.start();

}

}

function speak(text){

if(!("speechSynthesis" in window)) return;

const speech = new SpeechSynthesisUtterance(text);

speech.lang="es-ES";

speech.rate=1;

speech.pitch=1;

speech.volume=1;

window.speechSynthesis.speak(speech);

}

window.ARC_VOICE={

startVoice,

speak

};