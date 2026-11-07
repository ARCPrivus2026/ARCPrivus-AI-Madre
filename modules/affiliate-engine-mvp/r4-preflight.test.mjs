import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectR4 } from './r4-preflight.mjs';

const cli = fileURLToPath(new URL('./r4-preflight.mjs', import.meta.url));

test('preflight no ejecuta scripts del proyecto, no lee secretos y no modifica el árbol', () => {
  const temp = mkdtempSync(join(tmpdir(),'arc-preflight-'));
  try {
    const pkg = { name:'arc-fake-r4', type:'module',
      scripts:{ start:'node malicious.js' },
      dependencies:{mysql2:'^3.0.0'} };
    writeFileSync(join(temp,'package.json'),JSON.stringify(pkg));
    writeFileSync(join(temp,'server.js'),'/* solo prueba */');
    writeFileSync(join(temp,'.env'),'SUPER_PRIVATE_KEY=NEVER_PRINT_THIS');
    writeFileSync(join(temp,'malicious.js'),"throw new Error('NO EXECUTION');");
    const before = readFileSync(join(temp,'package.json'),'utf8');
    const report = inspectR4(temp);
    assert.equal(report.mode,'READ_ONLY');
    assert.equal(report.integrationEnabled,false);
    assert.equal(report.productionReady,false);
    assert.equal(report.packageName,'arc-fake-r4');
    assert.deepEqual(report.databaseDrivers,['mysql2']);
    assert.deepEqual(report.scriptNames,['start']);
    assert.equal(report.files.envPresent,true);
    assert.equal(readFileSync(join(temp,'package.json'),'utf8'),before);
    const out = execFileSync(process.execPath,[cli,temp],{encoding:'utf8'});
    const parsed = JSON.parse(out);
    assert.equal(parsed.mode,'READ_ONLY');
    assert.equal(parsed.blockers.length,0);
    assert.doesNotMatch(out,/SUPER_PRIVATE_KEY|NEVER_PRINT_THIS|malicious\.js/);
  } finally {
    rmSync(temp,{recursive:true,force:true});
  }
});

test('preflight bloquea proyecto inexistente y detecta múltiples controladores',()=>{
  const noRoot=spawnSync(process.execPath,[cli,join(tmpdir(),'arc-no-such-test-folder-20261104')],{encoding:'utf8'});
  assert.notEqual(noRoot.status,0);
  const temp=mkdtempSync(join(tmpdir(),'arc-multidb-'));
  try{
    writeFileSync(join(temp,'package.json'),JSON.stringify({
      dependencies:{mysql2:'^3.0.0',sqlite3:'^5.0.0'}
    }));
    writeFileSync(join(temp,'server.js'),'');
    const result=inspectR4(temp);
    assert.ok(result.blockers.some(b=>b.includes('múltiples controladores')));
    assert.equal(result.integrationEnabled,false);
    const cliResult=spawnSync(process.execPath,[cli,temp],{encoding:'utf8'});
    assert.equal(cliResult.status,2);
  }finally{rmSync(temp,{recursive:true,force:true});}
});
