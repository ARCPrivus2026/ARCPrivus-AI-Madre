import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const exe=path.join(path.dirname(fileURLToPath(import.meta.url)),'auditor.mjs');
function run(...args) {
  return spawnSync(process.execPath,[exe,...args],{encoding:'utf8',timeout:10000});
}
test('status local explicita que no esta conectado a Copilot',()=>{
  const result=run('status');
  assert.equal(result.status,0);
  const output=JSON.parse(result.stdout);
  assert.equal(output.copilot_connected,false);
  assert.equal(output.panel_connected,false);
});
test('personaje externo no autorizado',()=>{
  const result=run('register','otro','/tmp/nada.blend');
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/Personaje no autorizado/);
});
test('accion desconocida rechazada',()=>{
  const result=run('modificar-originales');
  assert.notEqual(result.status,0);
});
