import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  classifyModel,scanR4,validateSelection,readBlenderInventory,
  runR4Preflight,parseR4Args
} from "./r4-integral-preflight.mjs";

function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"arc-r4-preflight-"));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,"assets","natalia"),{recursive:true});
  fs.mkdirSync(path.join(root,"assets","copiloto"),{recursive:true});
  fs.writeFileSync(path.join(root,"assets","natalia","NATALIA_V095.glb"),"glb-de-prueba");
  fs.writeFileSync(path.join(root,"assets","copiloto","ARNOLD_RC_V23.blend"),"blend-de-prueba");
  return root;
}
function inventory(armature){
  return {schema:"arc.blender.rig.inventory.v1",armature,
    bones:["LeftHand","RightHand","LeftFoot","RightFoot"],
    meshes:[{
      name:"body",vertices:400,polygons:200,
      weightedGroups:["LeftHand","RightHand","LeftFoot","RightFoot"],
      weightedVertexCounts:{LeftHand:12,RightHand:12,LeftFoot:14,RightFoot:14},
      weightThreshold:0.05,visibleInRender:true,visibleInViewport:true,
      boundToArmature:true
    }],
    morphs:["eyeBlink","jawOpen"],clips:["Idle","Walk","Run","Sit","Stand"],
    clipMap:{idle:"Idle",walk:"Walk",run:"Run",sit:"Sit",stand:"Stand"},
    voiceEnabled:false
  };
}
function output(actor){
  return "Blender 4.2\n=== ARC_RIG_INVENTORY_BEGIN ===\n"+
    JSON.stringify(inventory(actor))+
    "\n=== ARC_RIG_INVENTORY_END ===\nBlender quit\n";
}
test("R4: identifica dos activos distintos y no elige version automaticamente",t=>{
  const root=fixture(t);
  fs.writeFileSync(path.join(root,"assets","natalia","NATALIA_FASE11Y32.blend"),"otra-version");
  const s=scanR4(root);
  assert.equal(s.candidates.natalia.length,2);
  assert.equal(s.candidates.copiloto.length,1);
  assert.equal(s.complete,true);
  const report=runR4Preflight({root});
  assert.deepEqual(report.selected,{});
  assert.match(report.nextStep,/Elegir explicitamente/);
  assert.equal(report.readyForProduction,false);
});
test("R4: lectura de ambos modelos en una sola ejecucion, Blender simulado",t=>{
  const root=fixture(t);
  const calls=[];
  const fakeRunner=(command,args,opts)=>{
    calls.push({command,args,opts});
    assert.equal(opts.shell,false);
    assert.equal(opts.windowsHide,true);
    return {status:0,stdout:output(args.at(-1).toLowerCase().includes("natalia")?"NataliaRig":"CopilotoRig")};
  };
  const report=runR4Preflight({
    root,natalia:"assets/natalia/NATALIA_V095.glb",
    copiloto:"assets/copiloto/ARNOLD_RC_V23.blend",
    blender:"blender",runner:fakeRunner
  });
  assert.equal(calls.length,2);
  assert.equal(report.examined.natalia.status,"estructura_por_verificar_visual");
  assert.equal(report.examined.copiloto.status,"estructura_por_verificar_visual");
  assert.equal(report.readyForProduction,false);
  assert.equal(report.selected.natalia,"assets/natalia/NATALIA_V095.glb");
  assert.equal(fs.existsSync(path.join(root,"audit.json")),false);
});
test("R4: aun con hueso, informa mano derecha sin influencias",t=>{
  const root=fixture(t);
  const fakeRunner=(_command,args)=>{
    const v=inventory("Rig");
    if(args.at(-1).toLowerCase().includes("arnold")){
      v.meshes[0].weightedGroups=v.meshes[0].weightedGroups.filter(x=>x!=="RightHand");
      v.meshes[0].weightedVertexCounts.RightHand=0;
    }
    return {status:0,stdout:"=== ARC_RIG_INVENTORY_BEGIN ===\n"+
      JSON.stringify(v)+"\n=== ARC_RIG_INVENTORY_END ==="};
  };
  const report=runR4Preflight({
    root,natalia:"assets/natalia/NATALIA_V095.glb",
    copiloto:"assets/copiloto/ARNOLD_RC_V23.blend",
    blender:"blender",runner:fakeRunner
  });
  assert.equal(report.examined.copiloto.status,"incompleto");
  assert.ok(report.examined.copiloto.issues.some(x=>x.includes("rightHand")));
});
test("R4: entrada fuera de carpeta y enlace simbolico prohibidos",t=>{
  const root=fixture(t);
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),"arc-outside-"));
  t.after(()=>fs.rmSync(outside,{recursive:true,force:true}));
  fs.writeFileSync(path.join(outside,"secret.glb"),"un-asset");
  assert.throws(()=>validateSelection(root,path.join(outside,"secret.glb")) ,/fuera de la carpeta/);
  const linked=path.join(root,"assets","copiloto","secret.glb");
  try{
    fs.symlinkSync(path.join(outside,"secret.glb"),linked);
    assert.throws(()=>validateSelection(root,linked),/fuera de la carpeta/);
    assert.equal(scanR4(root).assets.some(x=>x.relativePath.includes("secret")),false);
  }catch(error){if(error.code!=="EPERM"&&error.code!=="EACCES")throw error;}
});
test("R4: no lanza Blender si no hay dos selecciones verificadas",t=>{
  const root=fixture(t);
  let calls=0;
  assert.throws(()=>runR4Preflight({
    root,natalia:"assets/natalia/NATALIA_V095.glb",
    blender:"blender",runner:()=>{calls++;}
  }),/ambas rutas/);
  assert.equal(calls,0);
});
test("R4: errores de Blender quedan por personaje; no se certifica produccion",t=>{
  const root=fixture(t);
  let calls=0;
  const report=runR4Preflight({
    root,natalia:"assets/natalia/NATALIA_V095.glb",
    copiloto:"assets/copiloto/ARNOLD_RC_V23.blend",
    blender:"blender",runner:()=>++calls===1?{status:9,stdout:""}:{status:0,stdout:"texto sin informe"}
  });
  assert.equal(report.examined.natalia.status,"error");
  assert.equal(report.examined.copiloto.status,"error");
  assert.equal(report.readyForProduction,false);
});
test("R4: informe opt-in no reemplaza ningun archivo existente",t=>{
  const root=fixture(t), out=path.join(root,"reporte.json");
  fs.writeFileSync(out,"protegido");
  assert.throws(()=>runR4Preflight({root,out}),/EEXIST/);
  assert.equal(fs.readFileSync(out,"utf8"),"protegido");
  fs.rmSync(out);
  const report=runR4Preflight({root,out});
  const written=JSON.parse(fs.readFileSync(out,"utf8"));
  assert.equal(written.schema,report.schema);
  assert.equal(written.readyForProduction,false);
  assert.equal(Object.hasOwn(written,"root"),false);
});
test("R4: argumentos y salida Blender invalidos fallan con mensajes claros",()=>{
  assert.equal(classifyModel("Natalia_original.blend"),"natalia");
  assert.equal(classifyModel("ARNOLD_RC_V23.glb"),"copiloto");
  assert.equal(classifyModel("other.glb"),"sin_identificar");
  assert.throws(()=>readBlenderInventory("no json"),/no devolvio inventario/);
  assert.throws(()=>parseR4Args(["--root"]),/Argumentos incorrectos/);
  assert.deepEqual(parseR4Args(["--root","R4"]),{root:"R4"});
});


test("R4: impide falso OK si hay hueso y nombre de grupo pero pocos vertices",t=>{
  const root=fixture(t);
  const fakeRunner=()=>{const v=inventory("Rig");
    v.meshes[0].weightedVertexCounts.RightHand=2;
    return {status:0,stdout:output("Rig").replace(
      JSON.stringify(inventory("Rig")),JSON.stringify(v))};};
  const result=runR4Preflight({
    root,natalia:"assets/natalia/NATALIA_V095.glb",
    copiloto:"assets/copiloto/ARNOLD_RC_V23.blend",
    blender:"blender",runner:fakeRunner
  });
  assert.equal(result.examined.natalia.status,"incompleto");
  assert.equal(result.examined.copiloto.limbs.rightHand.weightedVertices,2);
  assert.match(result.examined.copiloto.issues.join("; "),/Influencia insuficiente en rightHand/);
  assert.equal(result.readyForProduction,false);
});
test("R4: sin conteos cuantitativos no se certifica estructura",t=>{
  const root=fixture(t);
  const fakeRunner=()=>{const v=inventory("Rig");delete v.meshes[0].weightedVertexCounts;
    return {status:0,stdout:"=== ARC_RIG_INVENTORY_BEGIN ===\n"+
      JSON.stringify(v)+"\n=== ARC_RIG_INVENTORY_END ===\n"};};
  const result=runR4Preflight({
    root,natalia:"assets/natalia/NATALIA_V095.glb",
    copiloto:"assets/copiloto/ARNOLD_RC_V23.blend",
    blender:"blender",runner:fakeRunner
  });
  assert.equal(result.examined.natalia.quantitativeWeightEvidence,false);
  assert.match(result.examined.natalia.issues.join("; "),/Sin evidencia cuantitativa/);
});
test("R4: mano invisible y pieza suelta quedan marcadas",t=>{
  const root=fixture(t);
  const fakeRunner=()=>{const v=inventory("Rig");
    v.meshes.push({
      name:"RightHandMesh",vertices:0,polygons:0,
      weightedGroups:[],weightedVertexCounts:{},
      weightThreshold:0.05,visibleInRender:false
    });
    v.unboundMeshNames=["LeftHandObject"];
    return {status:0,stdout:"=== ARC_RIG_INVENTORY_BEGIN ===\n"+
      JSON.stringify(v)+"\n=== ARC_RIG_INVENTORY_END ===\n"};};
  const result=runR4Preflight({
    root,natalia:"assets/natalia/NATALIA_V095.glb",
    copiloto:"assets/copiloto/ARNOLD_RC_V23.blend",
    blender:"blender",runner:fakeRunner
  });
  const a=result.examined.natalia;
  assert.equal(a.status,"incompleto");
  assert.ok(a.suspiciousMeshes.includes("RightHandMesh"));
  assert.ok(a.unboundHandMeshes.includes("LeftHandObject"));
  assert.match(a.warnings.join(" "),/ocultas/);
});
