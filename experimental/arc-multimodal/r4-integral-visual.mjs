/**
 * ARC Privus: visual evidence for both original R4 models in one command.
 * Only renders to an entirely NEW folder, never saves the original model.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {runR4Preflight,validateSelection} from "./r4-integral-preflight.mjs";

const RENDER_SCRIPT=path.join(path.dirname(fileURLToPath(import.meta.url)),"blender-visual-proof.py");
const VIEWS=Object.freeze(["front","walk","run","face_jaw","face_blink","left_hand","right_hand"]);
const START="=== ARC_VISUAL_PROOF_BEGIN ===";
const END="=== ARC_VISUAL_PROOF_END ===";
const ACTORS=Object.freeze(["natalia","copiloto"]);
const TITLES=Object.freeze({
  front:"Cuerpo completo: vista frontal",
  walk:"Cuerpo: paso de caminar",run:"Cuerpo: paso de correr",
  face_jaw:"Rostro: apertura de boca",face_blink:"Rostro: parpadeo",
  left_hand:"Detalle: mano izquierda",right_hand:"Detalle: mano derecha"
});
function escapeHTML(value){
  return String(value??"").replace(/[&<>"']/g,char=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[char]));
}
function imageHash(file){
  const data=fs.readFileSync(file);
  if(data.length<8 || !data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
    throw new Error("Archivo PNG invalido");
  return crypto.createHash("sha256").update(data).digest("hex");
}
export function parseVisualReport(stdout,actor,directory){
  if(typeof stdout!=="string")throw new TypeError("Blender no devolvio texto");
  const i=stdout.lastIndexOf(START),j=stdout.lastIndexOf(END);
  if(i<0||j<=i)throw new Error("Blender no devolvio prueba visual JSON");
  const data=JSON.parse(stdout.slice(i+START.length,j));
  if(data?.schema!=="arc.blender.visual.proof.v1"||data.actor!==actor||
      data.noOriginalSaved!==true || !data.images || typeof data.images!=="object")
    throw new Error("La prueba visual no coincide con el personaje");
  const views={};
  for(const view of VIEWS){
    const item=data.images[view];
    if(!item||!["rendered","missing","error"].includes(item.status))
      throw new Error("Vista ausente/invalida: "+view);
    const expected=actor+"_"+view+".png";
    let status=item.status;
    let sha256=null,note=String(item.note??"").slice(0,500);
    if(status==="rendered"){
      if(item.image!==expected)throw new Error("Nombre de imagen inesperado");
      try{sha256=imageHash(path.resolve(directory,expected));}
      catch(error){status="error";note="Imagen invalida: "+error.message;}
    }else if(item.image!==null)throw new Error("Imagen no renderizada marcada como existente");
    views[view]={status,image:status==="rendered"?expected:null,sha256,note};
  }
  const count=VIEWS.filter(v=>views[v].status==="rendered").length;
  return {status:count===VIEWS.length?"all_rendered":"partial",
    rendered:count,expected:VIEWS.length,views};
}
function buildHtml(report){
  const render=(actor,view)=>{
    const item=report.visual[actor]?.views?.[view];
    const label=actor==="natalia"?"Natalia":"Copiloto";
    if(item?.status==="rendered")
      return '<figure><img src="'+item.image+'" alt="'+label+': '+escapeHTML(TITLES[view])+
        '" loading="lazy"/><figcaption>'+escapeHTML(item.note||"Captura de geometria")+
        '</figcaption></figure>';
    return '<div class="missing">Sin evidencia: '+
      escapeHTML(item?.note||"No ejecutado")+'</div>';
  };
  const rows=VIEWS.map(view=>'<section><h2>'+escapeHTML(TITLES[view])+
    '</h2><div class="pair">'+render("natalia",view)+render("copiloto",view)+
    '</div></section>').join("\n");
  const style='body{font-family:system-ui,Segoe UI,sans-serif;margin:2rem auto;max-width:1100px;padding:0 1rem;background:#121722;color:#f4f6f9}'+
    'h1{font-size:2rem}h2{font-size:1.3rem;margin-top:2rem}.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}'+
    'figure,.missing{margin:0;background:#222b3a;padding:0.75rem;border-radius:.8rem}img{width:100%;height:auto;background:white;border-radius:.4rem}'+
    'figcaption,.missing{padding:.6rem;font-size:.96rem}.names{display:grid;grid-template-columns:1fr 1fr;gap:1rem;font-size:1.5rem;font-weight:700}'+
    'small{color:#c9cfdb;font-size:1rem}a{color:#a6c9ff}@media(max-width:650px){.pair{grid-template-columns:1fr}.names{font-size:1.1rem}}';
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"/>'+
    '<meta name="viewport" content="width=device-width,initial-scale=1"/>'+
    '<title>ARC R4: prueba visual integral</title><style>'+style+'</style></head>'+
    '<body><h1>ARC Privus — auditoría visual de Natalia y Copiloto</h1>'+
    '<p>Capturas locales mediante Blender Workbench. <strong>NO certifican estetica, animacion, voz ni sincronizacion labial.</strong> No se guardo ningun archivo fuente.</p>'+
    '<div class="names"><div>Natalia</div><div>Copiloto</div></div>'+rows+
    '<p><small>Detalles en evidence.json. Walk/run: solo fotogramas de acciones con nombres coincidentes, sin evaluar calidad. Boca/parpados: forma aplicada, no voz sincronizada.</small></p></body></html>';
}
export function parseVisualArgs(argv){
  const allowed=new Set(["--root","--natalia","--copiloto","--blender","--visual-dir"]);
  const args={};
  for(let i=0;i<argv.length;i+=2){
    if(!allowed.has(argv[i])||typeof argv[i+1]!=="string"||!argv[i+1])
      throw new Error("Argumento no valido; usar pares --opcion valor");
    const key=argv[i].slice(2);
    if(key in args)throw new Error("Opcion repetida: "+key);
    args[key]=argv[i+1];
  }
  if(["root","natalia","copiloto","blender","visual-dir"].some(k=>!args[k]))
    throw new Error("Se requiere --root --natalia --copiloto --blender --visual-dir");
  return {root:args.root,natalia:args.natalia,copiloto:args.copiloto,
    blender:args.blender,visualDir:args["visual-dir"]};
}
export function runR4VisualReview({
  root,natalia,copiloto,blender,visualDir,runner=spawnSync
}={}){
  if(!root||!natalia||!copiloto||!blender||!visualDir)
    throw new Error("Se requieren dos modelos, Blender y directorio nuevo");
  const sources={
    natalia:validateSelection(root,natalia),
    copiloto:validateSelection(root,copiloto)
  };
  if(sources.natalia===sources.copiloto)throw new Error("Los dos modelos son iguales");
  const dest=path.resolve(visualDir);
  if(fs.existsSync(dest))throw new Error("La carpeta de evidencias existe; no se sobreescribe");
  const preflight=runR4Preflight({root,natalia,copiloto,blender,runner});
  fs.mkdirSync(dest,{recursive:false});
  const visual={};
  for(const actor of ACTORS){
    const args=["--disable-autoexec","-b","-t","2","--python",RENDER_SCRIPT,"--",
      "--asset",sources[actor],"--out-dir",dest,"--actor",actor,"--resolution","512"];
    const result=runner(blender,args,{
      encoding:"utf8",timeout:360000,maxBuffer:12*1024*1024,
      windowsHide:true,shell:false
    });
    if(result.error||result.status!==0){
      visual[actor]={status:"error",message:result.error?.code||
        ("Blender: "+result.status),views:{},rendered:0,expected:VIEWS.length};
      continue;
    }
    try{visual[actor]=parseVisualReport(result.stdout,actor,dest);}
    catch(error){
      visual[actor]={status:"error",message:String(error.message),
        views:{},rendered:0,expected:VIEWS.length};
    }
  }
  const report={
    schema:"arc.r4.visual.review.v1",producedAt:new Date().toISOString(),
    preflight,visual,readyForProduction:false,
    notes:[
      "Capturas diagnosticas, NO son prueba de calidad cinematografica.",
      "No sustituyen inspeccion de manos, piel, ojos, naturalidad ni lip-sync.",
      "No se modifica ni se guarda el archivo original."
    ]
  };
  fs.writeFileSync(path.join(dest,"evidence.json"),JSON.stringify(report,null,2)+"\n",{flag:"wx"});
  fs.writeFileSync(path.join(dest,"index.html"),buildHtml(report),{flag:"wx"});
  return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const report=runR4VisualReview(parseVisualArgs(process.argv.slice(2)));
    console.log(JSON.stringify({schema:report.schema,visual:report.visual,
      readyForProduction:report.readyForProduction},null,2));
  }catch(error){
    console.error("ARC R4 VISUAL ERROR: "+String(error.message));
    process.exitCode=1;
  }
}
