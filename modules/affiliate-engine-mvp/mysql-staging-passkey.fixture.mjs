/**
 * Test-only synthetic WebAuthn P-256 authenticator.
 * The private key exists ONLY in memory of CI. No device/browser registration.
 * Not imported by any runtime module; never put this code in a public API.
 */
import {generateKeyPairSync,randomBytes,createHash,sign} from 'node:crypto';
import {PASSKEY_RP_ID,PASSKEY_ORIGIN} from './mysql-staging-passkey-verify.mjs';

export function fixturePasskey(){
  const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  const publicKeySpki=publicKey.export({type:'spki',format:'der'});
  const credentialId=randomBytes(32).toString('base64url');
  return {privateKey,publicKeySpki,credentialId};
}
export function fixtureAssertion(fixture,challenge,{origin=PASSKEY_ORIGIN,rpId=PASSKEY_RP_ID,
  crossOrigin=false,topOrigin=undefined,flags=0x05,counter=1,challengeOverride=null}={}){
  const raw=Buffer.alloc(37);
  createHash('sha256').update(rpId).digest().copy(raw,0);
  raw[32]=flags;
  raw.writeUInt32BE(counter,33);
  const client=JSON.stringify({
    type:'webauthn.get',challenge:challengeOverride??challenge,
    origin,crossOrigin,...(topOrigin===undefined?{}:{topOrigin})
  });
  const clientDataJSON=Buffer.from(client,'utf8');
  const signed=Buffer.concat([
    raw,createHash('sha256').update(clientDataJSON).digest()
  ]);
  return {
    credentialId:fixture.credentialId,clientDataJSON,
    authenticatorData:raw,signature:sign('sha256',signed,fixture.privateKey)
  };
}
