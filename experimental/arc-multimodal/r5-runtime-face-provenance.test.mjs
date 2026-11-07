import test from "node:test";
import assert from "node:assert/strict";
import {inventoryLoadedFacePrimitives} from "./r5-runtime-face-provenance.mjs";

function fixture({parserPresent=true}={}){
  const material={
    uuid:"mat-1",name:"Skin",type:"MeshStandardMaterial",
    depthTest:true,depthWrite:true,transparent:false,
    alphaTest:0.1,opacity:1,map:{uuid:"texture-1"}
  };
  const face={
    isMesh:true,name:"Mesh_0_1",uuid:"node-face",visible:true,renderOrder:3,
    frustumCulled:true,material,
    geometry:{
      uuid:"geo-1",index:{count:24},
      attributes:{position:{count:16}},
      groups:[{start:0,count:12,materialIndex:0},
        {start:12,count:12,materialIndex:0}],
      drawRange:{start:0,count:24}
    }
  };
  const root={name:"Natalia",uuid:"root",children:[face],traverse(fn){fn(this);fn(face);}};
  face.parent=root;
  const associations=new Map([[face,{meshes:0,nodes:6}],[material,{materials:2}]]);
  return {
    scene:root,
    parser:parserPresent?{associations,json:{
      meshes:[{primitives:Array.from({length:8},()=>({material:2}))}]
    }}:null
  };
}
test("INVENTARIO: distingue malla real, dos grupos y ocho primitivas GLB sin inventar índice",()=>{
  const gltf=fixture();
  const before=JSON.stringify({
    material:gltf.scene.children[0].material,
    geometry:gltf.scene.children[0].geometry
  });
  const result=inventoryLoadedFacePrimitives(gltf);
  assert.equal(result.objectCount,1);
  assert.equal(result.artifactSaved,false);
  assert.equal(result.originalModified,false);
  assert.equal(result.objects[0].name,"Mesh_0_1");
  assert.equal(result.objects[0].provenance.gltfSourcePrimitiveCount,8);
  assert.equal(result.objects[0].geometry.groupCount,2);
  assert.equal(result.objects[0].provenance.primitiveIndex,null);
  assert.equal(result.objects[0].materials[0].gltfMaterialIndex,2);
  assert.equal(result.objects[0].renderOrder,3);
  assert.equal(result.objects[0].materials[0].alphaTest,0.1);
  assert.equal(JSON.stringify({
    material:gltf.scene.children[0].material,
    geometry:gltf.scene.children[0].geometry
  }),before);
});
test("INVENTARIO: no inventa correspondencias si faltan asociaciones",()=>{
  const result=inventoryLoadedFacePrimitives(fixture({parserPresent:false}));
  assert.equal(result.missingProvenance,1);
  assert.equal(result.objects[0].provenance.gltfMeshIndex,null);
  assert.equal(result.objects[0].provenance.gltfSourcePrimitiveCount,null);
  assert.equal(result.objects[0].provenance.primitiveIndex,null);
});
test("INVENTARIO: requiere GLTF cargado, no JSON inventado",()=>{
  assert.throws(()=>inventoryLoadedFacePrimitives({}),/GLTF.scene.traverse/);
});
