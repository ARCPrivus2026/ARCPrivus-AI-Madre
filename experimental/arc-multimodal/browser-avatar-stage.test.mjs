import test from "node:test";
import {fakeSkinnedLimbMesh} from "./testing-glb-fixtures.mjs";
import assert from "node:assert/strict";
import {createBrowserSpeechDriver,loadArcAvatarStage} from "./browser-avatar-stage.mjs";

class Utterance {
  constructor(text){this.text=text;}
}
function synth(){
  return {
    queued:[],
    speak(utterance){this.queued.push(utterance);},
    cancel(){this.cancelled=true;},
    getVoices(){return [{name:"Español"}];}
  };
}
class Action {
  reset(){return this;} setEffectiveTimeScale(){return this;}
  fadeIn(){return this;} fadeOut(){return this;} play(){return this;}
  stop(){return this;}
}
class Mixer {
  constructor(){this.a=new Action();}
  clipAction(){return this.a;}
  update(){}
  stopAllAction(){}
  uncacheRoot(){}
}
const THREE={AnimationMixer:Mixer};
function gltf(){
  const face={morphTargetDictionary:{jawOpen:0,eyeBlink:1},morphTargetInfluences:[0,0]};
  const bones=["LeftHand","RightHand","LeftFoot","RightFoot","Head","LeftEye","RightEye"]
    .map(name=>({name,isBone:true}));
  return {
    animations:["Idle","Walk","Run","Sit","Stand"].map(name=>({name})),
    scene:{traverse(fn){[...bones,face,fakeSkinnedLimbMesh()].forEach(fn);}}
  };
}

test("Web Speech driver inicia, termina y selecciona voz disponible",async()=>{
  const synthInstance=synth();
  const driver=createBrowserSpeechDriver({
    synth:synthInstance,Utterance,voiceName:"Español"
  });
  let started=0,ended=0;
  const handle=driver.start({
    text:"Hola",onStart:()=>started++,onEnd:()=>ended++
  });
  const utterance=synthInstance.queued[0];
  assert.equal(utterance.lang,"es-CO");
  assert.equal(utterance.voice.name,"Español");
  utterance.onstart();
  utterance.onend();
  await handle.done;
  assert.equal(started,1);
  assert.equal(ended,1);
});
test("Web Speech errores son fallos, no voces completadas",async()=>{
  const s=synth();
  const driver=createBrowserSpeechDriver({synth:s,Utterance});
  const handle=driver.start({text:"Error"});
  s.queued[0].onerror({error:"synthesis-failed"});
  await assert.rejects(handle.done,/synthesis-failed/);
});
test("Carga simulada por GLTFLoader para Natalia y Copiloto; reproduce eventos",async()=>{
  const paths=[];
  const loader={async loadAsync(path){paths.push(path);return gltf();}};
  const s=synth();
  const voice=createBrowserSpeechDriver({synth:s,Utterance});
  const stage=await loadArcAvatarStage({
    THREE,loader,
    paths:{natalia:"/models/Natalia.glb",copiloto:"./models/Copiloto.glb"},
    speakers:{natalia:voice,copiloto:voice},
    lookControllers:{natalia:async()=>{},copiloto:async()=>{}}
  });
  assert.equal(stage.ready,true);
  assert.deepEqual(paths,["/models/Natalia.glb","./models/Copiloto.glb"]);
  const result=await stage.play([
    {atMs:0,character:"natalia",action:"walk"},
    {atMs:0,character:"copiloto",action:"run"},
    {atMs:0,character:"natalia",action:"speak",text:"Hola"},
    {atMs:0,character:"copiloto",action:"blink"},
    {atMs:1,character:"copiloto",action:"look"}
  ]);
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(s.queued.length,1);
  s.queued[0].onstart();
  stage.update(0.016);
  s.queued[0].onend();
  await stage.waitForVoices();
  stage.dispose();
});
test("Rechaza URL remotas y rutas traversal antes de descargar",async()=>{
  const loader={async loadAsync(){throw new Error("No debe cargar");}};
  for(const invalid of [
    "https://malicioso.example/avatar.glb","//fuera/archivo.glb",
    "../secretos.glb","/../secretos.glb","/models/%2e%2e/secretos.glb"
  ]){
    await assert.rejects(
      loadArcAvatarStage({THREE,loader,paths:{natalia:invalid,copiloto:"./b.glb"}}),
      /Ruta GLB no local/
    );
  }
});
