import test from "node:test";
import {fakeSkinnedLimbMesh} from "./testing-glb-fixtures.mjs";
import assert from "node:assert/strict";
import {inspectLoadedGlb,createThreeAvatarAdapter} from "./three-avatar-adapter.mjs";
import {planIntegratedScene,runIntegratedScene} from "./integrated-scene-runtime.mjs";

class Action {
  constructor(clip){this.clip=clip;this.started=0;}
  reset(){return this;}
  setEffectiveTimeScale(v){this.speed=v;return this;}
  fadeIn(v){this.fadeInSec=v;return this;}
  fadeOut(v){this.fadeOutSec=v;return this;}
  stop(){this.stopped=true;return this;}
  play(){this.started++;return this;}
}
class Mixer {
  constructor(root){this.root=root;this.actions=new Map();this.updates=[];}
  clipAction(clip){
    if(!this.actions.has(clip.name)) this.actions.set(clip.name,new Action(clip));
    return this.actions.get(clip.name);
  }
  update(delta){this.updates.push(delta);}
  stopAllAction(){this.stopped=true;}
  uncacheRoot(root){this.uncached=root;}
}
const THREE={AnimationMixer:Mixer};
function gltf(){
  const mesh={
    name:"face",morphTargetDictionary:{jawOpen:0,eyeBlink:1},
    morphTargetInfluences:[0,0]
  };
  const bones=["LeftHand","RightHand","LeftFoot","RightFoot","Head","LeftEye","RightEye"]
    .map(name=>({name,isBone:true}));
  return {
    scene:{traverse(fn){[...bones,mesh,fakeSkinnedLimbMesh()].forEach(fn);}},
    animations:["Idle","Walk","Run","Sit","Stand"].map(name=>({name})),
    mesh
  };
}
function speaker(){
  const calls=[],pending=[];
  return {
    calls,pending,
    async start({text,onStart,onEnd}){
      calls.push(text);onStart();
      let resolveDone;
      const done=new Promise(resolve=>{resolveDone=resolve;});
      const finish=()=>{onEnd();resolveDone();};
      pending.push(finish);
      return {done,stop:finish};
    }
  };
}
function actors(){
  return Object.fromEntries(["natalia","copiloto"].map(name=>[
    name,{gltf:gltf(),speaker:speaker(),look:async()=>{}}
  ]));
}
const cues=[
  {atMs:0,character:"natalia",action:"idle"},
  {atMs:0,character:"copiloto",action:"idle"},
  {atMs:100,character:"natalia",action:"walk"},
  {atMs:100,character:"copiloto",action:"run",speed:1.2},
  {atMs:100,character:"natalia",action:"speak",text:"Hola"},
  {atMs:150,character:"copiloto",action:"speak",text:"Buenos dias"},
  {atMs:200,character:"natalia",action:"blink"},
  {atMs:200,character:"copiloto",action:"look"},
  {atMs:300,character:"natalia",action:"sit"},
  {atMs:300,character:"copiloto",action:"stand"}
];
test("GLTF: inventario real de estructuras con clips y morphs",()=>{
  const info=inspectLoadedGlb(gltf(),{voiceEnabled:true});
  assert.equal(info.audit.ready,true);
  assert.equal(info.manifest.clipMap.run,"Run");
  assert.deepEqual(info.manifest.morphs,["jawOpen","eyeBlink"]);
});
test("INTEGRAL: dos cuerpos, voz, mirada, boca, parpadeo, sin internet",async()=>{
  const model=actors();
  const adapter=createThreeAvatarAdapter({THREE,actors:model});
  const plan=planIntegratedScene({cues,manifests:adapter.manifests});
  const result=await runIntegratedScene(plan,{adapter,sleep:async()=>{}});
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(result.events.length,10);
  assert.deepEqual(model.natalia.speaker.calls,["Hola"]);
  assert.deepEqual(model.copiloto.speaker.calls,["Buenos dias"]);
  adapter.update(0.05);
  assert.ok(model.natalia.gltf.mesh.morphTargetInfluences[0]>0);
  adapter.update(0.1);
  assert.equal(model.natalia.gltf.mesh.morphTargetInfluences[1],0);
  model.natalia.speaker.pending[0]();
  model.copiloto.speaker.pending[0]();
  await adapter.waitForVoices();
  assert.equal(model.natalia.gltf.mesh.morphTargetInfluences[0],0);
  adapter.dispose();
});
test("Rechaza rig con mano o boca faltante sin afirmar calidad",()=>{
  const rig=gltf();
  rig.scene.traverse=fn=>[
    {name:"LeftHand",isBone:true},{name:"LeftFoot",isBone:true},
    {name:"RightFoot",isBone:true},{name:"Head",isBone:true},
    {name:"LeftEye",isBone:true},{name:"RightEye",isBone:true},rig.mesh
  ].forEach(fn);
  rig.mesh.morphTargetDictionary={eyeBlink:1};
  const inspection=inspectLoadedGlb(rig,{voiceEnabled:true});
  assert.equal(inspection.audit.ready,false);
  assert.match(inspection.audit.issues.join("; "),/mano derecha/);
  assert.match(inspection.audit.issues.join("; "),/apertura de boca/);
});
test("Sin controlador de mirada, error real en canal facial",async()=>{
  const model=actors();delete model.copiloto.look;
  const adapter=createThreeAvatarAdapter({THREE,actors:model});
  const plan=planIntegratedScene({cues,manifests:adapter.manifests});
  const result=await runIntegratedScene(plan,{adapter,sleep:async()=>{}});
  assert.equal(result.ok,false);
  assert.match(result.error,/copiloto\/look/);
  adapter.dispose();
});
test("Sin clip de sentarse, bloquea toda la escena",()=>{
  const model=actors();
  model.natalia.gltf.animations=model.natalia.gltf.animations.filter(clip=>clip.name!=="Sit");
  const adapter=createThreeAvatarAdapter({THREE,actors:model});
  assert.equal(adapter.inspect("natalia").audit.ready,false);
  assert.throws(()=>planIntegratedScene({cues,manifests:adapter.manifests}),/clip ausente: sit/);
  adapter.dispose();
});
test("Control de salto de pantalla suspendida y cierre de recursos",()=>{
  const adapter=createThreeAvatarAdapter({THREE,actors:actors()});
  assert.throws(()=>adapter.update(-1),/deltaSeconds/);
  assert.throws(()=>adapter.update(NaN),/deltaSeconds/);
  adapter.update(60);
  adapter.dispose();
  adapter.update(0.1);
});
