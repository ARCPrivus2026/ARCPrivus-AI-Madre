import test from 'node:test';
import assert from 'node:assert/strict';
import {createArcCreativePreset} from './creative-arc-preset.mjs';

test('ARC: preset integral incluye dos personajes y una sola secuencia completa',()=>{
  const studio=createArcCreativePreset();
  const plan=studio.blueprint('arc_piloto_integral');
  assert.deepEqual(plan.cast.map(x=>x.id),['natalia','copiloto']);
  assert.equal(plan.shots.length,1);
  assert.equal(plan.shots[0].cues.length,13);
  for(const action of ['walk','run','sit','stand','speak','blink','look']){
    assert.ok(plan.shots[0].cues.some(c=>c.action===action),action);
  }
  assert.equal(plan.productionReady,false);
  assert.ok(plan.blockers.some(x=>x.includes('consentimiento')));
  assert.ok(plan.blockers.some(x=>x.includes('modelo')));
  assert.ok(!JSON.stringify(studio.exportCatalog()).includes('.glb'));
});
test('ARC: no permite reproducir un preset sobre personajes no validados',()=>{
  const studio=createArcCreativePreset();
  assert.throws(()=>studio.compileAvatarScene({
    projectId:'arc_piloto_integral',sceneId:'presentacion',
    rigManifests:{natalia:{},copiloto:{}}
  }),/Actores no verificados/);
});
