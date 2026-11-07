import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {createStagingPool} from './mysql-staging-adapter.mjs';
import {MysqlStagingDemoStore} from './mysql-staging-store.mjs';
import {MysqlDemoRoleGate} from './mysql-staging-access.mjs';
import {MysqlStagingIdentity} from './mysql-staging-identity.mjs';
import {totpAt} from './mysql-staging-mfa.mjs';
import {
  MysqlStagingWebAuthnCeremony,DemoCeremonyRejected
} from './mysql-staging-webauthn-ceremony.mjs';
import {
  createSyntheticAuthenticator,syntheticRegistrationResponse,syntheticAuthenticationResponse
} from './mysql-staging-webauthn.fixture.mjs';
import {DemoRefundApprovalRejected} from './mysql-staging-refund-approval.mjs';

const enabled=process.env.ARC_AFF_MYSQL_CI_TEST==='1'
 &&process.env.ARC_AFF_STAGING_SCHEMA_TEST==='1';
const password='CI-FICTITIOUS-REFUND-APPROVAL-ONLY-2026';

async function setup(){
 const pool=await createStagingPool(process.env);
 try {
  const store=new MysqlStagingDemoStore(pool,process.env);
  await store.initializeSchema();
  const roles=new MysqlDemoRoleGate(pool,store,process.env);
  await roles.initializeSchema();
  let now=Date.now();
  const identity=new MysqlStagingIdentity(pool,roles,process.env,()=>now,randomBytes(32));
  await identity.initializeSchema();
  const ceremony=new MysqlStagingWebAuthnCeremony(pool,identity,process.env);
  await ceremony.initializeSchema();
  const product=await store.product({title:'Reembolsos de prueba',priceCop:100000,commissionPct:30});
  const affiliate=await store.affiliate({alias:'Afiliado de prueba'});
  const link=await store.referral({productId:product.id,affiliateId:affiliate.id});
  const orders=[];
  for(let n=0;n<2;n++){
    orders.push(await store.simulatedOrder({referralId:link.id,requestId:'opbound-'+randomUUID()}));
  }
  const principalId=await roles.createFixture({role:'SIM_ADMIN'});
  const username='sim_bound_'+randomUUID().replaceAll('-','').slice(0,17);
  const accountId=await identity.createFixtureAccount({principalId,username,password});
  const totpSeed=await identity.enrollFixtureAdminMfa(accountId);
  const token=(await identity.signIn({username,password,totpCode:totpAt(totpSeed,now).code})).token;
  const key=createSyntheticAuthenticator();
  const reg=await ceremony.startRegistration(token);
  await ceremony.finishRegistration(token,syntheticRegistrationResponse(key,reg));
  const authenticate=await ceremony.startAuthentication(token);
  await ceremony.finishAuthentication(token,syntheticAuthenticationResponse(key,authenticate,{counter:1}));
  let counter=1;
  const authorize=async(orderId,params={})=>{
    const request=await ceremony.beginRefundAuthorization(token,orderId);
    counter++;
    const response=syntheticAuthenticationResponse(key,request,{
      counter, ...params
    });
    return ceremony.finishRefundAuthorization(token,orderId,response);
  };
  return {pool,store,roles,identity,ceremony,key,orders,token,authorize,
    advance:ms=>{now+=ms;},now:()=>now};
 }catch(error){await pool.end();throw error;}
}

test('MySQL real: aprobación de pedido A no permite reembolsar pedido B', {skip:!enabled},async()=>{
 const e=await setup();
 try {
  const [a,b]=e.orders;
  const result=await e.authorize(a.id);
  assert.equal(result.orderId,a.id);
  await assert.rejects(()=>e.identity.refundOrder(e.token,b.id),DemoRefundApprovalRejected);
  assert.equal((await e.identity.refundOrder(e.token,a.id)).status,'SIM_REFUNDED');
  await assert.rejects(()=>e.identity.refundOrder(e.token,a.id),DemoRefundApprovalRejected);
  assert.equal((await e.store.byId(b.id)).status,'SIM_CONFIRMED');
  assert.equal((await e.store.reconcile()).ok,true);
 }finally{await e.pool.end();}
});

test('MySQL real: concesión de 60 segundos caduca y no se reutiliza', {skip:!enabled},async()=>{
 const e=await setup();
 try {
  const [a]=e.orders;
  await e.authorize(a.id);
  e.advance(60001);
  await assert.rejects(()=>e.identity.refundOrder(e.token,a.id),DemoRefundApprovalRejected);
  assert.equal((await e.store.byId(a.id)).status,'SIM_CONFIRMED');
  await e.authorize(a.id);
  assert.equal((await e.identity.refundOrder(e.token,a.id)).status,'SIM_REFUNDED');
 }finally{await e.pool.end();}
});

test('MySQL real: desafío de un pedido nunca autoriza otro y firma falsa lo consume', {skip:!enabled},async()=>{
 const e=await setup();
 try {
  const [a,b]=e.orders;
  const options=await e.ceremony.beginRefundAuthorization(e.token,a.id);
  const reply=syntheticAuthenticationResponse(e.key,options,{counter:2});
  await assert.rejects(
    ()=>e.ceremony.finishRefundAuthorization(e.token,b.id,reply),DemoCeremonyRejected
  );
  const invalid=syntheticAuthenticationResponse(e.key,options,{
    origin:'http://impostor.localhost:3198',counter:2
  });
  await assert.rejects(
    ()=>e.ceremony.finishRefundAuthorization(e.token,a.id,invalid),DemoCeremonyRejected
  );
  await assert.rejects(
    ()=>e.ceremony.finishRefundAuthorization(e.token,a.id,reply),DemoCeremonyRejected
  );
  await assert.rejects(()=>e.identity.refundOrder(e.token,a.id),DemoRefundApprovalRejected);
  assert.equal((await e.store.byId(b.id)).status,'SIM_CONFIRMED');
 }finally{await e.pool.end();}
});

test('MySQL real: dos reembolsos concurrentes con mismo permiso ejecutan solo uno', {skip:!enabled},async()=>{
 const e=await setup();
 try {
  const [a]=e.orders;
  await e.authorize(a.id);
  const results=await Promise.allSettled([
    e.identity.refundOrder(e.token,a.id),e.identity.refundOrder(e.token,a.id)
  ]);
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(results.filter(x=>x.status==='rejected'&&x.reason instanceof DemoRefundApprovalRejected).length,1);
  const [events]=await e.pool.execute(
    "SELECT COUNT(*) AS n FROM aff_demo_audit WHERE order_id=? AND event_type='SIM_ORDER_REFUNDED'",
    [a.id]
  );
  assert.equal(events[0].n,1);
  assert.equal((await e.store.reconcile()).ok,true);
 }finally{await e.pool.end();}
});
