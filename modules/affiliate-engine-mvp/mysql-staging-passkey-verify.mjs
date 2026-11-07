/**
 * WebAuthn assertion subset, CI-ONLY. No actual browser/registration support.
 * Intended for ephemeral P-256 fixtures only, NOT production authentication.
 * Verifies a simplified ES256 assertion bound to a test RP origin and challenge.
 */
import {createHash,createPublicKey,verify,timingSafeEqual} from 'node:crypto';

export const PASSKEY_RP_ID='affiliate.example.test';
export const PASSKEY_ORIGIN='https://affiliate.example.test';
const SHA256=(bytes)=>createHash('sha256').update(bytes).digest();
const B64URL_32=/^[A-Za-z0-9_-]{43}$/;
const CRED_ID_RE=/^[A-Za-z0-9_-]{43}$/;

export class DemoPasskeyRejected extends Error {
  constructor(){super('Verificación de clave pública de prueba rechazada');this.name='DemoPasskeyRejected';}
}
export function verifyFixtureWebAuthnAssertion(input){
  try{
    const {challenge,credentialId,expectedCredentialId,clientDataJSON,
      authenticatorData,signature,publicKeySpki,previousCounter}=input??{};
    if(typeof challenge!=='string'||!B64URL_32.test(challenge)||
       typeof credentialId!=='string'||!CRED_ID_RE.test(credentialId)||
       credentialId!==expectedCredentialId)throw new Error('challenge/credential mismatch');
    if(!Buffer.isBuffer(clientDataJSON)||clientDataJSON.length<10||clientDataJSON.length>4096||
       !Buffer.isBuffer(authenticatorData)||authenticatorData.length!==37||
       !Buffer.isBuffer(signature)||signature.length<64||signature.length>128||
       !Buffer.isBuffer(publicKeySpki)||publicKeySpki.length>160||publicKeySpki.length<70||
       !Number.isSafeInteger(previousCounter)||previousCounter<0)throw new Error('Malformed assertion');
    const collected=JSON.parse(clientDataJSON.toString('utf8'));
    if(!collected||collected.type!=='webauthn.get'||collected.challenge!==challenge||
       collected.origin!==PASSKEY_ORIGIN||collected.crossOrigin!==false||
       collected.topOrigin!==undefined)throw new Error('Client origin or challenge mismatch');
    const rpHash=SHA256(Buffer.from(PASSKEY_RP_ID,'utf8'));
    if(!timingSafeEqual(authenticatorData.subarray(0,32),rpHash))throw new Error('RP mismatch');
    const flags=authenticatorData[32];
    if((flags&0x05)!==0x05||(flags&~0x05)!==0)
      throw new Error('User presence or verification missing, or unsupported flags');
    const counter=authenticatorData.readUInt32BE(33);
    // Simplified CI fixtures ALWAYS use a nonzero monotonic counter.
    // Real authenticators may legitimately use zero counters; never claim broad support.
    if(counter===0||counter<=previousCounter)throw new Error('Counter replay');
    const key=createPublicKey({key:publicKeySpki,format:'der',type:'spki'});
    if(key.asymmetricKeyType!=='ec'||key.asymmetricKeyDetails?.namedCurve!=='prime256v1')
      throw new Error('Wrong public-key curve');
    const signed=Buffer.concat([authenticatorData,SHA256(clientDataJSON)]);
    if(!verify('sha256',signed,key,signature))throw new Error('Signature mismatch');
    return Object.freeze({counter,uv:true,originVerified:true,rpIdVerified:true});
  }catch{
    throw new DemoPasskeyRejected();
  }
}
