import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const exe=path.join(HERE,'mission_runner.mjs');

function localRun(root,action){
 return spawnSync(process.execPath,[exe,action],{
   env:{...process.env,ARC_AUDITOR3D_ROOT:root},
   encoding:'utf8',timeout:12000
 });
}

test('mision total bloquea publicacion y no presume Copilot conectado',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'arc-mission-'));
 try{
  const r=localRun(root,'status');
  assert.equal(r.status,0,r.stderr);
  const state=JSON.parse(r.stdout);
  assert.deepEqual(state.characters.map(x=>x.id),['natalia','arnold']);
  assert.equal(state.publication_allowed,false);
  assert.equal(state.copilot_connected,false);
  assert.equal(state.production_changes_allowed,false);
  assert.equal(state.characters[0].tasks[0].state,'BLOQUEADO_FALTA_FUENTE');
 } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test('sin fuentes registradas bloquea ambos modelos y registra informe',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'arc-mission-'));
 try{
  const r=localRun(root,'run');
  assert.equal(r.status,0,r.stderr);
  const outcome=JSON.parse(r.stdout);
  assert.equal(outcome.publication_allowed,false);
  for(const c of ['natalia','arnold'])
   assert.equal(outcome.characters[c].status,'BLOQUEADO_FALTA_FUENTE_AUTORIZADA');
  const report=JSON.parse(fs.readFileSync(outcome.report,'utf8'));
  assert.equal(report.production_changes,false);
  assert.equal(report.publication_allowed,false);
 } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test('rechaza acciones fuera del registro',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'arc-mission-'));
 try{
  const r=localRun(root,'publicar');
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/Accion no autorizada/);
 } finally {fs.rmSync(root,{recursive:true,force:true});}
});
