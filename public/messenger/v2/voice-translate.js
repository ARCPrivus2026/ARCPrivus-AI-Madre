console.log("ARC VOICE TRANSLATOR ACTIVADO");

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

recognition.lang = "es-ES";
recognition.continuous = false;
recognition.interimResults = false;

async function startVoiceTranslate(targetLang="en"){

recognition.start();

recognition.onresult = async (event)=>{

const text = event.results[0][0].transcript;

console.log("Voz detectada:",text);

/* mostrar mensaje */

createBubble(text,"user");

/* traducir */

let translated = text;

try{

if(window.ARC_TRANSLATOR){
translated = await ARC_TRANSLATOR.translate(text,targetLang);
}

}catch(err){

console.warn("Error traducción voz",err);

}

/* mostrar traducción */

createBubble(translated,"bot");

/* hablar traducción */

const speech = new SpeechSynthesisUtterance(translated);

speech.lang = targetLang;

speechSynthesis.speak(speech);

};

}

window.ARC_VOICE_TRANSLATE = {

startVoiceTranslate

};