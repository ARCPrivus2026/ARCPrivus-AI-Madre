class AiVoiceEngine {

  constructor(){
    console.log("ai_voice_engine inicializado");
  }

  run(){

    try{

      console.log("ai_voice_engine ejecutando tarea");

    }catch(error){

      console.log("Error en ai_voice_engine:", error);

    }

  }

}

module.exports = new AiVoiceEngine();