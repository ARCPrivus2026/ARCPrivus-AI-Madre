import test from "node:test";
import assert from "node:assert/strict";
import {auditFacialHitTriangles} from "./r5-face-triangle-uv-evidence.mjs";

const attr=(arr,itemSize)=>({array:Float32Array.from(arr),itemSize,count:arr.length/itemSize});
function sampleMesh(){
  return {
    name:"Mesh_0_1",uuid:"Natalia-Face",isSkinnedMesh:true,
    material:[
      {uuid:"skin",name:"ARNOLRC_V17_ROSTRO_MORPHS_PROTEGIDOS",
        transparent:false,depthTest:true,depthWrite:true,alphaTest:0,
        map:{uuid:"skinColor"},normalMap:{uuid:"skinNormal"}},
      {uuid:"skin2",name:"Other"}
    ],
    geometry:{
      index:attr([0,1,2,0,2,3],1),
      attributes:{
        position:attr([0,0,0,1,0,0,1,1,0,0,1,0],3),
        normal:attr([0,0,1,0,0,1,0,0,1,0,0,1],3),
        uv:attr([0,0,1,0,1,1,0,1],2)
      },
      groups:[{start:0,count:3,materialIndex:0},
        {start:3,count:3,materialIndex:1}],
      morphTargetsRelative:true,
      morphAttributes:{position:[{}],normal:[{}]}
    },
    morphTargetInfluences:[.8]
  };
}
const hit=(mesh,faceIndex,uv)=>({
  object:mesh,faceIndex,distance:2,
  uv:{x:uv[0],y:uv[1]},point:{x:.5,y:.4,z:0}
});
test("TRIANGLE: faceIndex real produce tres vertices, UV, normal y material correctos",()=>{
  const mesh=sampleMesh();
  const before=JSON.stringify(mesh.geometry.attributes.uv.array);
  const report=auditFacialHitTriangles({mesh,
    stripeHits:[hit(mesh,0,[.4,.2])],
    controlHits:[hit(mesh,1,[.7,.7])]
  });
  assert.equal(report.uniqueTriangleCount,2);
  assert.deepEqual(report.stripeHits[0].triangle.vertexIndices,[0,1,2]);
  assert.deepEqual(report.stripeHits[0].triangle.uvs,[[0,0],[1,0],[1,1]]);
  assert.equal(report.stripeHits[0].triangle.triangleArea,.5);
  assert.deepEqual(report.stripeHits[0].triangle.faceNormal,[0,0,1]);
  assert.equal(report.stripeHits[0].triangle.uvArea,.5);
  assert.equal(report.stripeHits[0].triangle.material.uuid,"skin");
  assert.equal(report.controlHits[0].triangle.material.uuid,"skin2");
  assert.equal(report.morphs.activeWeights[0].weight,.8);
  assert.equal(report.verdict,"INCONCLUSIVE_REQUIRES_PIXEL_AND_TEXTURE_VALIDATION");
  assert.equal(report.sourceModified,false);
  assert.equal(report.evidenceSaved,false);
  assert.equal(JSON.stringify(mesh.geometry.attributes.uv.array),before);
});
test("TRIANGLE: no inventa índices a partir del nombre Mesh_0_1",()=>{
  const mesh=sampleMesh();
  assert.throws(()=>auditFacialHitTriangles({mesh,
    stripeHits:[{object:mesh,distance:2}],controlHits:[]}),
    /faceIndex real/);
  assert.throws(()=>auditFacialHitTriangles({mesh,
    stripeHits:[hit(mesh,4,[.3,.4])],controlHits:[]}),
    /faceIndex fuera/);
});
test("TRIANGLE: rechaza hit de otra malla aunque tenga mismo nombre",()=>{
  const mesh=sampleMesh(),other=sampleMesh();
  assert.throws(()=>auditFacialHitTriangles({mesh,
    stripeHits:[hit(other,0,[.1,.1])],controlHits:[]}),
    /objeto ajeno/);
});
test("TRIANGLE: distribución de hits distingue rostro en franja y control",()=>{
  const mesh=sampleMesh();
  const report=auditFacialHitTriangles({mesh,
    stripeHits:[hit(mesh,0,[.1,.1]),hit(mesh,0,[.2,.3]),hit(mesh,1,[.6,.7])],
    controlHits:[hit(mesh,1,[.8,.3])]
  });
  assert.equal(report.stripeFaceDistribution[0],2);
  assert.equal(report.stripeFaceDistribution[1],1);
  assert.equal(report.controlFaceDistribution[1],1);
});
test("TRIANGLE: malla no indexada válida y sin normal/UV no atribuye parámetros",()=>{
  const mesh=sampleMesh();
  delete mesh.geometry.index;
  delete mesh.geometry.attributes.uv;
  delete mesh.geometry.attributes.normal;
  const report=auditFacialHitTriangles({
    mesh,stripeHits:[hit(mesh,0,[.1,.1])],controlHits:[]
  });
  assert.deepEqual(report.stripeHits[0].triangle.vertexIndices,[0,1,2]);
  assert.deepEqual(report.stripeHits[0].triangle.uvs,[null,null,null]);
  assert.equal(report.stripeHits[0].triangle.uvArea,null);
  assert.equal(report.stripeHits[0].triangle.material.uuid,"skin");
});
test("TRIANGLE: número de muestras limitado para equipos de pocos recursos",()=>{
  const mesh=sampleMesh();
  assert.throws(()=>auditFacialHitTriangles({mesh,
    stripeHits:[hit(mesh,0,[.1,.1])],
    controlHits:[],maxHits:0}),/Numero de hits/);
  assert.throws(()=>auditFacialHitTriangles({mesh,
    stripeHits:[],controlHits:null}),/hits de ambas ROI/);
});


test("TRIANGLE: identifica candidatos dentro de una MISMA malla por rayId, sin afirmar causa",()=>{
  const mesh=sampleMesh();
  const a=hit(mesh,0,[.3,.4]);
  a.distance=2;a.rayId="stripe-1";a.pixel={x:125,y:65};
  const b=hit(mesh,1,[.3,.4]);
  b.distance=2.0005;b.rayId="stripe-1";b.pixel={x:125,y:65};
  const c=hit(mesh,1,[.4,.7]);
  c.distance=2.001;c.rayId="control-1";c.pixel={x:234,y:65};
  const report=auditFacialHitTriangles({mesh,stripeHits:[a,b],controlHits:[c]});
  assert.equal(report.rayIdentityAvailable,true);
  assert.deepEqual(report.stripeHits[0].pixel,[125,65]);
  assert.equal(report.nearSameMeshTriangleCandidates.length,1);
  assert.equal(report.nearSameMeshTriangleCandidates[0].firstFaceIndex,0);
  assert.equal(report.nearSameMeshTriangleCandidates[0].secondFaceIndex,1);
  assert.equal(report.verdict,"INCONCLUSIVE_REQUIRES_PIXEL_AND_TEXTURE_VALIDATION");
});
test("TRIANGLE: rechaza atribuir superposición sin identidad de rayo",()=>{
  const mesh=sampleMesh();
  const a=hit(mesh,0,[.2,.4]);a.distance=2;
  const b=hit(mesh,1,[.4,.6]);b.distance=2;
  const report=auditFacialHitTriangles({mesh,
    stripeHits:[a,b],controlHits:[]});
  assert.equal(report.rayIdentityAvailable,false);
  assert.deepEqual(report.nearSameMeshTriangleCandidates,[]);
});
