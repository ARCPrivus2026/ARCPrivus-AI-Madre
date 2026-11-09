import test from "node:test";
import assert from "node:assert/strict";
import {diagnoseFaceGLTFBinding} from "./r5-gltf-binding-diagnostics.mjs";

function sceneFixture({
  meshAssociation=true,matAssociation=true,texAssociation=true,
  runtimeMesh=0,runtimePrimitive=0,runtimeMaterial=3,
  runtimeTexture=2,sourceMaterial=3,sourceTexture=2,materialMap=true
}={}){
  const texture={name:"albedo",uuid:"runtime-uuid-random"},
    material={name:"NataliaSkin",uuid:"material-id",map:materialMap?texture:null};
  const mesh={name:"Mesh_0_1",uuid:"face",isSkinnedMesh:true,
    geometry:{groups:[]},material};
  const scene={traverse(fn){fn(mesh);}};
  const associations=new Map();
  if(meshAssociation)associations.set(mesh,{meshes:runtimeMesh,primitives:runtimePrimitive});
  if(matAssociation)associations.set(material,{materials:runtimeMaterial});
  if(texAssociation)associations.set(texture,{textures:runtimeTexture});
  const json={
    meshes:[{primitives:[{material:sourceMaterial}]}],
    materials:Array.from({length:4},(_,i)=>({
      pbrMetallicRoughness:{baseColorTexture:{index:i===sourceMaterial?sourceTexture:0}}
    }))
  };
  const gltf={scene,parser:{json,associations}};
  const expected={
    gltfMeshIndex:0,primitiveIndex:0,gltfMaterialIndex:3,gltfTextureIndex:2
  };
  return {gltf,expected,mesh,material,texture};
}
test("R5 bindings: all runtime associations and GLTF source match",()=>{
  const {gltf,expected,mesh,material}=sceneFixture();
  const originalMap=material.map;
  const result=diagnoseFaceGLTFBinding({gltf,expected});
  assert.equal(result.status,"ALL_BINDINGS_MATCH");
  assert.equal(result.canCertifyBinding,true);
  assert.deepEqual(result.mismatchFields,[]);
  assert.equal(material.map,originalMap);
  assert.equal(mesh.visible,undefined);
  assert.equal(result.sourceModified,false);
});
test("R5 bindings: material index mismatch is reported alone",()=>{
  const {gltf,expected}=sceneFixture({runtimeMaterial:1});
  const result=diagnoseFaceGLTFBinding({gltf,expected});
  assert.deepEqual(result.mismatchFields,["material"]);
  assert.equal(result.comparisons[2].runtime,1);
  assert.equal(result.comparisons[2].source,3);
  assert.equal(result.comparisons[2].associationVsSource,"MISMATCH");
  assert.equal(result.canCertifyBinding,false);
});
test("R5 bindings: texture association mismatches, with valid source index",()=>{
  const {gltf,expected}=sceneFixture({runtimeTexture:1});
  const result=diagnoseFaceGLTFBinding({gltf,expected});
  assert.deepEqual(result.mismatchFields,["albedoTexture"]);
  assert.equal(result.comparisons[3].source,2);
  assert.equal(result.comparisons[3].runtime,1);
  assert.equal(result.didCompareTextureBytes,false);
});
test("R5 bindings: source glTF and runtime both mismatch expected",()=>{
  const {gltf,expected}=sceneFixture({sourceTexture:1,runtimeTexture:1});
  const result=diagnoseFaceGLTFBinding({gltf,expected});
  assert.deepEqual(result.mismatchFields,["albedoTexture"]);
  assert.equal(result.comparisons[3].associationVsSource,"MATCH");
  assert.equal(result.status,"MISMATCH");
});
test("R5 bindings: absent association is UNKNOWN, never silently considered matched",()=>{
  const {gltf,expected}=sceneFixture({texAssociation:false});
  const result=diagnoseFaceGLTFBinding({gltf,expected});
  assert.deepEqual(result.mismatchFields,[]);
  assert.equal(result.comparisons[3].sourceCheck,"MATCH");
  assert.equal(result.comparisons[3].runtimeCheck,"UNKNOWN");
  assert.equal(result.status,"MISSING_ASSOCIATION_OR_EXPECTATION");
  assert.equal(result.canCertifyBinding,false);
});
test("R5 bindings: primitive association is required",()=>{
  const {gltf,expected}=sceneFixture({meshAssociation:false});
  const result=diagnoseFaceGLTFBinding({gltf,expected});
  assert.equal(result.status,"MISSING_ASSOCIATION_OR_EXPECTATION");
  assert.equal(result.canCertifyBinding,false);
  assert.equal(result.comparisons[0].runtimeCheck,"UNKNOWN");
  assert.equal(result.comparisons[1].runtimeCheck,"UNKNOWN");
});
test("R5 bindings: missing current albedo material.map cannot claim ready",()=>{
  const {gltf,expected}=sceneFixture({materialMap:false});
  const result=diagnoseFaceGLTFBinding({gltf,expected});
  assert.equal(result.source.materialBaseColorTextureIndex,2);
  assert.equal(result.mesh.texturePresent,false);
  assert.equal(result.canCertifyBinding,false);
});
test("R5 bindings: absent expected indices need evidence rather than inferred defaults",()=>{
  const {gltf}=sceneFixture();
  const result=diagnoseFaceGLTFBinding({gltf});
  assert.equal(result.status,"MISSING_ASSOCIATION_OR_EXPECTATION");
  assert.equal(result.canCertifyBinding,false);
  assert.equal(result.comparisons[2].runtimeCheck,"NOT_REQUESTED");
});
test("R5 bindings: ambiguous or missing facial mesh is blocked",()=>{
  const {gltf,expected,mesh}=sceneFixture();
  gltf.scene.traverse=fn=>{fn(mesh);fn(mesh);};
  assert.throws(()=>diagnoseFaceGLTFBinding({gltf,expected}),/ambiguous/);
  assert.throws(()=>diagnoseFaceGLTFBinding({
    gltf:{scene:{traverse(fn){}},parser:gltf.parser},expected
  }),/missing or ambiguous/);
});
