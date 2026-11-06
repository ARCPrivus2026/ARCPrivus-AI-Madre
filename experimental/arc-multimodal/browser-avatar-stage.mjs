/**
 * ARC - puente de carga local GLB y voz basica de navegador.
 * Inyectar GLTFLoader y THREE desde el app existente. Sin clave/API/costo.
 */
import {createThreeAvatarAdapter} from "./three-avatar-adapter.mjs";
import {planIntegratedScene,runIntegratedScene} from "./integrated-scene-runtime.mjs";

export function createBrowserSpeechDriver({
  synth=globalThis.speechSynthesis,
  Utterance=globalThis.SpeechSynthesisUtterance,
  lang="es-CO",rate=1,voiceName
}={}){
  if(typeof synth?.speak!=="function" || typeof Utterance!=="function"){
    throw new Error("SpeechSynthesis del navegador no disponible");
  }
  if(!Number.isFinite(rate) || rate<0.5 || rate>2) throw new RangeError("Velocidad de voz invalida");
  return {
    start({text,onStart,onEnd}={}){
      if(typeof text!=="string" || !text.trim()) throw new TypeError("Texto de voz vacio");
      const utterance=new Utterance(text.trim());
      utterance.lang=lang;utterance.rate=rate;
      if(voiceName && typeof synth.getVoices==="function"){
        const voice=synth.getVoices().find(v=>v.name===voiceName);
        if(voice) utterance.voice=voice;
      }
      let resolveDone,rejectDone,finished=false;
      const done=new Promise((resolve,reject)=>{
        resolveDone=resolve;rejectDone=reject;
      });
      function finish(error){
        if(finished) return;
        finished=true;
        try{if(typeof onEnd==="function") onEnd();}catch(errorIgnored){}
        if(error) rejectDone(error);
        else resolveDone();
      }
      utterance.onstart=()=>{if(typeof onStart==="function") onStart();};
      utterance.onend=()=>finish();
      utterance.onerror=event=>finish(new Error("SpeechSynthesis: "+String(event?.error||"fallo")));
      try{synth.speak(utterance);}catch(error){finish(error);throw error;}
      return {
        done,
        stop(){
          if(!finished){
            if(typeof synth.cancel==="function") synth.cancel();
            finish(new Error("Reproduccion cancelada"));
          }
        }
      };
    }
  };
}

/**
 * Solo acepta rutas de archivos servidos desde esta instalacion. Una URL externa
 * o data URI puede permitir trafico no deseado; la app decide el directorio.
 * GLTFLoader.loadAsync soporta /models/natalia.glb o ./models/natalia.glb.
 */
export async function loadArcAvatarStage({
  THREE,loader,paths,speakers,lookControllers={},clipMaps={}
}={}){
  if(typeof loader?.loadAsync!=="function") throw new TypeError("GLTFLoader.loadAsync requerido");
  if(!paths?.natalia || !paths?.copiloto) throw new Error("Faltan dos rutas GLB");
  for(const path of [paths.natalia,paths.copiloto]){
    if(typeof path!=="string" || !/^(\/(?!\/)|\.\/)[a-zA-Z0-9_./% -]+\.gl(?:b|tf)$/i.test(path)
        || path.includes("..")) {
      throw new TypeError("Ruta GLB no local: "+path);
    }
  }
  // Solo carga archivos y construye el adaptador: no cambia la escena principal.
  const [natalia,copiloto]=await Promise.all([
    loader.loadAsync(paths.natalia),
    loader.loadAsync(paths.copiloto)
  ]);
  const adapter=createThreeAvatarAdapter({
    THREE,
    actors:{
      natalia:{gltf:natalia,speaker:speakers?.natalia,look:lookControllers.natalia,clipMap:clipMaps.natalia},
      copiloto:{gltf:copiloto,speaker:speakers?.copiloto,look:lookControllers.copiloto,clipMap:clipMaps.copiloto}
    }
  });
  const audits={
    natalia:adapter.inspect("natalia").audit,
    copiloto:adapter.inspect("copiloto").audit
  };
  return {
    ready:audits.natalia.ready && audits.copiloto.ready,
    audits,roots:{natalia:natalia.scene,copiloto:copiloto.scene},
    update:deltaSeconds=>adapter.update(deltaSeconds),
    play:async cues=>{
      const plan=planIntegratedScene({cues,manifests:adapter.manifests});
      const result=await runIntegratedScene(plan,{adapter});
      // El resultado representa inicio de eventos; la voz puede seguir activa.
      return result;
    },
    waitForVoices:()=>adapter.waitForVoices(),
    dispose:()=>adapter.dispose()
  };
}
