import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreativeUniverse} from './creative-universe.mjs';
import {registerArcLocalPlanning,createLocalPlanningResult} from './local-creative-planner.mjs';

test('ARC offline: guion y storyboard editables sin renderizar y sin pago',async()=>{
  const studio=createCreativeUniverse();
  studio.createProject({id:'pelicula_piloto',kind:'pelicula',title:'Pelicula piloto',cast:['natalia'],
    scenes:[{id:'plano_1',description:'Habitacion de presentacion',cues:[
      {character:'natalia',action:'walk',atMs:0},
      {character:'natalia',action:'speak',atMs:200,text:'Hola, soy Natalia'}
    ]}]});
  const desc=registerArcLocalPlanning(studio);
  assert.equal(desc.costMode,'none');
  const script=await studio.runCapability({projectId:'pelicula_piloto',capability:'script',providerId:desc.id});
  assert.equal(script.result.output.sequences[0].lines.length,2);
  assert.equal(script.result.output.sequences[0].lines[1].content,'Hola, soy Natalia');
  const storyboard=await studio.runCapability({projectId:'pelicula_piloto',capability:'storyboard',providerId:desc.id});
  assert.equal(storyboard.result.output.frames.length,2);
  assert.ok(storyboard.result.output.frames.every(x=>x.rendered===false));
  assert.equal(storyboard.result.mediaProduced,false);
  assert.equal(storyboard.productionReady,false);
});
test('ARC offline: novela recibe esquema editorial sin fingir capitulos escritos',async()=>{
  const studio=createCreativeUniverse();
  studio.createProject({id:'novela_piloto',kind:'novela',title:'Novela',cast:[],scenes:[
    {id:'capitulo_1',description:'Comienzo de la historia'}
  ]});
  registerArcLocalPlanning(studio);
  const draft=await studio.runCapability({projectId:'novela_piloto',capability:'layout',providerId:'arc_local_planning'});
  assert.equal(draft.result.output.chapters[0].wordCountActual,0);
  assert.equal(draft.result.isGenerativeAI,false);
});
test('ARC offline: seguridad nunca libera una produccion por un test favorable',async()=>{
  const studio=createCreativeUniverse();
  studio.createProject({id:'show',kind:'programa',title:'Programa',cast:[],scenes:[{id:'escena'}]});
  registerArcLocalPlanning(studio);
  const r=await studio.runCapability({projectId:'show',capability:'safety',providerId:'arc_local_planning'});
  assert.equal(r.result.output.approvedForRelease,false);
  assert.ok(r.result.output.blockers.length>0);
});
test('ARC offline: rechaza capacidades no implementadas en lugar de inventarlas',()=>{
  assert.throws(()=>createLocalPlanningResult({capability:'render',plan:{project:{id:'a',title:'A'},shots:[],blockers:[]}}),/no implementada/);
});