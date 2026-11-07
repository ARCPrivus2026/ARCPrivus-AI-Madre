import test from "node:test";
import assert from "node:assert/strict";
import {
  ARC_SCENE_VERSION, auditAvatarRig, planIntegratedScene, runIntegratedScene
} from "./integrated-scene-runtime.mjs";

const baseRig=()=>({
  bones:["LeftHand","RightHand","LeftFoot","RightFoot","Head","LeftEye","RightEye"],
  morphs:["jawOpen","eyeBlink"],
  clips:["Idle","Walk","Run","Sit","Stand"],
  clipMap:{idle:"Idle",walk:"Walk",run:"Run",sit:"Sit",stand:"Stand"},
  voiceEnabled:true
});
const both=()=>({natalia:baseRig(),copiloto:baseRig()});
const scene=()=>({
  manifests:both(),
  cues:[
    {atMs:0,character:"natalia",action:"idle"},
    {atMs:0,character:"copiloto",action:"idle"},
    {atMs:100,character:"natalia",action:"walk",speed:1.15},
    {atMs:100,character:"copiloto",action:"run",speed:1.1},
    {atMs:100,character:"natalia",action:"speak",text:"Caminemos juntos."},
    {atMs:200,character:"natalia",action:"blink"},
    {atMs:200,character:"copiloto",action:"look"},
    {atMs:300,character:"copiloto",action:"speak",text:"Te acompano."},
    {atMs:500,character:"natalia",action:"sit"},
    {atMs:500,character:"copiloto",action:"stand"},
    {atMs:750,character:"natalia",action:"stand"},
    {atMs:750,character:"copiloto",action:"walk"}
  ]
});
test("AUDITORIA RIG: manos, pies, ojos, boca, animaciones y voz",()=>{
  const ready=auditAvatarRig(baseRig());
  assert.equal(ready.ready,true);
  assert.equal(ready.issues.length,0);
  const missing=baseRig();
  missing.bones=missing.bones.filter(x=>x!=="RightHand");
  missing.morphs=["eyeBlink"];
  const broken=auditAvatarRig(missing);
  assert.equal(broken.ready,false);
  assert.match(broken.issues.join(" "),/mano derecha/);
  assert.match(broken.issues.join(" "),/apertura de boca/);
});
test("ENSAYO INTEGRAL: Natalia y Copiloto caminan, corren, hablan y gesticulan en la misma escena",async()=>{
  const plan=planIntegratedScene(scene());
  assert.equal(plan.version,ARC_SCENE_VERSION);
  assert.deepEqual(plan.characters,["copiloto","natalia"]);
  const dispatched=[];
  const adapter={
    motion:async event=>dispatched.push(["motion",event.command.character,event.command.action,event.clip]),
    face:async event=>dispatched.push(["face",event.command.character,event.command.action]),
    voice:async event=>dispatched.push(["voice",event.command.character,event.command.text])
  };
  let virtualMs=0;
  const result=await runIntegratedScene(plan,{adapter,sleep:async ms=>{virtualMs+=ms;}});
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(result.events.length,12);
  assert.equal(virtualMs,750);
  assert.ok(dispatched.some(x=>x[0]==="voice"&&x[1]==="natalia"));
  assert.ok(dispatched.some(x=>x[0]==="voice"&&x[1]==="copiloto"));
  assert.ok(dispatched.some(x=>x[0]==="motion"&&x[1]==="copiloto"&&x[2]==="run"));
  assert.ok(dispatched.some(x=>x[0]==="face"&&x[2]==="blink"));
});
test("BLOQUEO INTEGRAL: un personaje incompleto no recibe eventos",()=>{
  const input=scene();
  input.manifests.copiloto.bones=["LeftHand","LeftFoot","RightFoot","Head","LeftEye","RightEye"];
  assert.throws(()=>planIntegratedScene(input),/mano derecha/);
});
test("NO pisar dos clips del mismo personaje y canal en un mismo instante",()=>{
  const input=scene();
  input.cues.push({atMs:100,character:"natalia",action:"run"});
  assert.throws(()=>planIntegratedScene(input),/Dos comandos simultaneos/);
});
test("ERROR DE ADAPTADOR: no marcar exito ni continuar la secuencia",async()=>{
  const plan=planIntegratedScene(scene());
  const adapter={
    motion:async e=>{if(e.command.action==="run") throw new Error("clip ilegible");},
    face:async()=>{},
    voice:async()=>{}
  };
  const result=await runIntegratedScene(plan,{adapter,sleep:async()=>{}});
  assert.equal(result.ok,false);
  assert.match(result.error,/Fallo de copiloto\/run/);
  assert.ok(result.events.some(x=>x.ok===false));
});
