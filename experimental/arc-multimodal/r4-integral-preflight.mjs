/**
 * ARC Privus R4 - inspeccion integral segura de archivos 3D originales.
 * Sin dependencias externas, sin modificar modelos, sin peticiones de red.
 * Uso:
 * node r4-integral-preflight.mjs --root "D:\R4"
 * node r4-integral-preflight.mjs --root "D:\R4" --natalia "ruta\natalia.blend" --copiloto "ruta\copiloto.glb" --blender "C:\Program Files\Blender Foundation\Blender 4.2\blender.exe" --out "D:\reportes\arc-preflight.json"
 * Las rutas --natalia y --copiloto deben existir dentro de --root.
 * Sin --blender, solo busca y comprueba archivos; no abre los assets.
 * Sin --out, no escribe archivos.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";

const EXTENSIONS=new Set([".blend",".glb",".gltf"]);
const SKIP=new Set([".git","node_modules",".venv","__pycache__",".next","dist","build"]);
const DEFAULT_LIMITS=Object.freeze({maxDepth:12,maxEntries:12000,maxAssets:300});
const OPEN="=== ARC_RIG_INVENTORY_BEGIN ===";
const CLOSE="=== ARC_RIG_INVENTORY_END ===";
const SOURCE_SCRIPT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"blender-rig-inventory.py");

export function classifyModel(filename){
  const n=filename.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  if(/natalia/.test(n))return "natalia";
  if(/copiloto|copilot|arnold.?rc|arnol.?rc/.test(n))return "copiloto";
  return "sin_identificar";
}

function realDirectory(root){
  const base=fs.realpathSync(path.resolve(root));
  if(!fs.statSync(base).isDirectory())throw new TypeError("No es carpeta: "+base);
  return base;
}
function within(root,target){
  const relative=path.relative(root,target);
  return relative===""||(
    relative!==".."&&!relative.startsWith(".."+path.sep)&&!path.isAbsolute(relative)
  );
}
export function scanR4(root,limits={}){
  const params={...DEFAULT_LIMITS,...limits};
  if(!Number.isInteger(params.maxDepth)||params.maxDepth<1||params.maxDepth>32
      ||!Number.isInteger(params.maxEntries)||params.maxEntries<1||params.maxEntries>100000
      ||!Number.isInteger(params.maxAssets)||params.maxAssets<1||params.maxAssets>10000){
    throw new RangeError("Limites de exploracion no validos");
  }
  const base=realDirectory(root);
  const stack=[{dir:base,depth:0}];
  const assets=[],warnings=[];
  let entries=0;
  let limitReached=false;
  while(stack.length&&!limitReached){
    const {dir,depth}=stack.pop();
    let names;
    try{names=fs.readdirSync(dir,{withFileTypes:true});}
    catch(error){warnings.push("No se pudo leer: "+path.relative(base,dir));continue;}
    for(const entry of names){
      if(++entries>params.maxEntries){limitReached=true;break;}
      // NO seguir enlaces (ni Windows junctions) que puedan salir del R4.
      if(entry.isSymbolicLink())continue;
      const absolute=path.join(dir,entry.name);
      if(entry.isDirectory()){
        if(depth>=params.maxDepth){warnings.push("Profundidad agotada: "+path.relative(base,absolute));continue;}
        if(!SKIP.has(entry.name.toLowerCase()))stack.push({dir:absolute,depth:depth+1});
      }else if(entry.isFile() && EXTENSIONS.has(path.extname(entry.name).toLowerCase())){
        let stats;
        try{stats=fs.statSync(absolute);}catch(error){continue;}
        if(assets.length>=params.maxAssets){limitReached=true;break;}
        assets.push({
          relativePath:path.relative(base,absolute),
          type:path.extname(entry.name).toLowerCase(),
          bytes:stats.size,
          mtime:stats.mtime.toISOString(),
          candidate:classifyModel(entry.name),
          usable:stats.size>0
        });
      }
    }
  }
  assets.sort((a,b)=>a.relativePath.localeCompare(b.relativePath,"es"));
  const candidates={
    natalia:assets.filter(x=>x.candidate==="natalia"&&x.usable),
    copiloto:assets.filter(x=>x.candidate==="copiloto"&&x.usable),
    unknown:assets.filter(x=>x.candidate==="sin_identificar"&&x.usable)
  };
  return {schema:"arc.r4.discovery.v1",root:base,assets,candidates,
    scannedEntries:entries,complete:!limitReached,
    warnings:limitReached?[...warnings,"Exploracion incompleta: se alcanzo un limite"]:warnings};
}
export function validateSelection(root,requested){
  const base=realDirectory(root);
  if(typeof requested!=="string"||!requested.trim())
    throw new TypeError("Ruta del modelo vacia");
  const absolute=path.resolve(base,requested);
  const real=fs.realpathSync(absolute);
  if(!within(base,real))throw new Error("Modelo fuera de la carpeta R4");
  if(!EXTENSIONS.has(path.extname(real).toLowerCase()))
    throw new Error("Formato 3D no permitido");
  if(!fs.statSync(real).isFile()||fs.statSync(real).size===0)
    throw new Error("Modelo vacio o no es archivo");
  return real;
}
export function readBlenderInventory(stdout){
  if(typeof stdout!=="string")throw new TypeError("Salida de Blender no textual");
  const start=stdout.lastIndexOf(OPEN),end=stdout.lastIndexOf(CLOSE);
  if(start<0||end<=start)throw new Error("Blender no devolvio inventario JSON valido");
  const report=JSON.parse(stdout.slice(start+OPEN.length,end).trim());
  if(report?.schema!=="arc.blender.rig.inventory.v1"
      || !Array.isArray(report.bones)||!Array.isArray(report.meshes))
    throw new TypeError("Inventario Blender con contrato invalido");
  return report;
}
function simplifyInventory(inv){
  const aliases={
    leftHand:["lefthand","hand_l","left_hand","mixamoriglefthand"],
    rightHand:["righthand","hand_r","right_hand","mixamorigrighthand"],
    leftFoot:["leftfoot","foot_l","left_foot","mixamorigleftfoot"],
    rightFoot:["rightfoot","foot_r","right_foot","mixamorirightfoot","mixamorigrightfoot"]
  };
  const simplify=n=>String(n).replace(/[^a-z0-9]/gi,"").toLowerCase();
  const issues=[],warnings=[];
  const bones=inv.bones.map(simplify);
  const limbs={};
  const minVertices=3;
  const threshold=0.05;
  const countsAvailable=inv.meshes.length>0 && inv.meshes.every(mesh=>
    mesh.weightedVertexCounts && typeof mesh.weightedVertexCounts==="object" &&
    !Array.isArray(mesh.weightedVertexCounts) && mesh.weightThreshold===threshold
  );
  if(!countsAvailable)issues.push("Sin evidencia cuantitativa de pesos por vertice");
  for(const [name,variants] of Object.entries(aliases)){
    const normalized=variants.map(simplify);
    const hasBone=bones.some(x=>normalized.includes(x));
    const total=countsAvailable ? inv.meshes.reduce((sum,mesh)=>{
      const matches=Object.entries(mesh.weightedVertexCounts)
        .filter(([group,count])=>normalized.includes(simplify(group)) &&
          Number.isSafeInteger(count) && count>=0);
      return sum+matches.reduce((s,[,count])=>s+count,0);
    },0):null;
    const hasInfluence=Number.isFinite(total) && total>=minVertices;
    limbs[name]={hasBone,hasInfluence,weightedVertices:total,
      minimumVertices:minVertices,minimumWeight:threshold};
    if(!hasBone)issues.push("Hueso faltante: "+name);
    else if(countsAvailable && !hasInfluence)
      issues.push("Influencia insuficiente en "+name+": "+total+" vertices");
  }

  const suspiciousMeshes=inv.meshes.filter(mesh=>
    /mano|hand/i.test(mesh.name||"") &&
    (mesh.visibleInRender===false || mesh.vertices===0 || mesh.polygons===0)
  ).map(mesh=>mesh.name);
  if(suspiciousMeshes.length)issues.push(
    "Mallas de mano invisibles o sin geometria: "+suspiciousMeshes.join(", ")
  );
  const unboundHandMeshes=(inv.unboundMeshNames||[])
    .filter(name=>/mano|hand/i.test(name));
  if(unboundHandMeshes.length)issues.push(
    "Posibles mallas de mano sin esqueleto: "+unboundHandMeshes.join(", ")
  );
  const hiddenMeshes=inv.meshes
    .filter(mesh=>mesh.visibleInRender===false)
    .map(mesh=>mesh.name);
  if(hiddenMeshes.length)warnings.push(
    "Mallas ocultas para render: "+hiddenMeshes.join(", ")
  );
  const morphs=new Set(inv.morphs.map(simplify));
  if(!["jawopen","mouthopen"].some(x=>morphs.has(x)))
    issues.push("Falta apertura de boca");
  if(!["eyeblink","eyeblinkleft","blink"].some(x=>morphs.has(x)))
    issues.push("Falta parpadeo");
  for(const action of ["idle","walk","run","sit","stand"])
    if(!inv.clipMap?.[action])issues.push("Sin clip identificado: "+action);
  return {status:issues.length?"incompleto":"estructura_por_verificar_visual",
    issues,warnings,limbs,hiddenMeshes,unboundHandMeshes,suspiciousMeshes,
    actionNames:inv.clips,morphNames:inv.morphs,
    meshCount:inv.meshes.length,armature:inv.armature,
    quantitativeWeightEvidence:countsAvailable};
}
export function runR4Preflight({
  root,natalia,copiloto,blender,out,runner=spawnSync,limits
}={}){
  if(!root)throw new TypeError("Falta --root");
  const discovery=scanR4(root,limits);
  const selected={};
  if(natalia||copiloto){
    if(!natalia||!copiloto)throw new Error("Se requieren ambas rutas --natalia y --copiloto");
    selected.natalia=validateSelection(discovery.root,natalia);
    selected.copiloto=validateSelection(discovery.root,copiloto);
    if(selected.natalia===selected.copiloto)
      throw new Error("Natalia y Copiloto no pueden ser el mismo archivo");
  }
  const report={
    schema:"arc.r4.preflight.v1",generatedAt:new Date().toISOString(),
    discovery:{
      assets:discovery.assets,candidateCounts:Object.fromEntries(
        Object.entries(discovery.candidates).map(([k,v])=>[k,v.length])),
      complete:discovery.complete,warnings:discovery.warnings,
      scannedEntries:discovery.scannedEntries
    },
    selected:Object.fromEntries(Object.entries(selected).map(([k,v])=>[
      k,path.relative(discovery.root,v)])),
    examined:{},readyForProduction:false
  };
  if(blender){
    if(!selected.natalia||!selected.copiloto)
      throw new Error("Para ejecutar Blender, selecciona los dos modelos");
    for(const [actor,asset] of Object.entries(selected)){
      const result=runner(blender,["-b","--python",SOURCE_SCRIPT,"--","--asset",asset],{
        encoding:"utf8",timeout:180000,maxBuffer:12*1024*1024,
        windowsHide:true,shell:false
      });
      if(result.error||result.status!==0){
        report.examined[actor]={status:"error",message:
          result.error?.code||("Blender devolvio codigo "+result.status)};
        continue;
      }
      try{
        const raw=readBlenderInventory(result.stdout);
        report.examined[actor]=simplifyInventory(raw);
      }catch(error){
        report.examined[actor]={status:"error",message:String(error.message)};
      }
    }
  }
  report.nextStep=Object.keys(selected).length!==2
    ?"Elegir explicitamente las dos rutas de los modelos autenticos; no hay seleccion automatica"
    :blender
      ?"Inspeccionar visualmente ambos personajes, movimiento, ojos, labios y mallas en R4"
      :"Proporcionar --blender para auditar los dos modelos sin modificar originales";
  // Nota: evita guardar rutas absolutas o audios en el JSON del informe.
  if(out){
    const target=path.resolve(out);
    if(within(discovery.root,target) &&
        [selected.natalia,selected.copiloto].includes(target))
      throw new Error("No se permite sobrescribir un archivo original");
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,JSON.stringify(report,null,2)+"\n",{flag:"wx"});
  }
  return report;
}
export function parseR4Args(argv){
  const allowed=new Set(["--root","--natalia","--copiloto","--blender","--out"]);
  const opts={};
  for(let i=0;i<argv.length;i+=2){
    if(!allowed.has(argv[i])||typeof argv[i+1]!=="string")
      throw new Error("Argumentos incorrectos (usar --root y pares --clave valor)");
    const key=argv[i].slice(2);
    if(key in opts)throw new Error("Opcion repetida: "+argv[i]);
    opts[key]=argv[i+1];
  }
  return opts;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const data=runR4Preflight(parseR4Args(process.argv.slice(2)));
    console.log(JSON.stringify(data,null,2));
  }catch(error){
    console.error("ARC R4 AUDIT ERROR: "+String(error.message));
    process.exitCode=1;
  }
}
