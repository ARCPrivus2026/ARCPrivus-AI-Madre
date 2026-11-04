import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  AdapterNotEnabledError, createStagingPool,
  getStagingPoolOptions, inspectMysqlStagingConfig
} from './mysql-staging-adapter.mjs';

const safe = () => ({
  ARC_AFF_STAGING_CONNECT: '1',
  ARC_AFF_STAGING_ONLY: '1',
  ARC_AFF_DB_HOST: '127.0.0.1',
  ARC_AFF_DB_PORT: '3306',
  ARC_AFF_DB_NAME: 'arc_affiliate_staging_test',
  ARC_AFF_DB_USER: 'arc_aff_test',
  ARC_AFF_DB_PASSWORD: 'not-a-real-password-used-for-tests',
  ARNOLRC_R4_DB_NAME: 'arnolrc_staging_20260916',
  DB_USER: 'arnolrc_main'
});

test('adaptador no conecta si no se habilita expresamente', async () => {
  let calls = 0;
  const spy = { createPool() { calls++; throw new Error('NO DEBE LLAMARSE'); } };
  assert.equal(inspectMysqlStagingConfig({}).enabled,false);
  assert.equal(inspectMysqlStagingConfig({}).connected,false);
  assert.equal(inspectMysqlStagingConfig({}).paymentProcessingEnabled,false);
  assert.throws(() => getStagingPoolOptions({}),AdapterNotEnabledError);
  await assert.rejects(() => createStagingPool({},spy),AdapterNotEnabledError);
  assert.equal(calls,0);
});

test('solo permite credenciales dedicadas y esquema aislado local', () => {
  const opt = getStagingPoolOptions(safe());
  assert.equal(opt.host,'127.0.0.1');
  assert.equal(opt.database,'arc_affiliate_staging_test');
  assert.equal(opt.user,'arc_aff_test');
  assert.equal(opt.connectionLimit,2);
  assert.equal(opt.multipleStatements,false);
  assert.equal(opt.waitForConnections,false);
});

test('rechaza host remoto, esquema R4 y usuario común', () => {
  const bad = [
    { ARC_AFF_DB_HOST: 'localhost.evil.tld' },
    { ARC_AFF_DB_NAME: 'arnolrc_staging_20260916' },
    { ARC_AFF_DB_NAME: 'arc_affiliate_staging_test', DB_NAME:'arc_affiliate_staging_test' },
    { ARC_AFF_DB_USER:'root' },
    { ARC_AFF_DB_USER:'arc_aff_test', MYSQL_USER:'arc_aff_test' },
    { ARC_AFF_DB_PASSWORD:'short' },
    { ARC_AFF_STAGING_ONLY:'0' }
  ];
  for (const invalid of bad) {
    assert.throws(() => getStagingPoolOptions({...safe(),...invalid}));
  }
});

test('rechaza activación de pagos reales aunque staging esté habilitado',()=>{
  for(const flag of ['ARC_AFFILIATE_LIVE','ARC_LIVE_PAYMENTS','ARC_ENABLE_PAYOUTS']){
    assert.throws(()=>getStagingPoolOptions({...safe(),[flag]:'1'}),/prohíbe/i);
  }
});

test('solo crea un pool inyectado con autorización explícita (sin red)',async()=>{
  let calls=0;
  const mock={createPool(options){calls++;return {kind:'MOCK_POOL',db:options.database};}};
  const pool=await createStagingPool(safe(),mock);
  assert.deepEqual(pool,{kind:'MOCK_POOL',db:'arc_affiliate_staging_test'});
  assert.equal(calls,1);
});

test('no está importado en el servidor actual ni en R4',()=>{
  const source=readFileSync(fileURLToPath(new URL('./server.mjs',import.meta.url)),'utf8');
  assert.equal(source.includes('mysql-staging-adapter'), false);
  assert.equal(source.includes('config/db.js'), false);
});
