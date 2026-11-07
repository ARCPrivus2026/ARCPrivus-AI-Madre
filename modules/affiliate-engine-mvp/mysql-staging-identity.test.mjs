import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashFixturePassword,compareFixturePassword,MysqlStagingIdentity,DemoAuthenticationFailed,identityDDL
} from './mysql-staging-identity.mjs';

test('scrypt crea salt aleatoria, verificación correcta y nunca devuelve contraseña',async()=>{
  const password='ONLY-DUMMY-ci-Password-123!';
  const a=await hashFixturePassword(password),b=await hashFixturePassword(password);
  assert.equal(a.salt.length,32);
  assert.equal(a.digest.length,64);
  assert.notEqual(a.salt,b.salt);
  assert.notEqual(a.digest,b.digest);
  assert.equal(JSON.stringify(a).includes(password),false);
  assert.equal(await compareFixturePassword(password,a.salt,a.digest),true);
  assert.equal(await compareFixturePassword('incorrect-pass-123',a.salt,a.digest),false);
});

test('contraseña demasiado corta y hash malformado se rechazan',async()=>{
  await assert.rejects(()=>hashFixturePassword('short'),DemoAuthenticationFailed);
  assert.equal(await compareFixturePassword('x','invalid','invalid'),false);
});

test('sesiones solo en esquema de simulación CI y por valor almacenado como hash',()=>{
  assert.ok(identityDDL.some(sql=>sql.includes('token_hash CHAR(64) NOT NULL UNIQUE')));
  assert.ok(identityDDL.some(sql=>sql.includes('expires_at_ms')));
  const mock={getConnection(){}};
  assert.throws(()=>new MysqlStagingIdentity(mock,{readOrder(){}},{}));
});
