import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {
  verifyFixtureWebAuthnAssertion,DemoPasskeyRejected,PASSKEY_RP_ID,PASSKEY_ORIGIN
} from './mysql-staging-passkey-verify.mjs';
import {fixturePasskey,fixtureAssertion} from './mysql-staging-passkey.fixture.mjs';

function setup(options={},previousCounter=0){
  const fixture=fixturePasskey();
  const challenge=randomBytes(32).toString('base64url');
  const assertion=fixtureAssertion(fixture,challenge,options);
  return {fixture,challenge,assertion,previousCounter};
}
function validate(s,overrides={}){
  return verifyFixtureWebAuthnAssertion({
    ...s.assertion,challenge:s.challenge,
    expectedCredentialId:s.fixture.credentialId,
    publicKeySpki:s.fixture.publicKeySpki,
    previousCounter:s.previousCounter,
    ...overrides
  });
}
test('aserción ES256 de prueba verifica origen exacto, RP ID y presencia+verificación',()=>{
 const s=setup();
 const result=validate(s);
 assert.equal(result.counter,1);
 assert.equal(result.uv,true);
 assert.equal(result.originVerified,true);
 assert.equal(PASSKEY_ORIGIN,'https://affiliate.example.test');
 assert.equal(PASSKEY_RP_ID,'affiliate.example.test');
});
test('rechaza aserciones válidamente firmadas desde un origen distinto',()=>{
 const s=setup({origin:'https://lookalike.example.test'});
 assert.throws(()=>validate(s),DemoPasskeyRejected);
});
test('rechaza RP hash distinto, contexto crossOrigin y topOrigin inesperado',()=>{
 for(const options of [
  {rpId:'lookalike.example.test'},
  {crossOrigin:true},
  {topOrigin:'https://another.example.test'},
  {flags:0x01},
  {flags:0x04},
  {flags:0x0d}
 ])assert.throws(()=>validate(setup(options)),DemoPasskeyRejected);
});
test('rechaza desafío distinto, credencial ajena y firma adulterada',()=>{
 const s=setup();
 const wrong=randomBytes(32).toString('base64url');
 assert.throws(()=>validate(s,{challenge:wrong}),DemoPasskeyRejected);
 assert.throws(()=>validate(s,{expectedCredentialId:wrong}),DemoPasskeyRejected);
 const bad=Buffer.from(s.assertion.signature);bad[3]^=0xff;
 assert.throws(()=>validate(s,{signature:bad}),DemoPasskeyRejected);
 assert.throws(()=>validate(s,{clientDataJSON:Buffer.from('{}')}),DemoPasskeyRejected);
});
test('exige contador positivo estrictamente creciente',()=>{
 const s=setup({counter:5},5);
 assert.throws(()=>validate(s),DemoPasskeyRejected);
 assert.equal(validate({...s,previousCounter:4}).counter,5);
 assert.throws(()=>validate(setup({counter:0})),DemoPasskeyRejected);
});
