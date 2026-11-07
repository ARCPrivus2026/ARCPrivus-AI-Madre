/**
 * ARC Affiliate 1.4 — opt-in, loopback-only browser laboratory.
 *
 * IMPORTANT:
 * - No R4 imports, no MySQL connections, no checkout, no payment or payouts.
 * - Nothing starts on import. Data and credentials are fictional and in memory.
 * - Real local passkey enrollment is an explicit user action; browser/device
 *   compatibility has NOT been verified merely by shipping this code.
 * - Not a production login mechanism: an ephemeral lab URL is a bearer key.
 */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';

const HERE=dirname(fileURLToPath(import.meta.url));
const SAFE_PORT=3198;
const TTL_MS=120000;
const GRANT_MS=60000;
const MAX_BODY=128*1024;
const RP_ID='localhost';
const LAB_HOST='127.0.0.1';
const TITLE='Curso digital de prueba — NO ES UNA COMPRA';
const ID='00000000-0000-4000-8000-000000000114';
const original=Object.freeze({
  id:ID,title:TITLE,priceCop:100000,merchantCop:70000,
  affiliateCop:27000,arcCop:3000,currency:'COP',status:'SIM_CONFIRMED'
});

export class LocalLabBlocked extends Error {
  constructor(message='Laboratorio local no autorizado'){super(message);this.name='LocalLabBlocked';}
}
function safeEqual(a,b){
  if(typeof a!=='string'||typeof b!=='string')return false;
  const x=Buffer.from(a),y=Buffer.from(b);
  return x.length===y.length&&timingSafeEqual(x,y);
}
function snapshot(order){
  return Object.freeze({...order});
}
function orderDigest(order){
  return createHash('sha256').update(JSON.stringify([
    order.id,order.title,order.priceCop,order.merchantCop,
    order.affiliateCop,order.arcCop,order.status
  ])).digest('hex');
}
function deny(code){
  const e=new LocalLabBlocked('La operación simulada fue rechazada');
  e.code=code;
  return e;
}
async function readJSON(req){
  let bytes=0,buffers=[];
  for await(const part of req){
    bytes+=part.length;
    if(bytes>MAX_BODY)throw deny('PAYLOAD_TOO_LARGE');
    buffers.push(part);
  }
  try{
    const value=JSON.parse(Buffer.concat(buffers).toString('utf8'));
    if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Bad body');
    return value;
  }catch{throw deny('INVALID_JSON');}
}
function send(res,status,body,headers={}){
  const data=Buffer.isBuffer(body)?body:
    (typeof body==='string'?body:JSON.stringify(body));
  res.writeHead(status,{
    'Cache-Control':'no-store',
    'Referrer-Policy':'no-referrer',
    'X-Content-Type-Options':'nosniff',
    'X-Frame-Options':'DENY',
    'Cross-Origin-Resource-Policy':'same-origin',
    'Cross-Origin-Opener-Policy':'same-origin',
    'Permissions-Policy':'payment=(),camera=(),microphone=(),geolocation=()',
    'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; "+
      "connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; "+
      "object-src 'none'; frame-ancestors 'none'",
    'Content-Type':typeof body==='string'?'text/plain; charset=utf-8':'application/json; charset=utf-8',
    ...headers
  });
  res.end(data);
}
function isLoopback(address){
  return address==='127.0.0.1'||address==='::1'||address==='::ffff:127.0.0.1';
}
function isValidResponse(value){
  return value&&typeof value==='object'&&!Array.isArray(value)&&
    typeof value.id==='string'&&value.id.length>0&&value.id.length<512;
}
export async function createAffiliateBrowserLab({
  env=process.env,port=SAFE_PORT,lib=null,clock=()=>Date.now(),testMode=false
}={}){
  if(env.ARC_AFF_BROWSER_LAB!=='1'||env.ARC_AFF_BROWSER_LAB_ACK!=='SIMULATION_ONLY'){
    throw new LocalLabBlocked('Se requieren dos confirmaciones explícitas de laboratorio');
  }
  if(!Number.isSafeInteger(port)||port<0||port>65535||
      (!testMode&&port!==SAFE_PORT)||
      (testMode&&env.ARC_AFF_MYSQL_CI_TEST!=='1')){
    throw new LocalLabBlocked('Puerto o modo de prueba prohibido');
  }
  if(typeof clock!=='function')throw new LocalLabBlocked();
  const webauthn=lib||await import('@simplewebauthn/server');
  for(const method of ['generateRegistrationOptions','verifyRegistrationResponse',
    'generateAuthenticationOptions','verifyAuthenticationResponse']){
    if(typeof webauthn?.[method]!=='function')throw new LocalLabBlocked('Falta biblioteca WebAuthn');
  }

  const access=randomBytes(32).toString('base64url');
  const state={
    order:{...original},credential:null,registration:null,authentication:null,
    grant:null,receipt:null
  };
  let actualPort=port,server=null;
  const origin=()=> 'http://localhost:'+actualPort;
  const authorization=(req)=>safeEqual(req.headers['x-lab-token'],access)&&
    req.headers['x-lab-csrf']==='lab-user-action' &&
    (req.method==='GET'||req.headers.origin===origin());
  const staticFile=async(path,type,res)=>{
    const bytes=await readFile(join(HERE,path));
    send(res,200,bytes,{
      'Content-Type':type,'Content-Length':bytes.length
    });
  };
  const handler=async(req,res)=>{
    try{
      const host=req.headers.host;
      if(!isLoopback(req.socket.remoteAddress)||
          host!=='localhost:'+actualPort){
        send(res,403,{error:'LOOPBACK_ONLY'});return;
      }
      const url=new URL(req.url,origin());
      const pathname=url.pathname;
      if(req.method==='GET'&&pathname==='/'){
        if(!safeEqual(url.searchParams.get('lab'),access)){
          send(res,403,{error:'ACCESS_KEY_REQUIRED'});return;
        }
        await staticFile('browser-lab/index.html','text/html; charset=utf-8',res);return;
      }
      if(req.method==='GET'&&pathname==='/lab/app.js'){
        await staticFile('browser-lab/app.js','text/javascript; charset=utf-8',res);return;
      }
      if(req.method==='GET'&&pathname==='/lab/styles.css'){
        await staticFile('browser-lab/styles.css','text/css; charset=utf-8',res);return;
      }
      if(req.method==='GET'&&pathname==='/vendor/webauthn.js'){
        await staticFile('node_modules/@simplewebauthn/browser/dist/bundle/index.umd.min.js',
          'text/javascript; charset=utf-8',res);return;
      }
      if(!pathname.startsWith('/api/')||
         !authorization(req)){
        send(res,403,{error:'ACCESS_DENIED'});return;
      }
      if(req.method==='GET'&&pathname==='/api/order'){
        send(res,200,{
          order:snapshot(state.order),digest:orderDigest(state.order),
          credentialRegistered:!!state.credential,
          granted:!!state.grant&&!state.grant.used&&state.grant.expires>clock(),
          laboratory:true,realMoney:false,deviceTested:false
        });return;
      }
      if(req.method!=='POST'){send(res,405,{error:'METHOD_NOT_ALLOWED'});return;}
      const body=await readJSON(req);
      const matchesOrder=()=>body.orderId===state.order.id&&
        safeEqual(body.digest,orderDigest(state.order));
      if(pathname==='/api/passkey/register/options'){
        if(state.credential)throw deny('CREDENTIAL_ALREADY_REGISTERED');
        const options=await webauthn.generateRegistrationOptions({
          rpName:'ARC Affiliate — LABORATORIO LOCAL SIN DINERO',
          rpID:RP_ID,
          userID:randomBytes(16),
          userName:'sim_admin_'+access.slice(0,10),
          userDisplayName:'Administrador de laboratorio (ficticio)',
          attestationType:'none',
          authenticatorSelection:{residentKey:'preferred',userVerification:'required'},
          supportedAlgorithmIDs:[-7],timeout:TTL_MS
        });
        state.registration={challenge:options.challenge,expires:clock()+TTL_MS,used:false};
        send(res,200,options);return;
      }
      if(pathname==='/api/passkey/register/verify'){
        const pending=state.registration;
        if(!pending||pending.used||pending.expires<=clock()||
            !isValidResponse(body.response))throw deny('INVALID_REGISTRATION');
        pending.used=true;
        let verified;
        try{
          verified=await webauthn.verifyRegistrationResponse({
            response:body.response,
            expectedChallenge:pending.challenge,
            expectedOrigin:origin(),
            expectedRPID:RP_ID,
            requireUserVerification:true
          });
        }catch{throw deny('REGISTRATION_NOT_VERIFIED');}
        const c=verified?.registrationInfo?.credential;
        if(!verified?.verified||!c?.id||!(c.publicKey instanceof Uint8Array)){
          throw deny('REGISTRATION_NOT_VERIFIED');
        }
        state.credential={
          id:c.id,publicKey:new Uint8Array(c.publicKey),
          counter:Number(c.counter)||0,transports:c.transports||[]
        };
        send(res,200,{verified:true,simulationOnly:true});return;
      }
      if(pathname==='/api/refund/options'){
        if(!state.credential)throw deny('PASSKEY_NOT_REGISTERED');
        if(!matchesOrder()||body.acknowledged!==true||
            state.order.status!=='SIM_CONFIRMED')throw deny('ORDER_NOT_CONFIRMED');
        const options=await webauthn.generateAuthenticationOptions({
          rpID:RP_ID,userVerification:'required',timeout:TTL_MS,
          allowCredentials:[{
            id:state.credential.id,transports:state.credential.transports
          }]
        });
        state.grant=null;
        state.authentication={
          challenge:options.challenge,expires:clock()+TTL_MS,used:false,
          orderId:state.order.id,digest:orderDigest(state.order)
        };
        send(res,200,options);return;
      }
      if(pathname==='/api/refund/verify'){
        const pending=state.authentication;
        if(!pending||pending.used||pending.expires<=clock()||!matchesOrder()||
           pending.orderId!==state.order.id||pending.digest!==orderDigest(state.order)||
           !isValidResponse(body.response)||!state.credential){
          throw deny('INVALID_REFUND_CHALLENGE');
        }
        pending.used=true;
        if(body.response.id!==state.credential.id)throw deny('FOREIGN_CREDENTIAL');
        let result;
        try{
          result=await webauthn.verifyAuthenticationResponse({
            response:body.response,expectedChallenge:pending.challenge,
            expectedOrigin:origin(),expectedRPID:RP_ID,
            requireUserVerification:true,credential:state.credential
          });
        }catch{throw deny('PASSKEY_NOT_VERIFIED');}
        if(!result?.verified||
          !Number.isSafeInteger(result.authenticationInfo?.newCounter)){
          throw deny('PASSKEY_NOT_VERIFIED');
        }
        state.credential.counter=result.authenticationInfo.newCounter;
        state.grant={orderId:state.order.id,digest:orderDigest(state.order),
          expires:clock()+GRANT_MS,used:false};
        send(res,200,{verified:true,expiresInMs:GRANT_MS,
          action:'ONLY_SIMULATED_REFUND'});return;
      }
      if(pathname==='/api/refund/execute'){
        const grant=state.grant;
        if(!matchesOrder()||!grant||grant.used||grant.expires<=clock()||
           grant.orderId!==state.order.id||grant.digest!==orderDigest(state.order)||
           state.order.status!=='SIM_CONFIRMED'){
          throw deny('NO_VALID_ORDER_GRANT');
        }
        // No awaits between validation, consuming grant and state transition.
        grant.used=true;
        state.order.status='SIM_REFUNDED';
        state.receipt={
          operation:'SIM_REFUND',orderId:state.order.id,
          amountCop:state.order.priceCop,
          realPayment:false,at:new Date(clock()).toISOString()
        };
        send(res,200,{ok:true,receipt:state.receipt,order:snapshot(state.order)});return;
      }
      send(res,404,{error:'UNKNOWN_API'});
    }catch(error){
      const status=error instanceof LocalLabBlocked?400:500;
      send(res,status,{error:error?.code||'LAB_OPERATION_FAILED'});
    }
  };
  server=createServer(handler);
  try{
    await new Promise((resolve,reject)=>{
      server.once('error',reject);
      server.listen({host:LAB_HOST,port,exclusive:true},resolve);
    });
  }catch(error){server.close();throw error;}
  actualPort=server.address().port;
  return Object.freeze({
    origin:origin(),host:LAB_HOST,port:actualPort,
    openUrl:origin()+'/?lab='+access,
    accessToken:access,
    close:()=>new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve())),
    snapshot:()=>snapshot(state.order)
  });
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  createAffiliateBrowserLab().then(lab=>{
    console.log('LABORATORIO LOCAL 1.4 — SOLO PEDIDOS FICTICIOS');
    console.log('Copia esta URL en el navegador del MISMO equipo:');
    console.log(lab.openUrl);
    console.log('Cierra esta consola o Ctrl+C para destruir los datos temporales.');
  }).catch(error=>{
    console.error('No se ha iniciado el laboratorio:',error.message);
    process.exitCode=1;
  });
}
