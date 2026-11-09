/**
 * ARC Creative Universe v1 — reusable, offline-first production planning engine.
 * This module does NOT generate video/audio and contains NO proprietary providers.
 * Real creation requires explicitly approved, replaceable adapters.
 */
import {planIntegratedScene} from './integrated-scene-runtime.mjs';

export const ARC_CREATIVE_SCHEMA='arc.creative.universe.v1';
export const CREATIVE_KINDS=Object.freeze(['video','pelicula','serie','novela','programa','copiloto']);
const ACTIONS=new Set(['idle','walk','run','sit','stand','speak','blink','look']);
const CAPABILITIES=new Set(['script','storyboard','motion','face','voice','visemes','render','layout','dialogue','export','safety']);
const DELIVERY_CAPABILITIES=Object.freeze({
  video:['script','storyboard','motion','face','voice','render','export'],
  pelicula:['script','storyboard','motion','face','voice','render','export'],
  serie:['script','storyboard','motion','face','voice','render','export'],
  novela:['script','layout','export'],
  programa:['script','storyboard','motion','face','voice','render','export'],
  copiloto:['dialogue','safety','voice','visemes','motion','face']
});
const HIGH_RISK=new Set(['voice','visemes','motion','face','render','export','dialogue']);
const clone=x=>JSON.parse(JSON.stringify(x));
function requiredText(value,name,max=250){
  if(typeof value!=='string'||!value.trim()||value.length>max)throw new TypeError(name+' invalido');
  return value.trim();
}
function optionalText(value,name,max=4000){
  if(value==null)return '';
  if(typeof value!=='string'||value.length>max)throw new TypeError(name+' invalido');
  return value.trim();
}
function idText(value,label){
  const id=requiredText(value,label,100).toLowerCase();
  if(!/^[a-z][a-z0-9_-]{0,99}$/.test(id))throw new TypeError(label+' debe ser identificador simple');
  return id;
}
function uniqueIds(list,label,max){
  if(!Array.isArray(list)||list.length>max)throw new TypeError(label+' invalida');
  const ids=list.map(x=>idText(x,label));
  if(new Set(ids).size!==ids.length)throw new Error('Duplicados en '+label);
  return ids;
}
function validateCues(raw,cast){
  if(!Array.isArray(raw)||raw.length>200)throw new TypeError('Cues invalidos');
  const seen=new Set();
  return raw.map((cue,index)=>{
    if(!cue||typeof cue!=='object'||Array.isArray(cue))throw new TypeError('Cue invalida');
    const character=idText(cue.character,'character');
    if(!cast.includes(character))throw new Error('Personaje no incluido en reparto: '+character);
    const action=requiredText(cue.action,'action',20).toLowerCase();
    if(!ACTIONS.has(action))throw new Error('Accion no permitida: '+action);
    const atMs=cue.atMs;
    if(!Number.isInteger(atMs)||atMs<0||atMs>120000)throw new RangeError('atMs fuera de rango');
    const text=optionalText(cue.text,'text',1500);
    if(action==='speak'&&!text)throw new Error('El habla necesita texto');
    if(action!=='speak'&&text)throw new Error('Texto solamente para speak');
    const speed=cue.speed??1;
    if(!Number.isFinite(speed)||speed<0.5||speed>2)throw new RangeError('Velocidad invalida');
    const channel=action==='speak'?'voice':['blink','look'].includes(action)?'face':'motion';
    const key=atMs+':'+character+':'+channel;
    if(seen.has(key))throw new Error('Canal duplicado simultaneo: '+key);
    seen.add(key);
    return {atMs,character,action,text,speed,index};
  });
}
function validateScenes(scenes,cast){
  if(!Array.isArray(scenes)||scenes.length>100)throw new TypeError('Escenas invalidas');
  const used=new Set();
  return scenes.map((s,i)=>{
    if(!s||typeof s!=='object'||Array.isArray(s))throw new TypeError('Escena invalida');
    const id=idText(s.id??('escena_'+(i+1)),'scene.id');
    if(used.has(id))throw new Error('Escena duplicada: '+id);
    used.add(id);
    const durationMs=s.durationMs??null;
    if(durationMs!==null&&(!Number.isInteger(durationMs)||durationMs<1||durationMs>120000))
      throw new RangeError('durationMs invalido');
    const cues=validateCues(s.cues??[],cast);
    if(durationMs!==null&&cues.some(c=>c.atMs>durationMs))throw new RangeError('Cue fuera de la duracion de escena');
    return {id,description:optionalText(s.description,'description',2000),durationMs,cues};
  });
}
function actorIssues(actor){
  const issues=[];
  if(!actor)issues.push('personaje no registrado');
  else{
    if(actor.rights!=='approved')issues.push('derechos/consentimiento sin aprobar');
    if(!actor.assetRef)issues.push('modelo o recurso fuente no vinculado');
    if(actor.rig!=='validated')issues.push('rig/identidad visual no validado');
    if(actor.voice!=='validated')issues.push('voz no validada');
  }
  return issues;
}
export function createCreativeUniverse({name='ARC Privus AI Madre',limit=200}={}){
  requiredText(name,'nombre',150);
  if(!Number.isInteger(limit)||limit<1||limit>1000)throw new RangeError('limit invalido');
  const actors=new Map(),projects=new Map(),providers=new Map(),events=[];
  let sequence=0;
  const audit=(action,detail)=>{
    events.push({sequence:++sequence,action,detail,at:new Date().toISOString()});
    if(events.length>500)events.shift();
  };
  function registerActor(spec={}){
    const id=idText(spec.id,'actor.id');
    if(actors.has(id))throw new Error('Personaje ya registrado: '+id);
    const actor={id,name:requiredText(spec.name,'nombre personaje',120),
      origin:optionalText(spec.origin,'origin',120),
      assetRef:spec.assetRef?requiredText(spec.assetRef,'assetRef',400):null,
      rights:spec.rights??'pending_review',rig:spec.rig??'unverified',
      voice:spec.voice??'unverified'};
    if(!['approved','pending_review','rejected'].includes(actor.rights))throw new TypeError('rights invalido');
    if(!['validated','unverified','failed'].includes(actor.rig)||
      !['validated','unverified','failed'].includes(actor.voice))throw new TypeError('rig/voz invalido');
    actors.set(id,actor);audit('actor_registered',{id});return clone(actor);
  }
  function setActorEvidence(id,{assetRef,rights,rig,voice}={}){
    id=idText(id,'id');const current=actors.get(id);
    if(!current)throw new Error('Actor no registrado');
    const next={...current};
    if(assetRef!==undefined)next.assetRef=assetRef?requiredText(assetRef,'assetRef',400):null;
    if(rights!==undefined){if(!['approved','pending_review','rejected'].includes(rights))throw new TypeError('rights invalido');next.rights=rights;}
    if(rig!==undefined){if(!['validated','unverified','failed'].includes(rig))throw new TypeError('rig invalido');next.rig=rig;}
    if(voice!==undefined){if(!['validated','unverified','failed'].includes(voice))throw new TypeError('voice invalido');next.voice=voice;}
    actors.set(id,next);audit('actor_evidence_updated',{id});return clone(next);
  }
  function createProject(spec={}){
    if(projects.size>=limit)throw new Error('Limite de proyectos alcanzado');
    const id=idText(spec.id,'project.id');if(projects.has(id))throw new Error('Proyecto duplicado');
    const kind=requiredText(spec.kind,'kind',40).toLowerCase();
    if(!CREATIVE_KINDS.includes(kind))throw new Error('Tipo de proyecto no compatible: '+kind);
    const cast=uniqueIds(spec.cast??[],'cast',50);
    const title=requiredText(spec.title,'titulo',200);
    const scenes=validateScenes(spec.scenes??[],cast);
    const project={schema:ARC_CREATIVE_SCHEMA,id,title,kind,
      synopsis:optionalText(spec.synopsis,'synopsis',4000),cast,scenes,
      createdAt:new Date().toISOString(),revision:1};
    projects.set(id,project);audit('project_created',{id,kind});return clone(project);
  }
  function blueprint(projectId){
    const id=idText(projectId,'project.id'),project=projects.get(id);
    if(!project)throw new Error('Proyecto no encontrado: '+id);
    const roles=project.cast.map(id=>({id,actor:actors.has(id)?clone(actors.get(id)):null,
      issues:actorIssues(actors.get(id))}));
    const required=DELIVERY_CAPABILITIES[project.kind];
    const capabilities=required.map(capability=>({
      capability,providers:[...providers.values()].filter(p=>p.enabled&&p.authorized&&p.capabilities.includes(capability))
        .map(p=>({id:p.id,costMode:p.costMode,license:p.license}))
    }));
    const blockers=[];
    for(const {id,issues} of roles){for(const issue of issues)blockers.push(id+': '+issue);}
    if(!project.scenes.length)blockers.push('Sin escenas');
    for(const cap of capabilities)if(!cap.providers.length)blockers.push('Sin proveedor activo: '+cap.capability);
    const shots=project.scenes.map((scene,i)=>({
      index:i+1,id:scene.id,description:scene.description,durationMs:scene.durationMs,
      cues:scene.cues.map(c=>({atMs:c.atMs,character:c.character,action:c.action,
        speed:c.speed,text:c.text}))
    }));
    return clone({schema:'arc.creative.blueprint.v1',project:{id:project.id,title:project.title,
      kind:project.kind,synopsis:project.synopsis,revision:project.revision},cast:roles,
      requirements:capabilities,shots,blockers,productionReady:blockers.length===0,
      note:'Un plan listo por metadatos NO certifica video/audio/marcha/voz real.'});
  }
  function registerProvider(spec={}){
    const id=idText(spec.id,'provider.id');if(providers.has(id))throw new Error('Proveedor duplicado');
    const capabilities=uniqueIds(spec.capabilities??[],'capabilities',20);
    if(!capabilities.length||capabilities.some(x=>!CAPABILITIES.has(x)))throw new Error('Capacidades invalidas');
    if(typeof spec.run!=='function')throw new TypeError('Falta controlador de proveedor');
    const license=spec.license??'unverified';
    if(!['owned','open_source','licensed_api','unverified'].includes(license))throw new TypeError('licencia invalida');
    const provider={id,capabilities,license,authorized:spec.authorized===true,
      enabled:spec.enabled===true,costMode:spec.costMode??'none',run:spec.run};
    if(!['none','billable'].includes(provider.costMode))throw new TypeError('costMode invalido');
    if(provider.authorized&&license==='unverified')throw new Error('No se permite autorizar proveedor sin licencia');
    providers.set(id,provider);audit('provider_registered',{id,enabled:provider.enabled});
    return {id,capabilities,license,authorized:provider.authorized,
      enabled:provider.enabled,costMode:provider.costMode};
  }
  async function runCapability({projectId,capability,providerId,approvedSpend=false,input={}}={}){
    const id=idText(projectId,'projectId'),project=projects.get(id);
    if(!project)throw new Error('Proyecto no encontrado');
    capability=idText(capability,'capability');
    const provider=providers.get(idText(providerId,'providerId'));
    if(!provider||!provider.enabled||!provider.authorized||provider.license==='unverified')
      throw new Error('Proveedor no autorizado o inactivo');
    if(!provider.capabilities.includes(capability))throw new Error('Capacidad no declarada por proveedor');
    if(provider.costMode==='billable'&&approvedSpend!==true)throw new Error('Gasto bloqueado: requiere aprobacion explicita');
    const plan=blueprint(id);
    if(HIGH_RISK.has(capability)&&plan.cast.some(x=>x.issues.length))
      throw new Error('Personajes sin autorizacion o sin validar: ejecucion bloqueada');
    if(input===null||typeof input!=='object'||Array.isArray(input))throw new TypeError('Input invalido');
    const job={projectId:id,capability,projectKind:project.kind,plan,input:clone(input)};
    audit('capability_started',{projectId:id,capability,providerId:provider.id});
    try{
      const result=await provider.run(clone(job));
      const output={status:'provider_completed',providerId:provider.id,capability,
        result:clone(result??null),productionReady:plan.productionReady};
      audit('capability_completed',{projectId:id,capability,providerId:provider.id});
      return output;
    }catch(error){
      audit('capability_failed',{projectId:id,capability,providerId:provider.id});
      throw error;
    }
  }
  function compileAvatarScene({projectId,sceneId,rigManifests}={}){
    const id=idText(projectId,'projectId'),project=projects.get(id);
    if(!project)throw new Error('Proyecto no encontrado');
    if(!['video','pelicula','serie','programa','copiloto'].includes(project.kind))
      throw new Error('Novela textual no requiere escena de avatares');
    const scene=project.scenes.find(x=>x.id===idText(sceneId,'sceneId'));
    if(!scene)throw new Error('Escena no encontrada');
    if(!scene.cues.length)throw new Error('Sin acciones para animar');
    if(scene.cues.some(x=>!['natalia','copiloto'].includes(x.character)))
      throw new Error('Actor futuro sin adaptador de animacion verificado');
    const issues=project.cast.flatMap(actorId=>actorIssues(actors.get(actorId)));
    if(issues.length)throw new Error('Actores no verificados: '+issues.join('; '));
    return planIntegratedScene({cues:scene.cues,manifests:rigManifests});
  }
  async function playScene({projectId,sceneId,rigManifests,stage}={}){
    if(!stage || stage.ready!==true || typeof stage.play!=="function")
      throw new Error('Etapa audiovisual real no auditada: no se reproduce');
    const plan=compileAvatarScene({projectId,sceneId,rigManifests});
    const project=projects.get(idText(projectId,'projectId'));
    const scene=project.scenes.find(x=>x.id===idText(sceneId,'sceneId'));
    audit('scene_started',{projectId:project.id,sceneId:scene.id});
    const output=await stage.play(clone(scene.cues));
    if(!output?.ok){
      audit('scene_failed',{projectId:project.id,sceneId:scene.id});
      throw new Error('Fallo al reproducir escena: '+String(output?.error??'desconocido'));
    }
    audit('scene_events_started',{projectId:project.id,sceneId:scene.id});
    return {status:'events_started',projectId:project.id,sceneId:scene.id,
      plannedEvents:plan.events.length,trace:clone(output.events??[]),
      note:'No certifica animacion visual, voz terminada ni visemas.'};
  }
  function exportCatalog(){
    return clone({schema:'arc.creative.catalog.v1',name,
      actors:[...actors.values()].map(x=>({id:x.id,name:x.name,origin:x.origin})),
      projects:[...projects.values()].map(p=>({id:p.id,kind:p.kind,title:p.title,
        synopsis:p.synopsis,cast:p.cast,scenes:p.scenes.map(s=>({
          id:s.id,description:s.description,durationMs:s.durationMs,
          cues:s.cues.map(({character,action,atMs,text,speed})=>({character,action,atMs,text,speed}))
        }))}))
    });
  }
  return Object.freeze({
    registerActor,setActorEvidence,createProject,blueprint,playScene,exportCatalog,
    registerProvider,runCapability,compileAvatarScene,
    getActor:id=>clone(actors.get(idText(id,'actor.id'))??null),
    getProject:id=>clone(projects.get(idText(id,'project.id'))??null),
    listProjects:()=>clone([...projects.values()].map(({id,title,kind,revision})=>({id,title,kind,revision}))),
    getAudit:()=>clone(events),
    getStatus:()=>({schema:ARC_CREATIVE_SCHEMA,name,projects:projects.size,
      actors:actors.size,providers:providers.size,automaticProviders:false,
      productionEnabled:false})
  });
}

/** Importing never reinstates biometric permissions, validated rigs or providers. */
export function importCreativeCatalog(data){
  if(!data||data.schema!=='arc.creative.catalog.v1'||
      !Array.isArray(data.actors)||!Array.isArray(data.projects)||
      data.actors.length>200||data.projects.length>200)
    throw new TypeError('Catalogo ARC invalido o demasiado grande');
  const universe=createCreativeUniverse({name:data.name,limit:200});
  for(const actor of data.actors){
    universe.registerActor({id:actor.id,name:actor.name,origin:actor.origin,
      rights:'pending_review',rig:'unverified',voice:'unverified',assetRef:null});
  }
  for(const project of data.projects)universe.createProject(project);
  return universe;
}