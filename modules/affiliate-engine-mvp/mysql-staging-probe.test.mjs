import test from 'node:test';
import assert from 'node:assert/strict';
import { probeIsolatedMysql } from './mysql-staging-probe.mjs';
import { AdapterNotEnabledError } from './mysql-staging-adapter.mjs';

const testEnv = {
  ARC_AFF_STAGING_CONNECT: '1',
  ARC_AFF_STAGING_ONLY: '1',
  ARC_AFF_DB_HOST: '127.0.0.1',
  ARC_AFF_DB_PORT: '3306',
  ARC_AFF_DB_NAME: 'arc_affiliate_staging_probe',
  ARC_AFF_DB_USER: 'arc_aff_probe',
  ARC_AFF_DB_PASSWORD: 'mock-password-for-test-only'
};

test('apagado: no crea pool ni hace consulta', async () => {
  let called = false;
  const mock = {createPool(){called=true;throw new Error('No permitido');}};
  await assert.rejects(() => probeIsolatedMysql({},mock),AdapterNotEnabledError);
  assert.equal(called,false);
});

test('simulación correcta: consulta solo lectura y cierra conexión y pool',async()=>{
  const events=[];
  const mock = {createPool(){
    events.push('pool');
    return {getConnection:async()=>{
      events.push('connect');
      return {
        query:async(sql)=>{
          assert.equal(sql,'SELECT DATABASE() AS active_schema, CURRENT_USER() AS authenticated_user, 1 AS probe_ok');
          events.push('select');
          return [[{
            active_schema: 'arc_affiliate_staging_probe',
            authenticated_user:'arc_aff_probe@%',
            probe_ok: 1
          }]];
        },
        release(){events.push('release');}
      };
    },
    end:async()=>{events.push('close');}
    };
  }};
  const report=await probeIsolatedMysql(testEnv,mock);
  assert.equal(report.status,'PASSED');
  assert.equal(report.writesPerformed,false);
  assert.equal(report.productionReady,false);
  assert.deepEqual(events,['pool','connect','select','release','close']);
  assert.equal(Object.hasOwn(report,'password'),false);
});

test('falla validación del esquema: libera conexión y pool',async()=>{
  const events=[];
  const mock={createPool(){return {
    getConnection:async()=>({query:async()=>[[{
      active_schema:'r4_main',
      authenticated_user:'arc_aff_probe@%',
      probe_ok:1
    }]],release(){events.push('release');}}),
    end:async()=>{events.push('close');}
  };}};
  await assert.rejects(()=>probeIsolatedMysql(testEnv,mock),/no confirmó/);
  assert.deepEqual(events,['release','close']);
});

test('falla al conectarse: cierra pool sin fuga',async()=>{
  const events=[];
  const mock={createPool(){return {
    getConnection:async()=>{throw new Error('simulated transport failure');},
    end:async()=>{events.push('close');}
  };}};
  await assert.rejects(()=>probeIsolatedMysql(testEnv,mock),/simulated transport failure/);
  assert.deepEqual(events,['close']);
});

test('si falla release, aun así cierra el pool',async()=>{
  const events=[];
  const mock={createPool(){return {
    getConnection:async()=>({
      query:async()=>[[{active_schema:'arc_affiliate_staging_probe',authenticated_user:'arc_aff_probe@%',probe_ok:1}]],
      release(){events.push('release');throw new Error('release failure');}
    }),
    end:async()=>{events.push('close');}
  };}};
  await assert.rejects(()=>probeIsolatedMysql(testEnv,mock),/release failure/);
  assert.deepEqual(events,['release','close']);
});
