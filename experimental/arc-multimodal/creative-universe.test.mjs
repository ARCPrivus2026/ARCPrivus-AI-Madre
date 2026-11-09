import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreativeUniverse,importCreativeCatalog,CREATIVE_KINDS} from './creative-universe.mjs';
import {attachCreativeToConsciousness} from './consciousness-creative-bridge.mjs';

const rig={bones:['LeftHand','RightHand','LeftFoot','RightFoot','Head','LeftEye','RightEye'],
  morphs:['jawOpen','eyeBlink'],clips:['Idle','Walk','Run','Sit','Stand'],
  clipMap:{idle:'Idle',walk:'Walk',run:'Run',sit:'Sit',stand:'Stand'},voiceEnabled:true};
function universe(){
  const s=createCreativeUniverse();
  s.registerActor({id:'natalia',name:'Natalia',origin:'ARC',assetRef:'assets/natalia.glb',
    rights:'approved',rig:'validated',voice:'validated'});
  s.registerActor({id:'copiloto',name:'Arnold RC',origin:'ARC',assetRef:'assets/arnold.glb',
    rights:'approved',rig:'validated',voice:'validated'});
  return s;
}
function project(s,kind='video'){
  return s.createProject({id:'obra_'+kind,kind,title:'Escena de demostracion',cast:['natalia','copiloto'],
    scenes:[{id:'inicio',description:'Natalia presenta y Arnold corre',durationMs:2000,cues:[
      {character:'natalia',action:'walk',atMs:0},
      {character:'copiloto',action:'run',atMs:0},
      {character:'natalia',action:'speak',atMs:100,text:'Bienvenido al universo ARC'},
      {character:'copiloto',action:'blink',atMs:200}
    ]}]});
}
test('Tipos de proyectos: video, pelicula, serie, novela, programa y copiloto',()=>{
  assert.deepEqual(CREATIVE_KINDS,['video','pelicula','serie','novela','programa','copiloto']);
  const s=createCreativeUniverse();
  for(const kind of CREATIVE_KINDS){
    s.createProject({id:'obra_'+kind,title:kind,kind,cast:[],scenes:[{id:'intro'}]});
  }
  assert.equal(s.listProjects().length,6);
  assert.equal(s.getStatus().productionEnabled,false);
});
test('Blueprint integral para ambos actores sin prometer multimedia ya producida',()=>{
  const s=universe();project(s);
  const bp=s.blueprint('obra_video');
  assert.equal(bp.shots.length,1);
  assert.equal(bp.shots[0].cues.length,4);
  assert.equal(bp.cast.length,2);
  assert.ok(bp.blockers.some(x=>x.includes('Sin proveedor activo: render')));
  assert.equal(bp.productionReady,false);
});
test('Adaptador real de escena solo compila para rigs ya validados',()=>{
  const s=universe();project(s);
  const plan=s.compileAvatarScene({projectId:'obra_video',sceneId:'inicio',
    rigManifests:{natalia:rig,copiloto:rig}});
  assert.equal(plan.events.length,4);
  assert.deepEqual(plan.characters,['copiloto','natalia']);
});
test('Bloqueo seguro para actores futuros sin adaptador audiovisual real',()=>{
  const s=createCreativeUniverse();
  s.registerActor({id:'actor_nuevo',name:'Nuevo personaje',rights:'approved',
    assetRef:'assets/nuevo.glb',rig:'validated',voice:'validated'});
  s.createProject({id:'film',title:'Película nueva',kind:'pelicula',cast:['actor_nuevo'],
    scenes:[{id:'escena',cues:[{character:'actor_nuevo',action:'walk',atMs:0}]}]});
  assert.throws(()=>s.compileAvatarScene({projectId:'film',sceneId:'escena',rigManifests:{}}),
    /Actor futuro/);
});
test('Gastos bloqueados hasta aprobación explícita por solicitud',async()=>{
  const s=universe();project(s);
  let calls=0;
  s.registerProvider({id:'modelo_api',capabilities:['script'],authorized:true,
    enabled:true,license:'licensed_api',costMode:'billable',run:async()=>{calls++;return 'ok';}});
  await assert.rejects(s.runCapability({projectId:'obra_video',capability:'script',
    providerId:'modelo_api'}),/Gasto bloqueado/);
  assert.equal(calls,0);
  const result=await s.runCapability({projectId:'obra_video',capability:'script',
    providerId:'modelo_api',approvedSpend:true});
  assert.equal(result.status,'provider_completed');
  assert.equal(calls,1);
});
test('No ejecuta proveedor inactivo, sin derechos o sin licencias',async()=>{
  const s=createCreativeUniverse();
  s.registerActor({id:'natalia',name:'Natalia sin autorizacion'});
  s.createProject({id:'film',title:'Film',kind:'video',cast:['natalia'],
    scenes:[{id:'s1',cues:[{character:'natalia',action:'speak',atMs:0,text:'Hola'}]}]});
  assert.throws(()=>s.registerProvider({id:'ilegal',capabilities:['voice'],enabled:true,
    authorized:true,run:async()=>null}),/licencia/);
  s.registerProvider({id:'voz_local',capabilities:['voice'],license:'owned',
    authorized:true,enabled:true,run:async()=>null});
  await assert.rejects(s.runCapability({projectId:'film',capability:'voice',
    providerId:'voz_local'}),/Personajes sin autorizacion/);
});
test('Rechaza dos acciones incompatibles en el mismo canal e instante',()=>{
  const s=createCreativeUniverse();
  assert.throws(()=>s.createProject({id:'conflicto',kind:'video',title:'Conflicto',cast:['natalia'],
    scenes:[{id:'escena',cues:[
      {character:'natalia',action:'walk',atMs:10},
      {character:'natalia',action:'run',atMs:10}
    ]}]}),/Canal duplicado/);
});
test('Exportar/importar universo no exporta voces, permisos, rutas ni adaptadores',()=>{
  const s=universe();project(s);
  s.registerProvider({id:'guionista',capabilities:['script'],authorized:true,
    enabled:true,license:'owned',run:async()=>null});
  const catalog=s.exportCatalog();
  assert.equal(catalog.schema,'arc.creative.catalog.v1');
  assert.equal(catalog.actors[0].assetRef,undefined);
  assert.equal(catalog.actors[0].rights,undefined);
  assert.ok(!JSON.stringify(catalog).includes('assets/natalia.glb'));
  const imported=importCreativeCatalog(catalog);
  assert.equal(imported.getActor('natalia').rights,'pending_review');
  assert.equal(imported.getActor('natalia').rig,'unverified');
  assert.equal(imported.getStatus().providers,0);
  assert.equal(imported.getProject('obra_video').scenes[0].cues.length,4);
});
test('No reproduce una escena sin stage real auditado',async()=>{
  const s=universe();project(s);
  await assert.rejects(s.playScene({projectId:'obra_video',sceneId:'inicio',
    rigManifests:{natalia:rig,copiloto:rig},stage:{ready:false}}),/no auditada/);
});
test('PlayScene delegado solo cuando ambos rigs y stage declaran listo',async()=>{
  const s=universe();project(s);
  let plays=0;
  const r=await s.playScene({projectId:'obra_video',sceneId:'inicio',
    rigManifests:{natalia:rig,copiloto:rig},
    stage:{ready:true,async play(cues){plays++;return {ok:true,
      events:cues.map(c=>({character:c.character,action:c.action,ok:true}))};}}});
  assert.equal(r.status,'events_started');
  assert.equal(r.plannedEvents,4);
  assert.equal(plays,1);
});
function mockEngine(){
  const handlers=new Map(),integrations=new Map(),queue=new Map();let counter=0;
  return {
    handlers,integrations,
    registerCognitiveHandler(k,h){handlers.set(k,h);},
    unregisterCognitiveHandler(k){return handlers.delete(k);},
    registerIntegration(k,h){integrations.set(k,h);},
    unregisterIntegration(k){return integrations.delete(k);},
    enqueueCognitiveProcess(type,payload){const id='q'+(++counter);
      const item={id,type,payload,status:'pending'};queue.set(id,item);return {...item};},
    async processCognitiveItem(id){const item=queue.get(id);if(!item)return null;
      try{item.result=await handlers.get(item.type)(item.payload);item.status='completed';}
      catch(e){item.status='failed';item.error=e.message;}return {...item};}
  };
}
test('Puente opcional de Consciousness V4 usa cola y puede desconectarse',async()=>{
  const s=universe();project(s);
  const engine=mockEngine();
  const bridge=attachCreativeToConsciousness({engine,studio:s});
  assert.equal(engine.integrations.size,1);
  const queued=bridge.enqueuePlan('obra_video');
  const processed=await bridge.process(queued.id);
  assert.equal(processed.status,'completed');
  assert.equal(processed.result.project.id,'obra_video');
  assert.equal(bridge.dispose(),true);
  assert.equal(engine.integrations.size,0);
  assert.equal(engine.handlers.size,0);
  assert.throws(()=>bridge.enqueuePlan('obra_video'),/Puente cerrado/);
});
test('La cola de ARC no evade las restricciones económicas del Studio',async()=>{
  const s=universe();project(s);let calls=0;
  s.registerProvider({id:'proveedor',capabilities:['render'],authorized:true,
    enabled:true,license:'licensed_api',costMode:'billable',run:async()=>{calls++;return 'VIDEO';}});
  const bridge=attachCreativeToConsciousness({engine:mockEngine(),studio:s});
  const q=bridge.enqueueCapability({projectId:'obra_video',capability:'render',providerId:'proveedor'});
  const result=await bridge.process(q.id);
  assert.equal(result.status,'failed');
  assert.match(result.error,/Gasto bloqueado/);
  assert.equal(calls,0);
  bridge.dispose();
});