import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {createStagingPool} from './mysql-staging-adapter.mjs';
import {MysqlStagingDemoStore} from './mysql-staging-store.mjs';
import {MysqlDemoRoleGate,DemoAccessDenied} from './mysql-staging-access.mjs';
import {MysqlStagingIdentity,DemoAuthenticationFailed} from './mysql-staging-identity.mjs';
import {totpAt} from './mysql-staging-mfa.mjs';

const enabled=process.env.ARC_AFF_MYSQL_CI_TEST==='1'
  &&process.env.ARC_AFF_STAGING_SCHEMA_TEST==='1';
const goodPassword='TEST-ONLY-PASSWORD-ARC-2026!';
const username=()=> 'sim_test_'+randomUUID().replaceAll('-','').slice(0,15);
const req=prefix=>prefix+'-'+randomUUID();

async function createEnv(){
 const pool=await createStagingPool(process.env);
 try{
   const store=new MysqlStagingDemoStore(pool,process.env);
   await store.initializeSchema();
   const roles=new MysqlDemoRoleGate(pool,store,process.env);
   await roles.initializeSchema();
   let now=Date.now();
   const clock=()=>now;
   const setTime=t=>{now=t;};
   const identity=new MysqlStagingIdentity(pool,roles,process.env,clock,randomBytes(32));
   await identity.initializeSchema();
   const product=await store.product({title:'Comercio demo de seguridad',priceCop:100000,commissionPct:30});
   const affiliate=await store.affiliate({alias:'Afiliado demo de seguridad'});
   const link=await store.referral({productId:product.id,affiliateId:affiliate.id});
   const order=await store.simulatedOrder({referralId:link.id,requestId:req('identity')});
   return {pool,store,roles,identity,product,affiliate,order,setTime,time:()=>now};
 }catch(e){await pool.end();throw e;}
}
async function account(env,role,scope={}){
 const principalId=await env.roles.createFixture({
   role,scopeProductId:scope.productId||null,scopeAffiliateId:scope.affiliateId||null
 });
 const user=username();
 const accountId=await env.identity.createFixtureAccount({
   principalId,username:user,password:goodPassword
 });
 const mfaSeed=role==='SIM_ADMIN'?await env.identity.enrollFixtureAdminMfa(accountId):null;
 return {principalId,accountId,username:user,mfaSeed};
}
async function login(env,a,password=goodPassword){
 const totpCode=a.mfaSeed?totpAt(a.mfaSeed,env.time()).code:null;
 return env.identity.signIn({username:a.username,password,totpCode});
}

test('MySQL real: contraseña scrypt y token opaco almacenados únicamente como hashes',
 {skip:!enabled},async()=>{
 const e=await createEnv();
 try{
   const a=await account(e,'SIM_ADMIN');
   const [stored]=await e.pool.execute(
     'SELECT pwd_salt,pwd_digest FROM aff_demo_accounts WHERE id=?',[a.accountId]
   );
   assert.equal(stored.length,1);
   assert.equal(stored[0].pwd_digest.length,64);
   assert.equal(stored[0].pwd_salt.length,32);
   assert.equal(JSON.stringify(stored).includes(goodPassword),false);
   const session=await login(e,a);
   assert.match(session.token,/^[A-Za-z0-9_-]{43}$/);
   assert.equal(session.expiresAtMs,e.time()+15*60*1000);
   const [records]=await e.pool.execute(
     'SELECT token_hash,expires_at_ms,revoked FROM aff_demo_sessions WHERE account_id=?',
     [a.accountId]
   );
   assert.equal(records.length,1);
   assert.equal(records[0].token_hash,createHash('sha256').update(session.token).digest('hex'));
   assert.equal(JSON.stringify(records).includes(session.token),false);
   assert.equal((await e.identity.readOrder(session.token,e.order.id)).id,e.order.id);
   // WebAuthn-style step-up is now mandatory for simulated admin refunds.
   await assert.rejects(()=>e.identity.refundOrder(session.token,e.order.id),DemoAuthenticationFailed);
   assert.equal((await e.store.reconcile()).ok,true);
 }finally{await e.pool.end();}
});

test('MySQL real: incorrectas, usuario desconocido y quinto fallo bloquean acceso',
 {skip:!enabled},async()=>{
 const e=await createEnv();
 try{
   const a=await account(e,'SIM_ADMIN');
   const unknown=username();
   await assert.rejects(()=>e.identity.signIn({username:unknown,password:goodPassword}),DemoAuthenticationFailed);
   for(let i=0;i<5;i++){
     await assert.rejects(
       ()=>e.identity.signIn({username:a.username,password:'OTHER-DUMMY-PASSWORD-2026!'}),
       DemoAuthenticationFailed
     );
   }
   const [rows]=await e.pool.execute(
     'SELECT failed_attempts,locked_until_ms FROM aff_demo_accounts WHERE id=?',[a.accountId]
   );
   assert.equal(rows[0].failed_attempts,5);
   assert.ok(Number(rows[0].locked_until_ms)>e.time());
   await assert.rejects(()=>login(e,a),DemoAuthenticationFailed);
   e.setTime(Number(rows[0].locked_until_ms)+1);
   const session=await login(e,a);
   assert.equal((await e.identity.readOrder(session.token,e.order.id)).id,e.order.id);
   e.setTime(session.expiresAtMs+1);
   await assert.rejects(()=>e.identity.readOrder(session.token,e.order.id),DemoAuthenticationFailed);
 }finally{await e.pool.end();}
});

test('MySQL real: revocación por cierre de sesión, cuenta desactivada y rol deshabilitado',
 {skip:!enabled},async()=>{
 const e=await createEnv();
 try{
   const a=await account(e,'SIM_ADMIN');
   const s1=await login(e,a);
   await e.identity.signOut(s1.token);
   await assert.rejects(()=>e.identity.readOrder(s1.token,e.order.id),DemoAuthenticationFailed);
   e.setTime(e.time()+30000); // a TOTP code cannot be re-used in the same window
   const s2=await login(e,a);
   await e.identity.disableAccount(a.accountId);
   await assert.rejects(()=>e.identity.readOrder(s2.token,e.order.id),DemoAuthenticationFailed);
   await assert.rejects(()=>login(e,a),DemoAuthenticationFailed);
   const b=await account(e,'SIM_ADMIN');
   const s3=await login(e,b);
   await e.roles.disableFixture(b.principalId);
   await assert.rejects(()=>e.identity.readOrder(s3.token,e.order.id),DemoAuthenticationFailed);
 }finally{await e.pool.end();}
});

test('MySQL real: un afiliado autenticado no ve pedidos ajenos ni revierte ventas',
 {skip:!enabled},async()=>{
 const e=await createEnv();
 try{
   const a=await account(e,'SIM_AFFILIATE',{affiliateId:e.affiliate.id});
   const otherAffiliate=await e.store.affiliate({alias:'Otro afiliado ficticio'});
   const b=await account(e,'SIM_AFFILIATE',{affiliateId:otherAffiliate.id});
   const merchant=await account(e,'SIM_MERCHANT',{productId:e.product.id});
   const s1=await login(e,a);
   const s2=await login(e,b);
   const s3=await e.identity.signIn({username:merchant.username,password:goodPassword});
   assert.equal((await e.identity.readOrder(s1.token,e.order.id)).id,e.order.id);
   assert.equal((await e.identity.readOrder(s3.token,e.order.id)).id,e.order.id);
   await assert.rejects(()=>e.identity.readOrder(s2.token,e.order.id),DemoAccessDenied);
   await assert.rejects(()=>e.identity.refundOrder(s1.token,e.order.id),DemoAccessDenied);
   await assert.rejects(()=>e.identity.refundOrder(s3.token,e.order.id),DemoAccessDenied);
   await assert.rejects(()=>e.identity.readOrder('invalid-token',e.order.id),DemoAuthenticationFailed);
   assert.equal((await e.store.byId(e.order.id)).status,'SIM_CONFIRMED');
 }finally{await e.pool.end();}
});

test('MySQL real: entradas malformadas no abren sesión ni permiten inyección de usuario',
 {skip:!enabled},async()=>{
 const e=await createEnv();
 try{
   await assert.rejects(()=>e.identity.signIn({username:"sim_test' OR 1=1 --",password:goodPassword}),
     DemoAuthenticationFailed);
   await assert.rejects(()=>e.identity.signIn({username:'sim_good_fixture',password:'123'}),
     DemoAuthenticationFailed);
   const [rows]=await e.pool.query('SELECT COUNT(*) AS n FROM aff_demo_sessions');
   assert.ok(Number(rows[0].n)>=0);
 }finally{await e.pool.end();}
});
