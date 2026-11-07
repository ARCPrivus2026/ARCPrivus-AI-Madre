import test from "node:test";
import assert from "node:assert/strict";
import {
 R5_RENDER_MODES,runR5LightingIsolation,measureR5Rois,screenStripeCandidates
} from "./r5-light-normal-depth-audit.mjs";

class Material {
  constructor(props={}){
    Object.assign(this,{
      isMeshStandardMaterial:true,type:"MeshStandardMaterial",
      name:"PielOriginal",map:{id:"albedo"},normalMap:{id:"normal"},
      metalnessMap:{id:"Image_1"},roughnessMap:{id:"Image_1"},
      color:{r:1,g:0.8,b:0.7},side:0,opacity:1,transparent:false,
      alphaTest:0,depthTest:true,depthWrite:true,
      disposed:false
    },props);
  }
  clone(){return new Material({...this,disposed:false});}
  dispose(){this.disposed=true;}
}
class Auxiliary {
  constructor(opts={}){Object.assign(this,opts);this.disposed=false;}
  dispose(){this.disposed=true;}
}
const THREE={
  MeshLambertMaterial:Auxiliary,
  MeshNormalMaterial:Auxiliary,
  MeshDepthMaterial:Auxiliary
};
function makeScene(){
  const face={name:"Mesh_0",isSkinnedMesh:true,material:new Material()};
  const eyes={name:"eyes",isMesh:true,material:new Material({name:"Ojos"})};
  return {face,eyes,root:{traverse(fn){[face,eyes].forEach(fn);}}};
}
test("R5: matriz de siete modos, aislamiento y restauracion exacta",async()=>{
  const {face,eyes,root}=makeScene();
  const original=face.material,other=eyes.material;
  const snapshots=[];
  const result=await runR5LightingIsolation({
    THREE,root,meshNames:["Mesh_0"],
    capture:async ({mode,diagnostic})=>{
      const mat=face.material;
      assert.equal(eyes.material,other);
      if(mode==="baseline")assert.equal(mat,original);
      else assert.notEqual(mat,original);
      assert.equal(diagnostic,mode!=="baseline");
      snapshots.push({
        mode,
        ctor:mat.constructor.name,
        flat:mat.flatShading,
        sameMap:mat.map===original.map
      });
      return {output:"virtual/"+mode+".png"};
    }
  });
  assert.deepEqual(result.outputs.map(x=>x.mode),[...R5_RENDER_MODES]);
  assert.equal(result.restored,true);
  assert.equal(result.sourceModified,false);
  assert.equal(face.material,original);
  assert.equal(eyes.material,other);
  assert.equal(original.disposed,false);
  assert.equal(original.flatShading,undefined);
  assert.equal(snapshots.find(x=>x.mode==="lambert-flat").flat,true);
  assert.equal(snapshots.find(x=>x.mode==="normal-flat").flat,true);
  assert.equal(snapshots.find(x=>x.mode==="pbr-flat").flat,true);
  assert.equal(snapshots.find(x=>x.mode==="lambert-smooth").sameMap,true);
});
test("R5: excepcion de captura restaura materiales originales sin perder identidad",async()=>{
  const {face,root}=makeScene(),original=face.material;
  await assert.rejects(
    runR5LightingIsolation({THREE,root,meshNames:["Mesh_0"],
      modes:["depth"],capture:async()=>{
        assert.notEqual(face.material,original);
        throw new Error("WebGL context lost");
      }}),
    /WebGL context lost/
  );
  assert.equal(face.material,original);
  assert.equal(original.disposed,false);
});
test("R5: material PBR multiple se restaura sin alterar referencias",async()=>{
  const {root,face}=makeScene();
  const first=new Material(),second=new Material();
  const original=[first,second];
  face.material=original;
  await runR5LightingIsolation({THREE,root,meshNames:["Mesh_0"],
    modes:["normal-flat"],capture:async()=>assert.equal(face.material.length,2)});
  assert.equal(face.material,original);
  assert.equal(face.material[0],first);
  assert.equal(face.material[1],second);
});
test("R5: falla sin tocar escena con malla equivocada",async()=>{
  const {root}=makeScene();
  await assert.rejects(
    runR5LightingIsolation({THREE,root,meshNames:["OtraCara"],capture:async()=>{}}),
    /Faltan mallas faciales/
  );
  await assert.rejects(
    runR5LightingIsolation({THREE,root,meshNames:["Mesh_0","Mesh_0"],
      capture:async()=>{}}),
    /unicos/
  );
  await assert.rejects(
    runR5LightingIsolation({THREE,root,meshNames:["Mesh_0"],
      modes:["production-fix"],capture:async()=>{}}),
    /Modos R5 invalidos/
  );
});
function makePixels(){
  const width=8,height=8,data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const p=4*(y*width+x),lum=x<2&&y<4?30:120;
    data[p]=data[p+1]=data[p+2]=lum;data[p+3]=255;
  }
  return {width,height,data};
}
test("R5: ROI dentro de canvas con medianas y contraste verificables",()=>{
  const frame=makePixels();
  const measure=measureR5Rois({...frame,
    stripe:{x:0,y:0,width:2,height:4},
    control:{x:4,y:0,width:2,height:4},
    minPixels:8
  });
  assert.equal(measure.stripeMedian,30);
  assert.equal(measure.controlMedian,120);
  assert.equal(measure.gap,90);
  assert.equal(measure.stripeToControl,0.25);
});
test("R5: rechaza ROI fuera de pantalla, solape y transparencia",()=>{
  const frame=makePixels();
  assert.throws(()=>measureR5Rois({...frame,
    stripe:{x:-1,y:0,width:2,height:4},
    control:{x:4,y:0,width:2,height:4}
  }),/fuera del canvas/);
  assert.throws(()=>measureR5Rois({...frame,
    stripe:{x:0,y:0,width:3,height:4},
    control:{x:2,y:0,width:3,height:4}
  }),/superpuestas/);
  frame.data.fill(0);
  assert.throws(()=>measureR5Rois({...frame,
    stripe:{x:0,y:0,width:2,height:4},
    control:{x:4,y:0,width:2,height:4},
    minPixels:4
  }),/opacos/);
});
test("REGRESION R4: mapa metalico apagado NO es mejora de la franja",()=>{
  const rows=[
    {mode:"baseline",stripeMedian:38.91,controlMedian:137.44},
    {mode:"metal-map-off",stripeMedian:0,controlMedian:55.46},
    {mode:"rough-map-off",stripeMedian:38.91,controlMedian:137.36},
    {mode:"both-maps-off",stripeMedian:0.21,controlMedian:43.89},
    {mode:"neutral-skin",stripeMedian:38.91,controlMedian:137.37}
  ];
  const verdicts=screenStripeCandidates(rows);
  assert.equal(verdicts[1].status,"global-darkening");
  assert.equal(verdicts[2].status,"no-improvement-evidence");
  assert.equal(verdicts[3].status,"global-darkening");
  assert.equal(verdicts[4].status,"no-improvement-evidence");
  assert.ok(verdicts.every(v=>v.certified===false));
});
