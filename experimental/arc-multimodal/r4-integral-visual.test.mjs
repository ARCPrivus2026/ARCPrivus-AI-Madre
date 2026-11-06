import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {parseVisualArgs,parseVisualReport,runR4VisualReview} from "./r4-integral-visual.mjs";

const SHOTS=["front","walk","run","face_jaw","face_blink","left_hand","right_hand"];
const START="=== ARC_VISUAL_PROOF_BEGIN ===";
const END="=== ARC_VISUAL_PROOF_END ===";
const PNG=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.from("mock-offline-png")]);

function fixture(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"arc-r4-visual-"));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  fs.mkdirSync(path.join(dir,"R4","assets"),{recursive:true});
  const root=path.join(dir,"R4");
  const natalia=path.join(root,"assets","natalia.glb");
  const copiloto=path.join(root,"assets","copiloto.blend");
  fs.writeFileSync(natalia,"fake-natalia-original");
  fs.writeFileSync(copiloto,"fake-copiloto-original");
  return {dir,root,natalia,copiloto,visualDir:path.join(dir,"EVIDENCIA_NUEVA")};
}
function inventoryResult(){
  return {schema:"arc.blender.rig.inventory.v1",armature:"Armature",
    bones:["LeftHand","RightHand","LeftFoot","RightFoot"],
    meshes:[{name:"body",weightedGroups:["LeftHand","RightHand","LeftFoot","RightFoot"],
      weightedVertexCounts:{LeftHand:7,RightHand:7,LeftFoot:7,RightFoot:7},
      weightThreshold:0.05,vertices:200,polygons:100,visibleInRender:true}],
    morphs:["jawOpen","eyeBlink"],
    clips:["Idle","Walk","Run","Sit","Stand"],
    clipMap:{idle:"Idle",walk:"Walk",run:"Run",sit:"Sit",stand:"Stand"}};
}
function fakeRunner(callLog,{partial=false,injectHTML=false}={}){
  return (_binary,args,options)=>{
    assert.equal(options.shell,false);
    callLog.push(args);
    const script=args[args.indexOf("--python")+1]||"";
    if(script.includes("blender-rig-inventory.py")){
      return {status:0,stdout:"=== ARC_RIG_INVENTORY_BEGIN ===\n"+
        JSON.stringify(inventoryResult())+"\n=== ARC_RIG_INVENTORY_END ==="};
    }
    assert.match(script,/blender-visual-proof\.py/);
    assert.ok(args.includes("--disable-autoexec"));
    const dir=args[args.indexOf("--out-dir")+1];
    const actor=args[args.indexOf("--actor")+1];
    const images={};
    for(const shot of SHOTS){
      if(partial&&shot==="right_hand"){
        images[shot]={status:"missing",image:null,note:"Sin hueso de mano"};
      }else{
        const name=actor+"_"+shot+".png";
        fs.writeFileSync(path.join(dir,name),PNG,{flag:"wx"});
        images[shot]={status:"rendered",image:name,
          note:injectHTML?"<script>alert(1)</script>":"Workbench prueba"};
      }
    }
    return {status:0,stdout:"Blender\n"+START+"\n"+
      JSON.stringify({schema:"arc.blender.visual.proof.v1",
        actor,noOriginalSaved:true,images})+"\n"+END};
  };
}
test("R4 VISUAL: ambas identidades, catorce capturas y HTML comparativo en un solo comando",t=>{
  const f=fixture(t),calls=[];
  const result=runR4VisualReview({
    root:f.root,natalia:"assets/natalia.glb",copiloto:"assets/copiloto.blend",
    blender:"blender",visualDir:f.visualDir,runner:fakeRunner(calls)
  });
  assert.equal(calls.length,4);
  assert.equal(result.visual.natalia.rendered,7);
  assert.equal(result.visual.copiloto.rendered,7);
  assert.equal(result.readyForProduction,false);
  const html=fs.readFileSync(path.join(f.visualDir,"index.html"),"utf8");
  assert.match(html,/Natalia/);
  assert.match(html,/Copiloto/);
  assert.match(html,/natalia_right_hand.png/);
  assert.match(html,/copiloto_right_hand.png/);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.visualDir,"evidence.json"),"utf8")).schema,
    "arc.r4.visual.review.v1");
  assert.equal(fs.readFileSync(f.natalia,"utf8"),"fake-natalia-original");
  assert.equal(fs.readFileSync(f.copiloto,"utf8"),"fake-copiloto-original");
});
test("R4 VISUAL: conserva ausencias con honestidad, nunca certifica produccion",t=>{
  const f=fixture(t),calls=[];
  const result=runR4VisualReview({
    root:f.root,natalia:"assets/natalia.glb",copiloto:"assets/copiloto.blend",
    blender:"blender",visualDir:f.visualDir,
    runner:fakeRunner(calls,{partial:true})
  });
  assert.equal(result.visual.natalia.status,"partial");
  assert.equal(result.visual.copiloto.views.right_hand.status,"missing");
  assert.equal(result.readyForProduction,false);
  assert.match(fs.readFileSync(path.join(f.visualDir,"index.html"),"utf8"),
    /Sin hueso de mano/);
});
test("R4 VISUAL: nunca sobrescribe un directorio de evidencias existente",t=>{
  const f=fixture(t),calls=[];
  fs.mkdirSync(f.visualDir);
  fs.writeFileSync(path.join(f.visualDir,"index.html"),"evidencia-anterior");
  assert.throws(()=>runR4VisualReview({
    root:f.root,natalia:"assets/natalia.glb",copiloto:"assets/copiloto.blend",
    blender:"blender",visualDir:f.visualDir,runner:fakeRunner(calls)
  }),/carpeta de evidencias existe/);
  assert.equal(calls.length,0);
  assert.equal(fs.readFileSync(path.join(f.visualDir,"index.html"),"utf8"),"evidencia-anterior");
});
test("R4 VISUAL: nombres falsos de imagen y archivos vacios no se aceptan",t=>{
  const f=fixture(t);
  fs.mkdirSync(f.visualDir);
  const images=Object.fromEntries(SHOTS.map(shot=>[
    shot,{status:"rendered",image:"../secret.glb",note:"engaño"}]));
  const stdout=START+"\n"+JSON.stringify({
    schema:"arc.blender.visual.proof.v1",
    actor:"natalia",noOriginalSaved:true,images
  })+"\n"+END;
  assert.throws(()=>parseVisualReport(stdout,"natalia",f.visualDir),/Nombre de imagen inesperado/);
  const valid=Object.fromEntries(SHOTS.map(shot=>[
    shot,{status:"rendered",image:"natalia_"+shot+".png",note:null}]));
  const txt=START+"\n"+JSON.stringify({
    schema:"arc.blender.visual.proof.v1",actor:"natalia",
    noOriginalSaved:true,images:valid
  })+"\n"+END;
  const report=parseVisualReport(txt,"natalia",f.visualDir);
  assert.equal(report.rendered,0);
  assert.equal(report.status,"partial");
});
test("R4 VISUAL: texto potencialmente hostil se escapa en HTML",t=>{
  const f=fixture(t),calls=[];
  runR4VisualReview({
    root:f.root,natalia:"assets/natalia.glb",copiloto:"assets/copiloto.blend",
    blender:"blender",visualDir:f.visualDir,
    runner:fakeRunner(calls,{injectHTML:true})
  });
  const html=fs.readFileSync(path.join(f.visualDir,"index.html"),"utf8");
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>alert"));
});
test("R4 VISUAL: no acepta un solo actor ni modelo fuera del R4",t=>{
  const f=fixture(t),calls=[];
  assert.throws(()=>parseVisualArgs(["--root",f.root]),/Se requiere/);
  assert.throws(()=>runR4VisualReview({
    root:f.root,natalia:"assets/natalia.glb",copiloto:"",blender:"blender",
    visualDir:f.visualDir,runner:fakeRunner(calls)
  }),/dos modelos/);
  const secret=path.join(f.dir,"outside.glb");
  fs.writeFileSync(secret,"outside");
  assert.throws(()=>runR4VisualReview({
    root:f.root,natalia:secret,copiloto:"assets/copiloto.blend",
    blender:"blender",visualDir:f.visualDir,runner:fakeRunner(calls)
  }),/fuera de la carpeta/);
  assert.equal(calls.length,0);
});
