import test from "node:test";
import assert from "node:assert/strict";
import {inspectSkinInfluence} from "./skinning-geometry-audit.mjs";
import {fakeSkinnedLimbMesh} from "./testing-glb-fixtures.mjs";

function gltfWith(...nodes){
  return {scene:{traverse(fn){nodes.forEach(fn);}}};
}
test("SKIN: cuatro extremidades con vertices ponderados reales de fixture",()=>{
  const mesh=fakeSkinnedLimbMesh();
  const before=Array.from(mesh.geometry.attributes.skinWeight.array);
  const result=inspectSkinInfluence(gltfWith(mesh));
  assert.equal(result.status,"analyzed");
  assert.equal(result.ready,true);
  for(const target of ["leftHand","rightHand","leftFoot","rightFoot"]){
    assert.equal(result.targets[target].vertices,4);
    assert.equal(result.targets[target].verdict,"weighted");
  }
  assert.deepEqual(Array.from(mesh.geometry.attributes.skinWeight.array),before);
});
test("SKIN: hueso mano derecha existe pero sin vertices asociados",()=>{
  const result=inspectSkinInfluence(gltfWith(fakeSkinnedLimbMesh({missing:["RightHand"]})));
  assert.equal(result.ready,false);
  assert.equal(result.targets.rightHand.vertices,0);
  assert.equal(result.targets.rightHand.verdict,"insufficient");
  assert.match(result.issues.join(" "),/rightHand/);
});
test("SKIN: no certifica mallas desconocidas",()=>{
  const result=inspectSkinInfluence(gltfWith({name:"sinSkinning"}));
  assert.equal(result.status,"unavailable");
  assert.equal(result.ready,false);
  assert.match(result.issues.join(" "),/sin geometria/);
});
test("SKIN: los datos malformados bloquean la certificacion",()=>{
  const result=inspectSkinInfluence(gltfWith(fakeSkinnedLimbMesh(),fakeSkinnedLimbMesh({malformed:true})));
  assert.equal(result.ready,false);
  assert.ok(result.issues.some(x=>x.includes("mallas skinned")));
});
test("SKIN: entradas invalidas se rechazan sin tocar geometria",()=>{
  assert.throws(()=>inspectSkinInfluence({}),/GLTF.scene.traverse/);
  assert.throws(()=>inspectSkinInfluence(gltfWith(),{minWeight:0}),/minWeight/);
  assert.throws(()=>inspectSkinInfluence(gltfWith(),{minVertices:0}),/minVertices/);
});
