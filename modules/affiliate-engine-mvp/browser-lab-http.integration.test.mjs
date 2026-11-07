import test from 'node:test';
import assert from 'node:assert/strict';
import {request as httpRequest} from 'node:http';
import {createAffiliateBrowserLab,LocalLabBlocked} from './browser-lab-server.mjs';
import {
  createSyntheticAuthenticator,syntheticRegistrationResponse,syntheticAuthenticationResponse
} from './mysql-staging-webauthn.fixture.mjs';

const env={
  ARC_AFF_BROWSER_LAB:'1',
  ARC_AFF_BROWSER_LAB_ACK:'SIMULATION_ONLY',
  ARC_AFF_MYSQL_CI_TEST:'1'
};
const enabled=process.env.ARC_AFF_MYSQL_CI_TEST==='1'&&
  process.env.ARC_AFF_STAGING_SCHEMA_TEST==='1';

async function setup(){
 let now=Date.now();
 const lab=await createAffiliateBrowserLab({
  env,port:0,testMode:true,clock:()=>now
 });
 const req=async(method,path,body,headers={},authenticated=true)=>{
  const payload=body===undefined?null:JSON.stringify(body);
  return await new Promise((resolve,reject)=>{
   const request=httpRequest({
    hostname:'127.0.0.1',port:lab.port,path,method,
    headers:{
     Host:'localhost:'+lab.port,
     ...(payload?{'Content-Type':'application/json'}:{}),
     ...(authenticated?{
      'X-Lab-Token':lab.accessToken,'X-Lab-CSRF':'lab-user-action'
     }:{}),
     ...(method==='POST'?{Origin:lab.origin}:{}),
     ...headers
    }
   },res=>{
    const chunks=[];
    res.on('data',chunk=>chunks.push(chunk));
    res.on('end',()=>{
     const raw=Buffer.concat(chunks);
     const type=res.headers['content-type']||'';
     let data=raw;
     if(type.includes('application/json')) {
      try{data=JSON.parse(raw.toString('utf8'));}catch{return reject(Error('Malformed JSON from lab'));}
     }else if(type.startsWith('text/'))data=raw.toString('utf8');
     resolve({status:res.statusCode,data,headers:res.headers});
    });
   });
   request.once('error',reject);
   if(payload!==null)request.write(payload);
   request.end();
  });
 };
 const get=()=>req('GET','/api/order');
 const post=(route,body)=>req('POST',route,body);
 const enroll=async()=>{
  const key=createSyntheticAuthenticator();
  const options=(await post('/api/passkey/register/options',{})).data;
  const attestation=syntheticRegistrationResponse(key,options,{origin:lab.origin});
  const verified=await post('/api/passkey/register/verify',{response:attestation});
  assert.equal(verified.status,200);
  assert.equal(verified.data.verified,true);
  return key;
 };
 const verify=async(key,order,digest,counter=1)=>{
  const options=(await post('/api/refund/options',{
   orderId:order.id,digest,acknowledged:true
  })).data;
  assert.ok(options.challenge);
  const response=syntheticAuthenticationResponse(key,options,{
   origin:lab.origin,counter
  });
  return post('/api/refund/verify',{orderId:order.id,digest,response});
 };
 return {lab,req,get,post,enroll,verify,advance:ms=>{now+=ms;}};
}

test('Navegador local real: requires two explicit opt-ins and rejects non-CI ephemeral mode',async()=>{
 await assert.rejects(()=>createAffiliateBrowserLab({env:{}}),LocalLabBlocked);
 await assert.rejects(()=>createAffiliateBrowserLab({
  env:{ARC_AFF_BROWSER_LAB:'1'},port:0,testMode:true
 }),LocalLabBlocked);
 await assert.rejects(()=>createAffiliateBrowserLab({
  env:{ARC_AFF_BROWSER_LAB:'1',ARC_AFF_BROWSER_LAB_ACK:'SIMULATION_ONLY'},
  port:0,testMode:true
 }),LocalLabBlocked);
});

test('HTTP local: bundle same-origin, access key, CSRF and fake order',
 {skip:!enabled},async()=>{
 const x=await setup();
 try{
  const ok=await x.req('GET','/?lab='+x.lab.accessToken,undefined,{},false);
  assert.equal(ok.status,200);
  assert.match(ok.data,/SOLO SIMULACIÓN/);
  assert.match(ok.headers['content-security-policy'],/default-src 'none'/);
  const forbidden=await x.req('GET','/',undefined,{},false);
  assert.equal(forbidden.status,403);
  assert.equal((await x.req('GET','/api/order',undefined,{},false)).status,403);
  assert.equal((await x.req('GET','/api/order',undefined,{Host:'evil.local:3198'})).status,403);
  const order=await x.get();
  assert.equal(order.status,200);
  assert.equal(order.data.order.priceCop,100000);
  assert.equal(order.data.order.currency,'COP');
  assert.equal(order.data.realMoney,false);
  assert.equal(order.data.deviceTested,false);
  const script=await x.req('GET','/vendor/webauthn.js',undefined,{},false);
  assert.equal(script.status,200);
  assert.ok(script.data.length>1000);
  const app=await x.req('GET','/lab/app.js',undefined,{},false);
  assert.equal(app.status,200);
  assert.match(app.data,/startAuthentication/);
  const missingCsrf=await x.req('POST','/api/passkey/register/options',{},
   {'X-Lab-CSRF':'invalid'});
  assert.equal(missingCsrf.status,403);
  const wrongOrigin=await x.req('POST','/api/passkey/register/options',{},
   {Origin:'http://other.localhost:3198'});
  assert.equal(wrongOrigin.status,403);
 }finally{await x.lab.close();}
});

test('HTTP local y SimpleWebAuthn: registration, order-bound confirmation, one simulated refund',
 {skip:!enabled},async()=>{
 const x=await setup();
 try{
  const key=await x.enroll();
  let state=(await x.get()).data;
  assert.equal(state.credentialRegistered,true);
  const {order,digest}=state;
  assert.equal((await x.post('/api/refund/options',{
   orderId:order.id,digest,acknowledged:false
  })).status,400);
  assert.equal((await x.post('/api/refund/options',{
   orderId:'00000000-0000-4000-8000-000000000999',
   digest,acknowledged:true
  })).status,400);
  assert.equal((await x.post('/api/refund/options',{
   orderId:order.id,digest:'not-the-order',acknowledged:true
  })).status,400);
  const approved=await x.verify(key,order,digest,1);
  assert.equal(approved.status,200);
  assert.equal(approved.data.expiresInMs,60000);
  const refund=await x.post('/api/refund/execute',{orderId:order.id,digest});
  assert.equal(refund.status,200);
  assert.equal(refund.data.order.status,'SIM_REFUNDED');
  assert.equal(refund.data.receipt.realPayment,false);
  assert.equal((await x.post('/api/refund/execute',{orderId:order.id,digest})).status,400);
  state=(await x.get()).data;
  assert.equal(state.order.status,'SIM_REFUNDED');
  assert.equal(state.granted,false);
 }finally{await x.lab.close();}
});

test('HTTP local: false origin consumes challenge and cannot authorize refund',
 {skip:!enabled},async()=>{
 const x=await setup();
 try{
  const key=await x.enroll();
  const {order,digest}=(await x.get()).data;
  const options=(await x.post('/api/refund/options',{
   orderId:order.id,digest,acknowledged:true
  })).data;
  const fake=syntheticAuthenticationResponse(key,options,{
   origin:'http://phishing.localhost:3198',counter:1
  });
  assert.equal((await x.post('/api/refund/verify',{
   orderId:order.id,digest,response:fake
  })).status,400);
  const real=syntheticAuthenticationResponse(key,options,{
   origin:x.lab.origin,counter:1
  });
  assert.equal((await x.post('/api/refund/verify',{
   orderId:order.id,digest,response:real
  })).status,400);
  assert.equal((await x.post('/api/refund/execute',{orderId:order.id,digest})).status,400);
  assert.equal((await x.get()).data.order.status,'SIM_CONFIRMED');
 }finally{await x.lab.close();}
});

test('HTTP local: grant expiration blocks operation and requires another passkey',
 {skip:!enabled},async()=>{
 const x=await setup();
 try{
  const key=await x.enroll();
  const {order,digest}=(await x.get()).data;
  assert.equal((await x.verify(key,order,digest)).status,200);
  x.advance(60001);
  assert.equal((await x.post('/api/refund/execute',{orderId:order.id,digest})).status,400);
  assert.equal((await x.get()).data.order.status,'SIM_CONFIRMED');
  assert.equal((await x.verify(key,order,digest,2)).status,200);
  assert.equal((await x.post('/api/refund/execute',{orderId:order.id,digest})).status,200);
 }finally{await x.lab.close();}
});
