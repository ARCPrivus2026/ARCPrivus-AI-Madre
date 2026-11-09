import test from "node:test";
import assert from "node:assert/strict";
import {evaluateR5SamplingPreflight} from "./r5-texel-session-preflight.mjs";

const hashA="a".repeat(64),hashB="b".repeat(64);
const readyEvent={
  status:"BOTH_GATES_CONFIRMED",
  canStartTexelPixel:true,
  independent:{readyObserved:true},
  gate:{sceneTraversable:true}
};
const gate={status:"BOTH_GATES_CONFIRMED",events:[{status:"STATE_MISSING"},readyEvent]};
const loaded={
  glbSha256:hashA,gltfMaterialIndex:2,gltfTextureIndex:0,
  textureSourceKind:"embedded-glb",shaVerifiedFromBytes:true,
  runtimeTextureUuid:"runtime-session-B"
};
const prior={...loaded,runtimeTextureUuid:"runtime-session-A"};
const frame={textureUuid:"runtime-session-B"};

test("PRE-FLIGHT: ambos gates son eventos; nuevo UUID no invalida GLB idéntico",()=>{
  const r=evaluateR5SamplingPreflight({gate,loaded,prior,frame});
  assert.equal(r.canSample,true);
  assert.equal(r.status,"READY_FOR_REAL_SAMPLING");
  assert.equal(r.stableProvenance,"matching-source-bytes");
  assert.equal(r.differentUuidAcrossSessions,true);
  assert.equal(r.uuidDifferenceBlocks,false);
  assert.equal(r.sourceModified,false);
  assert.equal(r.modelCorrected,false);
});
test("PRE-FLIGHT: contrato directo de inspect válido",()=>{
  const r=evaluateR5SamplingPreflight({gate:readyEvent,loaded,frame});
  assert.equal(r.canSample,true);
  assert.equal(r.stableProvenance,"not-recorded");
});
test("PRE-FLIGHT: status suelto sin evidencia de ready no autoriza medición",()=>{
  const r=evaluateR5SamplingPreflight({
    gate:{status:"BOTH_GATES_CONFIRMED",events:[{status:"BOTH_GATES_CONFIRMED"}]},
    loaded,frame
  });
  assert.equal(r.canSample,false);
  assert.equal(r.conditions[0].pass,false);
});
test("PRE-FLIGHT: no permite usar UUID antiguo en la captura actual",()=>{
  const r=evaluateR5SamplingPreflight({gate,loaded,prior,
    frame:{textureUuid:"runtime-session-A"}});
  assert.equal(r.canSample,false);
  assert.equal(r.conditions[1].pass,false);
});
test("PRE-FLIGHT: un GLB diferente sí bloquea la comparación entre sesiones",()=>{
  const r=evaluateR5SamplingPreflight({gate,loaded,
    prior:{...prior,glbSha256:hashB},frame});
  assert.equal(r.stableProvenance,"different-source-bytes");
  assert.equal(r.canSample,false);
});
test("PRE-FLIGHT: verifica índices glTF, no nombres de objetos Three.js",()=>{
  const r=evaluateR5SamplingPreflight({gate,loaded,
    prior:{...prior,gltfTextureIndex:1},frame});
  assert.equal(r.canSample,false);
  assert.equal(r.stableProvenance,"different-source-bytes");
});
test("PRE-FLIGHT: textura externa requiere hash propio y misma identidad",()=>{
  const external={...loaded,textureSourceKind:"external-file",textureSha256:hashB};
  const old={...external,runtimeTextureUuid:"earlier"};
  assert.equal(evaluateR5SamplingPreflight({gate,loaded:external,prior:old,frame}).canSample,true);
  const changed={...old,textureSha256:hashA};
  assert.equal(evaluateR5SamplingPreflight({gate,loaded:external,prior:changed,frame}).canSample,false);
  assert.throws(()=>evaluateR5SamplingPreflight({gate,
    loaded:{...external,textureSha256:undefined},frame}),/external texture SHA-256 missing/);
});
test("PRE-FLIGHT: no acepta SHA marcado sin verificación del proveedor de bytes",()=>{
  assert.throws(()=>evaluateR5SamplingPreflight({gate,
    loaded:{...loaded,shaVerifiedFromBytes:false},frame
  }),/not verified/);
  assert.throws(()=>evaluateR5SamplingPreflight({gate,
    loaded:{...loaded,glbSha256:"made-up"},frame
  }),/SHA-256/);
});
