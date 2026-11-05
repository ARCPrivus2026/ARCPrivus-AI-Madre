/**
 * ARC Affiliate 1.0: isolated RFC 6238-style 6-digit TOTP for FAKE CI accounts.
 * Never use this as a standalone production MFA service. Never print or store a
 * plaintext seed in a repository, CLI output, HTTP response or server log.
 */
import {createHmac,randomBytes,createCipheriv,createDecipheriv,timingSafeEqual} from 'node:crypto';

const STEP_MS=30000;
const KEY_LENGTH=32;
const IV_LENGTH=12;
const SECRET_LENGTH=20;
const CODE_PATTERN=/^[0-9]{6}$/;

function validSeed(seed){
  if(!Buffer.isBuffer(seed)||seed.length!==SECRET_LENGTH)throw new Error('MFA seed inválida');
  return seed;
}
function validKey(key){
  if(!Buffer.isBuffer(key)||key.length!==KEY_LENGTH)throw new Error('MFA key CI inválida');
  return key;
}
export function createFixtureMfaSecret(){
  return randomBytes(SECRET_LENGTH);
}
export function totpAt(seed,epochMs){
  validSeed(seed);
  if(!Number.isSafeInteger(epochMs)||epochMs<0)throw new Error('Tiempo MFA inválido');
  const step=Math.floor(epochMs/STEP_MS);
  const counter=Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest=createHmac('sha1',seed).update(counter).digest();
  const offset=digest[digest.length-1]&15;
  const n=(digest.readUInt32BE(offset)&0x7fffffff)%1000000;
  return Object.freeze({step,code:String(n).padStart(6,'0')});
}
export function validateTotpOnce(seed,code,epochMs,lastStep=-1){
  if(typeof code!=='string'||!CODE_PATTERN.test(code))return {ok:false,step:-1};
  if(!Number.isSafeInteger(lastStep)||lastStep< -1)return {ok:false,step:-1};
  const expected=totpAt(seed,epochMs);
  const ok=expected.step>lastStep&&timingSafeEqual(Buffer.from(code),Buffer.from(expected.code));
  return {ok,step:ok?expected.step:-1};
}
export function encryptFixtureMfa(seed,key){
  validSeed(seed);validKey(key);
  const iv=randomBytes(IV_LENGTH);
  const cipher=createCipheriv('aes-256-gcm',key,iv);
  const encrypted=Buffer.concat([cipher.update(seed),cipher.final()]);
  return Object.freeze({
    ciphertext:encrypted.toString('hex'),
    iv:iv.toString('hex'),
    tag:cipher.getAuthTag().toString('hex')
  });
}
export function decryptFixtureMfa(payload,key){
  validKey(key);
  if(!payload||typeof payload!=='object'||
     !/^[a-f0-9]{40}$/.test(payload.ciphertext||'')||
     !/^[a-f0-9]{24}$/.test(payload.iv||'')||
     !/^[a-f0-9]{32}$/.test(payload.tag||'')){
    throw new Error('MFA ciphertext CI inválida');
  }
  const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(payload.iv,'hex'));
  decipher.setAuthTag(Buffer.from(payload.tag,'hex'));
  return validSeed(Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext,'hex')),decipher.final()
  ]));
}
