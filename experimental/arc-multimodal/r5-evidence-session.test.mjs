import test from "node:test";
import assert from "node:assert/strict";
import {runR5EvidenceSession} from "./r5-evidence-session.mjs";

class Material {
  constructor(fields={}){
    Object.assign(this,{
      name:"Piel",isMeshStandardMaterial:true,type:"MeshStandardMaterial",
      map:{name:"albedo"},normalMap:{name:"n"},
      color:{r:1,g:0.8,b:0.7},
      metalnessMap:{name:"Image_1"},roughnessMap:{name:"Image_1"},
      side:0,opacity:1,transparent:false,alphaTest:0,depthTest:true,
      depthWrite:true,disposed:false
    },fields);
  }
  clone(){return new Material({...this,disposed:false});}
  dispose(){this.disposed=true;}
}
class OtherMaterial {
  constructor(properties){Object.assign(this,properties);this.disposed=false;}
  dispose(){this.disposed=true;}
}
const THREE={
  MeshLambertMaterial:OtherMaterial,
  MeshNormalMaterial:OtherMaterial,
  MeshDepthMaterial:OtherMaterial
};
function model(){
  const face={name:"Mesh_0",isMesh:true,material:new Material()};
  const other={name:"Hair",isMesh:true,material:new Material()};
  return {
    face,other,
    root:{traverse(fn){fn(face);fn(other);}}
  };
}
function frame({stripe=40,control=140,pass,mode}){
  const width=8,height=8,data=new Uint8ClampedArray(8*8*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const val=x<4?stripe:control,idx=4*(y*width+x);
    data[idx]=data[idx+1]=data[idx+2]=val;data[idx+3]=255;
  }
  return {width,height,data,imagePath:"reports/r5/"+pass+"-"+mode+".png"};
}
const roi={
  stripe:{x:0,y:0,width:4,height:4},
  control:{x:4,y:0,width:4,height:4}
};
function setup({captureOverrides={},signature,verified=true,releaseHook}={}){
  const gltf=model(),original=gltf.face.material;
  const visited=[],calls={freeze:0,resume:0},meta={
    signature:signature||{camera:[0,0,3],lights:"fixed",pose:"A",size:[8,8],exposure:1}
  };
  const options={
    THREE,root:gltf.root,meshNames:["Mesh_0"],...roi,
    holdScene:async()=>{calls.freeze++;return async()=>{calls.resume++;releaseHook?.();};},
    frameSignature:async()=>meta.signature,
    captureFrame:async ({mode,pass})=>{
      visited.push([mode,pass,gltf.face.material===original]);
      if(captureOverrides.errorOn===mode)throw new Error("Falló GPU deliberadamente");
      if(captureOverrides.changeSignature===mode)meta.signature={camera:[1,2,3]};
      const stripe=pass==="control-final"&&captureOverrides.finalStripe!==undefined
        ?captureOverrides.finalStripe:mode==="lambert-smooth"?70:40;
      return frame({stripe,control:140,mode,pass});
    },
    verifyArtifact:async path=>verified&&path.endsWith(".png")
  };
  return {gltf,original,visited,calls,options,meta};
}
test("R5 INTEGRAL: siete renders y baseline final verificado; originales intactos",async()=>{
  const a=setup();
  const out=await runR5EvidenceSession(a.options);
  assert.equal(out.status,"PARTIAL_VISUAL_REVIEW_REQUIRED");
  assert.equal(out.captureCount,8);
  assert.equal(out.captures.length,8);
  assert.equal(out.materialRestorationReported,true);
  assert.equal(out.drift.stable,true);
  assert.equal(out.rootCauseIsolated,false);
  assert.equal(out.anatomyCorrected,false);
  assert.equal(out.assetsModified,false);
  assert.equal(a.calls.freeze,1);
  assert.equal(a.calls.resume,1);
  assert.equal(a.gltf.face.material,a.original);
  assert.equal(a.original.disposed,false);
  assert.equal(a.visited.filter(x=>x[2]).length,2);
  assert.equal(a.visited.filter(x=>!x[2]).length,6);
  const lambert=out.candidates.find(c=>c.mode==="lambert-smooth");
  assert.equal(lambert.status,"candidate-needs-visual-review");
  assert.equal(lambert.certified,false);
});
test("R5: baseline final desplazada invalida TODA la comparacion",async()=>{
  const a=setup({captureOverrides:{finalStripe:60}});
  const out=await runR5EvidenceSession(a.options);
  assert.equal(out.status,"INVALID_DRIFT");
  assert.equal(out.drift.stable,false);
  assert.deepEqual(out.candidates,[]);
  assert.equal(a.calls.resume,1);
  assert.equal(a.gltf.face.material,a.original);
});
test("R5: el contexto GPU falla y siempre se libera el bucle original",async()=>{
  const a=setup({captureOverrides:{errorOn:"normal-flat"}});
  await assert.rejects(runR5EvidenceSession(a.options),/Falló GPU/);
  assert.equal(a.calls.resume,1);
  assert.equal(a.gltf.face.material,a.original);
  assert.equal(a.original.disposed,false);
});
test("R5: firma de camara y pose cambia; cancela evidencia",async()=>{
  const a=setup({captureOverrides:{changeSignature:"pbr-flat"}});
  await assert.rejects(runR5EvidenceSession(a.options),/Cambios de escena durante captura/);
  assert.equal(a.calls.resume,1);
  assert.equal(a.gltf.face.material,a.original);
});
test("R5: no acepta PNG sin verificacion; no registra capturas inventadas",async()=>{
  const a=setup({verified:false});
  await assert.rejects(runR5EvidenceSession(a.options),/PNG no verificado/);
  assert.equal(a.calls.resume,1);
  assert.equal(a.gltf.face.material,a.original);
});
test("R5: bloqueo previo si no hay control del bucle de escena",async()=>{
  const a=setup();
  delete a.options.holdScene;
  await assert.rejects(runR5EvidenceSession(a.options),/holdScene requerido/);
  assert.equal(a.calls.freeze,0);
});
