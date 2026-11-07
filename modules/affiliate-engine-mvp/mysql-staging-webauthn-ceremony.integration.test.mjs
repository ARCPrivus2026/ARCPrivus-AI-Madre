import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {createStagingPool} from './mysql-staging-adapter.mjs';
import {MysqlStagingDemoStore} from './mysql-staging-store.mjs';
import {MysqlDemoRoleGate} from './mysql-staging-access.mjs';
import {MysqlStagingIdentity,DemoAuthenticationFailed} from './mysql-staging-identity.mjs';
import {totpAt} from './mysql-staging-mfa.mjs';
import {
  MysqlStagingWebAuthnCeremony,DemoCeremonyRejected,RP_ID,RP_ORIGIN
} from './mysql-staging-webauthn-ceremony.mjs';
import {
  createSyntheticAuthenticator,syntheticRegistrationResponse,syntheticAuthenticationResponse
} from './mysql-staging-webauthn.fixture.mjs';

const enabled=process.env.ARC_AFF_MYSQL_CI_TEST==='1'
 &&process.env.ARC_AFF_STAGING_SCHEMA_TEST==='1';
const pass='ONLY-CI-TEST-PASSWORD-NotForUsers2026';

async function setup(){
 const pool=await createStagingPool(process.env);
 try{
  const store=new MysqlStagingDemoStore(pool,process.env);
  await store.initializeSchema();
  const roles=new MysqlDemoRoleGate(pool,store,process.env);
  await roles.initializeSchema();
  let clock=Date.now();
  const now=()=>clock;
  const identity=new MysqlStagingIdentity(pool,roles,process.env,now,randomBytes(32));
  await identity.initializeSchema();
  const ceremonies=new MysqlStagingWebAuthnCeremony(pool,identity,process.env);
  await ceremonies.initializeSchema();
  const product=await store.product({title:'WebAuthn CI producto falso',priceCop:100000,commissionPct:30});
  const affiliate=await store.affiliate({alias:'WebAuthn CI afiliado ficticio'});
  const referral=await store.referral({productId:product.id,affiliateId:affiliate.id});
  const order=await store.simulatedOrder({
   referralId:referral.id,requestId:'wa12-'+randomUUID()
  });
  const principal=await roles.createFixture({role:'SIM_ADMIN'});
  const username='sim_wa_'+randomUUID().replaceAll('-','').slice(0,18);
  const accountId=await identity.createFixtureAccount({
   principalId:principal,username,password:pass
  });
  const seed=await identity.enrollFixtureAdminMfa(accountId);
  const session=await identity.signIn({
   username,password:pass,totpCode:totpAt(seed,clock).code
  });
  const auth=createSyntheticAuthenticator();
  return {pool,store,roles,identity,ceremonies,accountId,session,order,auth,
   now,advance:ms=>{clock+=ms;}};
 }catch(e){await pool.end();throw e;}
}
async function register(e){
 const options=await e.ceremonies.startRegistration(e.session.token);
 const response=syntheticRegistrationResponse(e.auth,options);
 return {options,response,result:await e.ceremonies.finishRegistration(e.session.token,response)};
}

test('MySQL real y SimpleWebAuthn: registra clave sintética y verifica firma antes de reembolso',
 {skip:!enabled},async()=>{
 const e=await setup();
 try{
  await assert.rejects(()=>e.identity.refundOrder(e.session.token,e.order.id),DemoAuthenticationFailed);
  const registered=await register(e);
  assert.equal(registered.options.rp.id,RP_ID);
  assert.equal(registered.result.verified,true);
  assert.equal(registered.result.credentialId,registered.response.id);
  const [creds]=await e.pool.execute(
   'SELECT account_id,public_key,sign_counter FROM aff_demo_wa_credentials WHERE id=?',
   [registered.response.id]
  );
  assert.equal(creds.length,1);
  assert.equal(creds[0].account_id,e.accountId);
  assert.ok(Buffer.isBuffer(creds[0].public_key));
  await assert.rejects(()=>e.identity.refundOrder(e.session.token,e.order.id),DemoAuthenticationFailed);
  const options=await e.ceremonies.startAuthentication(e.session.token);
  assert.equal(options.rpId,RP_ID);
  assert.equal(options.userVerification,'required');
  assert.equal(options.allowCredentials.length,1);
  const response=syntheticAuthenticationResponse(e.auth,options,{counter:1});
  const approved=await e.ceremonies.finishAuthentication(e.session.token,response);
  assert.equal(approved.verified,true);
  const refunded=await e.identity.refundOrder(e.session.token,e.order.id);
  assert.equal(refunded.status,'SIM_REFUNDED');
  assert.equal((await e.store.reconcile()).ok,true);
 }finally{await e.pool.end();}
});

test('MySQL real: registro de origen falso falla y consume desafío sin registrar credencial',
 {skip:!enabled},async()=>{
 const e=await setup();
 try{
  const opts=await e.ceremonies.startRegistration(e.session.token);
  const phishing=syntheticRegistrationResponse(e.auth,opts,{origin:'http://phishing.localhost:3198'});
  await assert.rejects(()=>e.ceremonies.finishRegistration(e.session.token,phishing),DemoCeremonyRejected);
  const valid=syntheticRegistrationResponse(e.auth,opts);
  await assert.rejects(()=>e.ceremonies.finishRegistration(e.session.token,valid),DemoCeremonyRejected);
  const [count]=await e.pool.execute(
   'SELECT COUNT(*) AS total FROM aff_demo_wa_credentials WHERE account_id=?',[e.accountId]
  );
  assert.equal(count[0].total,0);
  assert.equal((await register(e)).result.verified,true);
 }finally{await e.pool.end();}
});

test('MySQL real: firma de otro origen y desafío caducado no autorizan el paso',
 {skip:!enabled},async()=>{
 const e=await setup();
 try{
  await register(e);
  const opts=await e.ceremonies.startAuthentication(e.session.token);
  const bad=syntheticAuthenticationResponse(e.auth,opts,{origin:'http://impostor.localhost:3198',counter:1});
  await assert.rejects(()=>e.ceremonies.finishAuthentication(e.session.token,bad),DemoCeremonyRejected);
  await assert.rejects(()=>e.ceremonies.finishAuthentication(e.session.token,
   syntheticAuthenticationResponse(e.auth,opts,{counter:1})),DemoCeremonyRejected);
  const pending=await e.ceremonies.startAuthentication(e.session.token);
  e.advance(120001);
  await assert.rejects(()=>e.ceremonies.finishAuthentication(e.session.token,
   syntheticAuthenticationResponse(e.auth,pending,{counter:1})),DemoCeremonyRejected);
  await assert.rejects(()=>e.identity.refundOrder(e.session.token,e.order.id),DemoAuthenticationFailed);
 }finally{await e.pool.end();}
});

test('MySQL real: misma aserción concurrente se acepta una sola vez; el contador se guarda',
 {skip:!enabled},async()=>{
 const e=await setup();
 try{
  await register(e);
  const opts=await e.ceremonies.startAuthentication(e.session.token);
  const response=syntheticAuthenticationResponse(e.auth,opts,{counter:2});
  const attempts=await Promise.allSettled([
   e.ceremonies.finishAuthentication(e.session.token,response),
   e.ceremonies.finishAuthentication(e.session.token,response)
  ]);
  assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(attempts.filter(x=>x.status==='rejected'&&x.reason instanceof DemoCeremonyRejected).length,1);
  const [rows]=await e.pool.execute(
   'SELECT sign_counter FROM aff_demo_wa_credentials WHERE account_id=?',[e.accountId]
  );
  assert.equal(rows[0].sign_counter,2);
  const next=await e.ceremonies.startAuthentication(e.session.token);
  await assert.rejects(()=>e.ceremonies.finishAuthentication(e.session.token,
   syntheticAuthenticationResponse(e.auth,next,{counter:2})),DemoCeremonyRejected);
 }finally{await e.pool.end();}
});
