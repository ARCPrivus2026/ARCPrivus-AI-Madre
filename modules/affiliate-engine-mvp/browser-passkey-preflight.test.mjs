import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inspectLocalPasskeyBrowser,browserReadinessFromGlobals,LAB_PASSKEY_ORIGIN
} from './browser-passkey-preflight.mjs';

const valid=()=>({
  origin:LAB_PASSKEY_ORIGIN,
  isSecureContext:true,
  credentials:{create(){},get(){}},
  publicKeyCredentialAvailable:true
});

test('preflight local: declara capacidades pero nunca afirma autenticador probado',()=>{
 const result=inspectLocalPasskeyBrowser(valid());
 assert.equal(result.ready,true);
 assert.equal(result.deviceTested,false);
 assert.equal(Object.isFrozen(result),true);
 assert.match(result.notice,/No se realizó/);
});
test('preflight local: deniega orígenes distintos y contexto inseguro',()=>{
 for(const origin of [
  'https://arcprivus.com','http://localhost:3100',
  'http://127.0.0.1:3198','http://attacker.localhost:3198'
 ]){
  assert.equal(inspectLocalPasskeyBrowser({...valid(),origin}).reason,'WRONG_ORIGIN');
 }
 assert.equal(inspectLocalPasskeyBrowser({...valid(),isSecureContext:false}).reason,'NOT_SECURE_CONTEXT');
});
test('preflight local: APIs ausentes no producen un falso positivo',()=>{
 assert.equal(inspectLocalPasskeyBrowser({...valid(),credentials:{get(){}}}).ready,false);
 assert.equal(inspectLocalPasskeyBrowser({...valid(),publicKeyCredentialAvailable:false}).ready,false);
 assert.equal(browserReadinessFromGlobals(null).ready,false);
 assert.equal(browserReadinessFromGlobals({
  location:{origin:LAB_PASSKEY_ORIGIN},isSecureContext:true,
  navigator:{credentials:{create(){},get(){}}},
  PublicKeyCredential:function FakePublicKeyCredential(){}
 }).deviceTested,false);
});
