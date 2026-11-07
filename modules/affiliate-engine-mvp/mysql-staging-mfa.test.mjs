import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {
  createFixtureMfaSecret,totpAt,validateTotpOnce,
  encryptFixtureMfa,decryptFixtureMfa
} from './mysql-staging-mfa.mjs';

test('TOTP cumple vector RFC 6238 SHA1 en paso de 59 segundos, 6 cifras',()=>{
  const seed=Buffer.from('12345678901234567890');
  assert.deepEqual(totpAt(seed,59000),{step:1,code:'287082'});
  assert.equal(totpAt(seed,59000).code.length,6);
});
test('un código de segundo factor solo se permite una vez por ventana',()=>{
  const seed=createFixtureMfaSecret();
  const first=totpAt(seed,90000);
  assert.deepEqual(validateTotpOnce(seed,first.code,90000,-1),{ok:true,step:3});
  assert.equal(validateTotpOnce(seed,first.code,90000,3).ok,false);
  assert.equal(validateTotpOnce(seed,first.code,120000,3).ok,false);
  assert.equal(validateTotpOnce(seed,'12x456',90000,-1).ok,false);
  assert.equal(validateTotpOnce(seed,'12345',90000,-1).ok,false);
  assert.equal(validateTotpOnce(seed,'',90000,-1).ok,false);
  const next=totpAt(seed,120000);
  assert.equal(validateTotpOnce(seed,next.code,120000,3).ok,true);
});
test('la semilla CI se cifra con AES-256-GCM, IV aleatorio y tag autenticado',()=>{
  const seed=createFixtureMfaSecret(),key=randomBytes(32);
  const x=encryptFixtureMfa(seed,key),y=encryptFixtureMfa(seed,key);
  assert.notEqual(x.ciphertext,y.ciphertext);
  assert.notEqual(x.iv,y.iv);
  assert.equal(x.ciphertext.includes(seed.toString('hex')),false);
  assert.deepEqual(decryptFixtureMfa(x,key),seed);
  assert.throws(()=>decryptFixtureMfa(x,randomBytes(32)));
  const modified={...x,ciphertext: '00'+x.ciphertext.slice(2)};
  assert.throws(()=>decryptFixtureMfa(modified,key));
});
test('TOTP falla con semilla o tiempo inválido, sin secretos en salidas',()=>{
  assert.throws(()=>totpAt(Buffer.alloc(4),30000));
  assert.throws(()=>totpAt(createFixtureMfaSecret(),-1));
  assert.throws(()=>encryptFixtureMfa(createFixtureMfaSecret(),Buffer.alloc(8)));
});
