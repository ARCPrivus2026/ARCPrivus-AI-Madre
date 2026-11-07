import test from "node:test";
import assert from "node:assert/strict";
import {fingerprintThreeScene} from "./r5-scene-fingerprint.mjs";

const v=(...values)=>({toArray:()=>values});
function create(){
  const light={
    name:"KeyLight",type:"DirectionalLight",isLight:true,
    intensity:1,color:{r:1,g:1,b:1},
    position:v(2,3,4),quaternion:v(0,0,0,1),visible:true,
    shadow:{bias:0,normalBias:0}
  };
  const bone={
    name:"Head",type:"Bone",isBone:true,
    position:v(0,1,0),quaternion:v(0,0,0,1),scale:v(1,1,1),
    matrixWorld:{elements:[1,0,0,1]},visible:true
  };
  const face={
    name:"Mesh_0",isSkinnedMesh:true,type:"SkinnedMesh",
    matrixWorld:{elements:[1,0,0,1]},
    morphTargetInfluences:[0,0,0],skeleton:{bones:[bone]},
    visible:true
  };
  const renderer={
    domElement:{width:800,height:600},
    toneMapping:1,toneMappingExposure:1,outputColorSpace:"srgb",
    shadowMap:{enabled:true,type:2}
  };
  const camera={
    name:"cam",type:"PerspectiveCamera",matrixWorld:{elements:[1,0,0,1]},
    projectionMatrix:{elements:[2,0,0,2]},
    near:.01,far:50,fov:35,zoom:1,
    position:v(0,0,2),quaternion:v(0,0,0,1)
  };
  const scene={traverse(fn){fn(light);}};
  const actorRoot={traverse(fn){fn(face);fn(bone);}};
  return {renderer,camera,scene,actorRoot,face,bone,light};
}
test("R5: firma determinista para una escena sin mutaciones",()=>{
  const o=create(),a=fingerprintThreeScene(o),b=fingerprintThreeScene(o);
  assert.deepEqual(a,b);
  assert.equal(a.viewport.width,800);
  assert.equal(a.lights.length,1);
  assert.equal(a.pose.length,2);
  assert.deepEqual(a.pose[0].morph,[0,0,0]);
});
test("R5: detecta cambios de mandíbula aunque material sea el mismo",()=>{
  const o=create(),before=JSON.stringify(fingerprintThreeScene(o));
  o.face.morphTargetInfluences[0]=0.8;
  const after=JSON.stringify(fingerprintThreeScene(o));
  assert.notEqual(before,after);
});
test("R5: detecta iluminación y exposición inestables",()=>{
  const o=create(),before=JSON.stringify(fingerprintThreeScene(o));
  o.light.intensity=1.5;
  assert.notEqual(before,JSON.stringify(fingerprintThreeScene(o)));
  o.light.intensity=1;
  o.renderer.toneMappingExposure=1.2;
  assert.notEqual(before,JSON.stringify(fingerprintThreeScene(o)));
});
test("R5: detecta cámara y resolución inestables",()=>{
  const o=create(),before=JSON.stringify(fingerprintThreeScene(o));
  o.camera.position=v(1,0,2);
  assert.notEqual(before,JSON.stringify(fingerprintThreeScene(o)));
  o.camera.position=v(0,0,2);
  o.renderer.domElement.width=1024;
  assert.notEqual(before,JSON.stringify(fingerprintThreeScene(o)));
});
test("R5: la firma exige un visor y pose accesible",()=>{
  assert.throws(()=>fingerprintThreeScene({}),/requeridos/);
  const o=create();
  o.renderer.domElement.width=0;
  assert.throws(()=>fingerprintThreeScene(o),/invalidas/);
});
