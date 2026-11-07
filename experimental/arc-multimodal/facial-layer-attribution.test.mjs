import test from "node:test";
import assert from "node:assert/strict";
import {auditFaceLayers,runFaceVisibilityProbes} from "./facial-layer-attribution.mjs";

function actors(){
  const face={
    name:"Mesh_0",uuid:"face",type:"SkinnedMesh",isSkinnedMesh:true,
    visible:true,renderOrder:0,material:{
      name:"skin",type:"MeshStandardMaterial",transparent:false,
      opacity:1,depthTest:true,depthWrite:true,alphaTest:0
    }
  };
  const strip={
    name:"FaceOverlay",uuid:"overlay",type:"Mesh",isMesh:true,
    visible:true,renderOrder:3,material:{
      name:"overlay-skin",type:"MeshBasicMaterial",
      transparent:true,opacity:.9,depthTest:false,
      depthWrite:false,alphaTest:.1,alphaMap:{}
    }
  };
  const body={name:"Body",uuid:"body",isMesh:true,
    visible:true,material:{name:"cloth",type:"MeshStandardMaterial"}};
  const root={traverse(fn){[face,strip,body].forEach(fn);}};
  return {face,strip,body,root};
}
class Raycaster {
  setFromCamera(ndc){this.ndc=ndc;}
  intersectObjects(objects){
    const named=name=>objects.find(x=>x.name===name);
    if(this.ndc.x<0) return [
      {object:named("FaceOverlay"),distance:2},
      {object:named("FaceOverlay"),distance:2}, // duplicated triangles
      {object:named("Mesh_0"),distance:2.001}
    ];
    return [{object:named("Mesh_0"),distance:2}];
  }
}
const THREE={Raycaster};
const args={
  camera:{},width:100,height:80,grid:3,nearTolerance:.002,
  stripe:{x:0,y:10,width:20,height:20},
  control:{x:65,y:10,width:20,height:20}
};
test("ATRIBUCIÓN: superposición en franja, no en piel de control",()=>{
  const model=actors();
  const audit=auditFaceLayers({THREE,root:model.root,...args});
  assert.equal(audit.stripe.sampleCount,9);
  assert.equal(audit.control.sampleCount,9);
  assert.equal(audit.stripe.topHits.FaceOverlay,9);
  assert.equal(audit.stripe.secondHits.Mesh_0,9);
  assert.equal(audit.control.topHits.Mesh_0,9);
  assert.equal(audit.stripe.nearPairs["FaceOverlay / Mesh_0"],9);
  assert.equal(audit.overlapProven,false);
  assert.equal(audit.renderVerified,false);
  assert.equal(audit.pixelAccuracyProven,false);
  assert.equal(model.strip.visible,true);
  assert.equal(audit.inventory.find(x=>x.name==="FaceOverlay").renderOrder,3);
  assert.equal(audit.inventory.find(x=>x.name==="FaceOverlay").materials[0].depthTest,false);
});
test("ATRIBUCIÓN: falsos duplicados de triángulos de una sola malla no cuentan como capa",()=>{
  class OneMeshRaycaster extends Raycaster {
    intersectObjects(objects){const mesh=objects[0];
      return [{object:mesh,distance:2},{object:mesh,distance:2}];
    }
  }
  const model=actors();
  const audit=auditFaceLayers({THREE:{Raycaster:OneMeshRaycaster},root:model.root,...args});
  assert.deepEqual(audit.stripe.secondHits,{});
  assert.deepEqual(audit.stripe.nearPairs,{});
});
test("ATRIBUCIÓN: ROI fuera del canvas se rechaza",()=>{
  const model=actors();
  assert.throws(()=>auditFaceLayers({
    THREE,root:model.root,...args,stripe:{x:-1,y:0,width:20,height:20}
  }),/fuera del canvas/);
  assert.throws(()=>auditFaceLayers({
    THREE,root:model.root,...args,grid:50
  }),/grid/);
});
test("VISIBILIDAD: cada prueba oculta una sola malla y luego la restaura",async()=>{
  const model=actors(),original=model.face.visible;
  const events=[];
  const result=await runFaceVisibilityProbes({
    root:model.root,names:["FaceOverlay","Mesh_0"],
    capture:async ({hidden})=>{
      events.push({
        hidden,strip:model.strip.visible,face:model.face.visible
      });
      return "virtual-"+(hidden||"baseline");
    }
  });
  assert.equal(result.results.length,3);
  assert.deepEqual(events,[
    {hidden:null,strip:true,face:true},
    {hidden:"FaceOverlay",strip:false,face:true},
    {hidden:"Mesh_0",strip:true,face:false}
  ]);
  assert.equal(model.face.visible,original);
  assert.equal(model.strip.visible,true);
  assert.equal(result.stripeFixed,false);
  assert.equal(result.certified,false);
});
test("VISIBILIDAD: error de WebGL restaura el estado original",async()=>{
  const model=actors();
  await assert.rejects(
    runFaceVisibilityProbes({
      root:model.root,names:["FaceOverlay"],
      capture:async ({hidden})=>{
        if(hidden) throw new Error("webgl-fail");
        return "ok";
      }
    }),/webgl-fail/
  );
  assert.equal(model.face.visible,true);
  assert.equal(model.strip.visible,true);
});
test("VISIBILIDAD: nombres ambiguos o mallas ausentes se bloquean",async()=>{
  const model=actors();
  await assert.rejects(
    runFaceVisibilityProbes({root:model.root,names:["Unknown"],capture:async()=>{}}),
    /ambigua o ausente/
  );
  await assert.rejects(
    runFaceVisibilityProbes({root:model.root,names:["Mesh_0","Mesh_0"],capture:async()=>{}}),
    /unicos/
  );
});
