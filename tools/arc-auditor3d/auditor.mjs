import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// V0.1 — local, aislado; nunca invocado desde server.js.
const ROOT=path.join(os.homedir(),'ARC_AUDITOR3D_DATOS');
const CATALOG=path.join(ROOT,'catalogo.json');
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ALLOWED=new Set(['natalia','arnold']);
const ACTIVE=new Set();

function validate(id,src) {
  if(!ALLOWED.has(id)) throw new Error('Personaje no autorizado');
  if(!src || !path.isAbsolute(src) || !/\.(blend|glb)$/i.test(src))
    throw new Error('Ruta absoluta a .blend o .glb requerida');
  return path.resolve(src);
}
async function catalog() {
  const c=JSON.parse(await fsp.readFile(CATALOG,'utf8'));
  if(!c || typeof c.characters!=='object') throw new Error('Catalogo invalido');
  return c.characters;
}
async function sha256(p) {
  return await new Promise((ok,fail)=>{
    const h=crypto.createHash('sha256');
    const stream=fs.createReadStream(p);
    stream.on('data',b=>h.update(b));
    stream.once('error',fail);
    stream.once('end',()=>ok(h.digest('hex')));
  });
}
async function blenderPath() {
  for(const f of [process.env.BLENDER_EXE,
    'C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 4.3\\blender.exe'].filter(Boolean)){
    try {if((await fsp.stat(f)).isFile()) return f;} catch {}
  }
  throw new Error('Blender no localizado: configura BLENDER_EXE');
}
async function blenderRun(exe,source,out) {
  return await new Promise((ok,fail)=>{
    const child=spawn(exe,['--background','--factory-startup','--disable-autoexec',
      '--python',path.join(HERE,'blender_worker.py'),'--',source,out],
      {shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
    let err='';
    let timedOut=false;
    const timer=setTimeout(()=>{timedOut=true; child.kill();},180000);
    child.stderr.on('data',b=>{err=(err+b.toString()).slice(-12000);});
    child.once('error',e=>{clearTimeout(timer);fail(e);});
    child.once('close',code=>{clearTimeout(timer);ok({code,timedOut,stderr_tail:err});});
  });
}
async function register(id,src) {
  const p=validate(id,src);
  if(!(await fsp.stat(p)).isFile()) throw new Error('Modelo no encontrado');
  await fsp.mkdir(ROOT,{recursive:true});
  let c={characters:{}};
  try {c=JSON.parse(await fsp.readFile(CATALOG,'utf8'));} catch(e){if(e.code!=='ENOENT')throw e;}
  c.characters[id]=p;
  const temp=CATALOG+'.'+crypto.randomBytes(4).toString('hex')+'.tmp';
  await fsp.writeFile(temp,JSON.stringify(c,null,2),{encoding:'utf8',flag:'wx'});
  await fsp.rename(temp,CATALOG);
  return {registered:id,source:p,original_modified:false};
}
async function audit(id) {
  if(!ALLOWED.has(id)) throw new Error('Personaje no autorizado');
  if(ACTIVE.has(id)) throw new Error('Auditoria en curso: '+id);
  ACTIVE.add(id);
  try {
    const sources=await catalog(), source=validate(id,sources[id]);
    if(!(await fsp.stat(source)).isFile()) throw new Error('Archivo no valido');
    const before=await sha256(source);
    const exe=await blenderPath();
    const dir=path.join(ROOT,'reportes',id);
    await fsp.mkdir(dir,{recursive:true});
    const stamp=new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomBytes(3).toString('hex');
    const inner=path.join(dir,'inspeccion-'+stamp+'.json');
    const process=await blenderRun(exe,source,inner);
    const after=await sha256(source);
    let worker={status:'SIN_REPORTE'};
    try {
      if((await fsp.stat(inner)).size>4194304)throw new Error('Reporte demasiado grande');
      worker=JSON.parse(await fsp.readFile(inner,'utf8'));
    }catch(e){worker={status:'ERROR_REPORTE',detail:String(e.message)};}
    const complete=process.code===0 && !process.timedOut &&
      before===after && worker.status==='INSPECCION_COMPLETA';
    const report={schema:'arc.audit3d.v1',character:id,source,
      sha256_before:before,sha256_after:after,source_unchanged:before===after,
      status:complete?'DIAGNOSTICO_COMPLETO_REVISION_HUMANA':'BLOQUEADO',
      worker,blender:process,approved_for_publication:false,
      original_modification_authorized:false};
    const outfile=path.join(dir,'auditoria-'+stamp+'.json');
    await fsp.writeFile(outfile,JSON.stringify(report,null,2),{flag:'wx'});
    return {status:report.status,character:id,report_path:outfile};
  }finally{ACTIVE.delete(id);}
}
async function status() {
  let models=[],blender=false;
  try{models=Object.keys(await catalog());}catch{}
  try{await blenderPath();blender=true;}catch{}
  return {name:'ARC Auditor3D',version:'0.1',mode:'local_read_only',models,
    blender_detected:blender,panel_connected:false,copilot_connected:false};
}
async function serve() {
  const token=process.env.ARC_AUDITOR_TOKEN;
  if(!token || token.length<24)throw new Error('ARC_AUDITOR_TOKEN requiere minimo 24 caracteres');
  const port=Number(process.env.ARC_AUDITOR_PORT||3117);
  if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Puerto invalido');
  http.createServer(async(req,res)=>{
    const send=(n,x)=>{res.writeHead(n,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(x));};
    if(req.headers.authorization!=='Bearer '+token)return send(401,{error:'No autorizado'});
    try{
      if(req.method==='GET'&&req.url==='/v1/status')return send(200,await status());
      if(req.method==='POST'&&req.url==='/v1/audits'){
        let data='';
        for await (const b of req){data+=b.toString();if(data.length>1024)throw new Error('Solicitud excesiva');}
        const payload=JSON.parse(data);
        if(!ALLOWED.has(payload.character))throw new Error('Personaje invalido');
        return send(200,await audit(payload.character));
      }
      send(404,{error:'Ruta desconocida'});
    }catch(e){send(422,{error:String(e.message)});}
  }).listen(port,'127.0.0.1',()=>console.log('Auditor local activo en 127.0.0.1:'+port));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const [action,id,src]=process.argv.slice(2);
    if(!action||action==='status')console.log(JSON.stringify(await status(),null,2));
    else if(action==='register')console.log(JSON.stringify(await register(id,src),null,2));
    else if(action==='audit')console.log(JSON.stringify(await audit(id),null,2));
    else if(action==='serve')await serve();
    else throw new Error('Usa status | register PERSONAJE RUTA | audit PERSONAJE | serve');
  }catch(e){console.error('ARC_AUDITOR_ERROR:',e.message);process.exitCode=1;}
}
