import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// La mision es total; la ejecucion disponible v0.2 SOLO inventaria.
// Se completara por motores verificados, nunca por comandos arbitrarios.
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=process.env.ARC_AUDITOR3D_ROOT||path.join(os.homedir(),'ARC_AUDITOR3D_DATOS');
const CATALOG=path.join(ROOT,'catalogo.json');
const MISSION=path.join(HERE,'mision_total.json');
const IDS=['natalia','arnold'];
const TASKS=['inventario','geometria_facial','boca_mandibula','rig',
 'animaciones','materiales','voz_autorizada','exportacion_glb_laboratorio','pruebas_integrales'];

async function mission(){
 const m=JSON.parse(await fsp.readFile(MISSION,'utf8'));
 if(m.schema!=='arc.3d.full_mission.v1'||m.max_attempts_per_stage>3||
    IDS.some(id=>!m.characters.includes(id)))throw Error('Contrato invalido');
 return m;
}
async function catalog(){
 try{return JSON.parse(await fsp.readFile(CATALOG,'utf8')).characters||{};}
 catch(e){if(e.code==='ENOENT')return {};throw e;}
}
function child(exe,args){
 return new Promise((resolve,reject)=>{
  const c=spawn(exe,args,{shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='',timedOut=false;
  c.stdout.on('data',b=>stdout=(stdout+b.toString()).slice(-25000));
  c.stderr.on('data',b=>stderr=(stderr+b.toString()).slice(-25000));
  const timer=setTimeout(()=>{timedOut=true;c.kill();},220000);
  c.once('error',e=>{clearTimeout(timer);reject(e);});
  c.once('close',code=>{clearTimeout(timer);resolve({code,timedOut,stdout,stderr});});
 });
}
async function status(){
 const m=await mission(), models=await catalog();
 return {schema:m.schema,scope:'LABORATORIO_PRIVADO',
  characters:IDS.map(id=>({id,source_registered:typeof models[id]==='string',
   tasks:TASKS.map((task,i)=>({task,state:i===0?
    (typeof models[id]==='string'?'LISTO_PARA_DIAGNOSTICO':'BLOQUEADO_FALTA_FUENTE')
    :'PENDIENTE_MOTOR_VALIDADO'}))})),
  publication_allowed:false,production_changes_allowed:false,
  copilot_connected:false,blender_windows_verified:false};
}
async function run(){
 const m=await mission(), dir=path.join(ROOT,'misiones');
 await fsp.mkdir(dir,{recursive:true});
 const lock=path.join(dir,'MISION_ACTIVA.lock');
 let handle;
 try{handle=await fsp.open(lock,'wx');}
 catch(e){if(e.code==='EEXIST')throw Error('Mision ya iniciada: revisar bloqueo');throw e;}
 try{
  const models=await catalog();
  const report={schema:m.schema,started_at:new Date().toISOString(),
   mission_scope:'NATALIA_Y_ARNOLD_PREPARACION_TOTAL_EN_LABORATORIO',
   production_changes:false,publication_allowed:false,characters:{},
   note:'Mision completa definida. Solo inventario es ejecutable en este prototipo; modelado pendiente de motores verificados.'};
  for(const id of IDS){
   const s={status:'',stages:Object.fromEntries(TASKS.map(t=>[t,'PENDIENTE_MOTOR_VALIDADO']))};
   report.characters[id]=s;
   if(typeof models[id]!=='string'){
    s.status='BLOQUEADO_FALTA_FUENTE_AUTORIZADA';s.stages.inventario='BLOQUEADO';continue;
   }
   let result;
   try{result=await child(process.execPath,[path.join(HERE,'auditor.mjs'),'audit',id]);}
   catch(e){s.status='BLOQUEADO_EJECUTOR';s.error=e.message;continue;}
   s.return_code=result.code;
   if(result.code!==0||result.timedOut){
    s.status='BLOQUEADO_INSPECCION';s.error=result.stderr.slice(-2500);
    s.stages.inventario='BLOQUEADO';continue;
   }
   try{
    const data=JSON.parse(result.stdout);
    const r=JSON.parse(await fsp.readFile(data.report_path,'utf8'));
    if(r.status!=='DIAGNOSTICO_COMPLETO_REVISION_HUMANA'||r.source_unchanged!==true||
       r.approved_for_publication!==false)throw Error('Reporte no aprobable');
    s.status='INVENTARIO_LISTO_DESARROLLO_PENDIENTE';
    s.report_path=data.report_path;s.stages.inventario='COMPLETADO_NO_APROBACION_ARTISTICA';
   }catch(e){s.status='BLOQUEADO_REPORTE';s.error=e.message;s.stages.inventario='BLOQUEADO';}
  }
  report.finished_at=new Date().toISOString();
  const stamp=new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomBytes(3).toString('hex');
  const outfile=path.join(dir,'MISION_'+stamp+'.json');
  await fsp.writeFile(outfile,JSON.stringify(report,null,2),{flag:'wx'});
  return {report:outfile,characters:report.characters,publication_allowed:false};
 }finally{await handle.close();await fsp.unlink(lock).catch(()=>{});}
}
try{
 const action=process.argv[2]||'status';
 if(action==='status')console.log(JSON.stringify(await status(),null,2));
 else if(action==='run')console.log(JSON.stringify(await run(),null,2));
 else throw Error('Accion no autorizada; usa status o run');
}catch(e){console.error('ARC_MISION_ERROR:',e.message);process.exitCode=1;}
