/**
 * Synthetic browser authenticator for CI only. Not a security component.
 * Generates WebAuthn JSON with a fresh in-memory P-256 keypair.
 */
import {createHash,generateKeyPairSync,randomBytes,sign} from 'node:crypto';
import {RP_ID,RP_ORIGIN} from './mysql-staging-webauthn-ceremony.mjs';

const sha=value=>createHash('sha256').update(value).digest();
const b64=b=>Buffer.from(b).toString('base64url');
const txt=s=>Buffer.from(s,'utf8');
const encLength=(major,n)=>{
 if(n<24)return Buffer.from([(major<<5)|n]);
 if(n<256)return Buffer.from([(major<<5)|24,n]);
 const result=Buffer.alloc(3);result[0]=(major<<5)|25;result.writeUInt16BE(n,1);return result;
};
const cborText=s=>Buffer.concat([encLength(3,Buffer.byteLength(s)),txt(s)]);
const cborBytes=b=>Buffer.concat([encLength(2,b.length),b]);
export function createSyntheticAuthenticator(){
 const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 const jwk=pair.publicKey.export({format:'jwk'});
 const x=Buffer.from(jwk.x,'base64url'),y=Buffer.from(jwk.y,'base64url');
 if(x.length!==32||y.length!==32)throw new Error('Synthetic EC key invalid');
 const cose=Buffer.concat([
   Buffer.from([0xa5,0x01,0x02,0x03,0x26,0x20,0x01,0x21,0x58,0x20]),x,
   Buffer.from([0x22,0x58,0x20]),y
 ]);
 return {privateKey:pair.privateKey,credentialId:randomBytes(32),cose};
}
function clientData(type,challenge,origin=RP_ORIGIN){
 return Buffer.from(JSON.stringify({type,challenge,origin,crossOrigin:false}),'utf8');
}
function authData({rpID=RP_ID,flags=0x05,counter=1}={}){
 const out=Buffer.alloc(37);
 sha(txt(rpID)).copy(out,0);
 out[32]=flags;
 out.writeUInt32BE(counter,33);
 return out;
}
export function syntheticRegistrationResponse(auth,options,{origin=RP_ORIGIN}={}){
 const data=authData({flags:0x45,counter:0});
 const len=Buffer.alloc(2);len.writeUInt16BE(auth.credentialId.length,0);
 const attested=Buffer.concat([data,Buffer.alloc(16),len,auth.credentialId,auth.cose]);
 const attestationObject=Buffer.concat([
   Buffer.from([0xa3]),cborText('fmt'),cborText('none'),
   cborText('attStmt'),Buffer.from([0xa0]),
   cborText('authData'),cborBytes(attested)
 ]);
 const id=b64(auth.credentialId);
 return {
   id,rawId:id,type:'public-key',
   response:{
     clientDataJSON:b64(clientData('webauthn.create',options.challenge,origin)),
     attestationObject:b64(attestationObject),
     transports:['internal']
   },
   clientExtensionResults:{},
   authenticatorAttachment:'platform'
 };
}
export function syntheticAuthenticationResponse(auth,options,{origin=RP_ORIGIN,counter=1,rpID=RP_ID}={}){
 const data=authData({rpID,counter,flags:0x05});
 const client=clientData('webauthn.get',options.challenge,origin);
 const signature=sign('sha256',Buffer.concat([data,sha(client)]),auth.privateKey);
 const id=b64(auth.credentialId);
 return {
   id,rawId:id,type:'public-key',
   response:{
     authenticatorData:b64(data),clientDataJSON:b64(client),
     signature:b64(signature),userHandle:null
   },
   clientExtensionResults:{},
   authenticatorAttachment:'platform'
 };
}
