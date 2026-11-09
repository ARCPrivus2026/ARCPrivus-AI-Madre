import test from "node:test";
import assert from "node:assert/strict";
import {createActorGateRecorder} from "./r5-actor-load-gate-audit.mjs";

const state=()=>({
  actorReady:false,gltfPresent:false,
  restPatchPresent:true,mouthInsertPresent:true,
  alertText:"Cargando Natalia",activeActor:"natalia"
});
test("GATE: HTTP success is not evidence actor.ready=true",async()=>{
  const current=state();
  const rec=createActorGateRecorder({readState:()=>current,now:()=>12345});
  const load=rec.wrapLoader(async()=>{current.gltfPresent=true;return "loaded";});
  assert.equal(await load(),"loaded");
  const report=rec.getReport();
  assert.equal(report.events.length,2);
  assert.equal(report.classification,"GLTF_PRESENT_GATE_NOT_READY");
  assert.equal(report.events[1].actorReady,false);
  assert.equal(report.events[1].gltfPresent,true);
  assert.equal(report.actorReadinessOverride,false);
  assert.equal(report.correctionApplied,false);
});
test("GATE: preserves actual loadActor exception and message",async()=>{
  const current=state();
  const rec=createActorGateRecorder({readState:()=>current});
  const error=new Error("Failed to parse GLB");
  const load=rec.wrapLoader(async()=>{throw error;});
  await assert.rejects(load(),e=>e===error);
  const report=rec.getReport();
  assert.equal(report.classification,"LOAD_OR_RUNTIME_ERROR_OBSERVED");
  assert.equal(report.events.at(-1).phase,"loadActor.rejected");
  assert.equal(report.events.at(-1).error.message,"Failed to parse GLB");
});
test("GATE: does not mark ready unless GLTF and readiness both verified",()=>{
  const current=state();
  const rec=createActorGateRecorder({readState:()=>current});
  current.actorReady=true;
  rec.observe("app.state");
  assert.notEqual(rec.getReport().classification,"READY_OBSERVED");
  current.gltfPresent=true;
  rec.observe("app.state.afterGLTF");
  assert.equal(rec.getReport().classification,"READY_OBSERVED");
});
test("GATE: V22 patch presence and alert text captured without changing actor",()=>{
  const current=state();
  current.restPatchPresent=false;
  current.mouthInsertPresent=false;
  const rec=createActorGateRecorder({readState:()=>current});
  const report=rec.observe("initial");
  assert.equal(report.restPatchPresent,false);
  assert.equal(report.mouthInsertPresent,false);
  assert.equal(report.alertText,"Cargando Natalia");
  assert.equal(current.actorReady,false);
});
test("GATE: browser error and promise rejection listeners are detached",()=>{
  const current=state(),map=new Map();
  const fakeWindow={
    addEventListener(name,fn){map.set(name,fn);},
    removeEventListener(name,fn){if(map.get(name)===fn)map.delete(name);}
  };
  const rec=createActorGateRecorder({readState:()=>current});
  const cleanup=rec.attachWindow(fakeWindow);
  map.get("error")({error:new Error("three runtime crash")});
  map.get("unhandledrejection")({reason:"bad async parser"});
  assert.equal(rec.getReport().classification,"LOAD_OR_RUNTIME_ERROR_OBSERVED");
  assert.equal(rec.getReport().events.length,2);
  cleanup();
  assert.equal(map.size,0);
});
test("GATE: loader bound context is preserved",async()=>{
  const current=state(),rec=createActorGateRecorder({readState:()=>current});
  const host={name:"Natalia",load:rec.wrapLoader(async function(){return this.name;})};
  assert.equal(await host.load(),"Natalia");
});
test("GATE: bounded event buffer prevents uncontrolled memory use",()=>{
  const rec=createActorGateRecorder({readState:state,maxEvents:2});
  rec.observe("a");rec.observe("b");rec.observe("c");
  assert.equal(rec.getReport().events.length,2);
  assert.equal(rec.getReport().events[0].phase,"b");
});
