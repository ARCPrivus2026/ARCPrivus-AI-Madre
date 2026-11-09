import test from "node:test";
import assert from "node:assert/strict";
import {
  inspectR5FaceLayerContext,traceR5FaceLayerGate
} from "./r5-face-layer-second-gate.mjs";

const ready=()=>({ready:true});
function success(){
  return {__R5_FACE_LAYER_CONTEXT:{
    state:{actors:{natalia:{gltf:{scene:{traverse(){}}}}}}
  }};
}
test("R5: independent Natalia READY does NOT imply custom context exists",()=>{
  const report=inspectR5FaceLayerContext({
    browserWindow:{ARNOLDVERSE:{}},inspectNatalia:ready
  });
  assert.equal(report.independent.readyObserved,true);
  assert.equal(report.status,"GLOBAL_CONTEXT_MISSING");
  assert.equal(report.canStartTexelPixel,false);
  assert.equal(report.readyOverridePerformed,false);
});
test("R5: discriminates actual missing path segments",()=>{
  const cases=[
    [{__R5_FACE_LAYER_CONTEXT:{}}, "STATE_MISSING"],
    [{__R5_FACE_LAYER_CONTEXT:{state:{}}}, "ACTORS_MISSING"],
    [{__R5_FACE_LAYER_CONTEXT:{state:{actors:{}}}}, "NATALIA_CONTEXT_MISSING"],
    [{__R5_FACE_LAYER_CONTEXT:{state:{actors:{natalia:{}}}}}, "GLTF_REF_MISSING"],
    [{__R5_FACE_LAYER_CONTEXT:{state:{actors:{natalia:{gltf:{}}}}}}, "GLTF_SCENE_MISSING_OR_INVALID"]
  ];
  for(const [browserWindow,status] of cases){
    const report=inspectR5FaceLayerContext({browserWindow,inspectNatalia:ready});
    assert.equal(report.status,status);
    assert.equal(report.canStartTexelPixel,false);
  }
});
test("R5: BOTH gates confirmed only with traversable scene and READY inspection",()=>{
  const browserWindow=success();
  const good=inspectR5FaceLayerContext({browserWindow,inspectNatalia:ready});
  assert.equal(good.status,"BOTH_GATES_CONFIRMED");
  assert.equal(good.canStartTexelPixel,true);
  const poor=inspectR5FaceLayerContext({
    browserWindow,inspectNatalia:()=>({ready:false})
  });
  assert.equal(poor.status,"INDEPENDENT_INSPECT_NOT_READY");
  assert.equal(poor.canStartTexelPixel,false);
});
test("R5: bounded retry cannot become another multi-hour run",async()=>{
  const browserWindow={};
  let calls=0,waits=0;
  const result=await traceR5FaceLayerGate({
    readWindow:()=>{calls++;return browserWindow;},
    inspectNatalia:ready,
    sleepMs:async ms=>{
      assert.equal(ms,1000);waits++;
      if(waits===1)Object.assign(browserWindow,success());
    }
  });
  assert.equal(result.checksPerformed,2);
  assert.equal(result.events[0].status,"GLOBAL_CONTEXT_MISSING");
  assert.equal(result.events[1].status,"BOTH_GATES_CONFIRMED");
  assert.equal(calls,2);
  assert.equal(waits,1);
  assert.equal(result.gateBypassed,false);
  await assert.rejects(
    traceR5FaceLayerGate({
      readWindow:()=>browserWindow,sleepMs:async()=>{},
      checks:60,intervalMs:10000
    }),/Only 1..5 checks/
  );
});
test("R5: failures in getters are reported without making state ready",()=>{
  const browserWindow={};
  Object.defineProperty(browserWindow,"__R5_FACE_LAYER_CONTEXT",{
    get(){throw new Error("stale frame");}
  });
  const report=inspectR5FaceLayerContext({browserWindow,inspectNatalia:ready});
  assert.equal(report.status,"READ_EXCEPTION");
  assert.equal(report.canStartTexelPixel,false);
  assert.match(report.gate.errors.join(" "),/stale frame/);
});
