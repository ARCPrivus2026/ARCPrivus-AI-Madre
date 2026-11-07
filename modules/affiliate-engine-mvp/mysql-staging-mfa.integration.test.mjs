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
const password='NO-REAL-PASSWORD-AFFILIATE-TEST-2026';
const username=()=> 'sim_mfa_'+randomUUID().replaceAll('-','').slice(0,20);
const request=()=> 'mfa-'+randomUUID();

async function setup(){
 const pool=await createStagingPool(process.env);
 try {
   const store=new MysqlStagingDemoStore(pool,process.env);
   await store.initializeSchema();
   const roles=new MysqlDemoRoleGate(pool,store,process.env);
   await roles.initializeSchema();
   let now=600000;
   const identity=new MysqlStagingIdentity(pool,roles,process.env,()=>now,randomBytes(32));
   await identity.initializeSchema();
   const product=await store.product({title:'MFA dummy demo',priceCop:50000,commissionPct:30});
   const affiliate=await store.affiliate({alias:'MFA dummy affiliate'});
   const referral=await store.referral({productId:product.id,affiliateId:affiliate.id});
   const order=await store.simulatedOrder({referralId:referral.id,requestId:request()});
   const fixture=async (role,scope={})=>{
     const principalId=await roles.createFixture({
       role,scopeProductId:scope.productId||null,scopeAffiliateId:scope.affiliateId||null
     });
     const accountId=await identity.createFixtureAccount({
       principalId,username:username(),password
     });
     const [found]=await pool.execute('SELECT username FROM aff_demo_accounts WHERE id=?',[accountId]);
     return {accountId,principalId,username:found[0].username};
   };
   return {pool,roles,store,identity,product,affiliate,order,fixture,
     now:()=>now,setNow:value=>{now=value;}};
 }catch(error){await pool.end();throw error;}
}
test('MySQL real: admin jamás obtiene sesión solo con contraseña, incluso sin inscribir MFA',
 {skip:!enabled},async()=>{
 const e=await setup();
 try{
   const admin=await e.fixture('SIM_ADMIN');
   await assert.rejects(
     ()=>e.identity.signIn({username:admin.username,password}),DemoAuthenticationFailed
   );
   const [unprotected]=await e.pool.execute('SELECT COUNT(*) AS n FROM aff_demo_sessions WHERE account_id=?',[admin.accountId]);
   assert.equal(unprotected[0].n,0);
   const seed=await e.identity.enrollFixtureAdminMfa(admin.accountId);
   const [mfas]=await e.pool.execute('SELECT ciphertext,iv,tag,last_step FROM aff_demo_admin_mfa WHERE account_id=?',[admin.accountId]);
   assert.equal(mfas.length,1);
   assert.notEqual(mfas[0].ciphertext,seed.toString('hex'));
   assert.equal(JSON.stringify(mfas).includes(seed.toString('hex')),false);
   await assert.rejects(
     ()=>e.identity.signIn({username:admin.username,password}),DemoAuthenticationFailed
   );
   const otp=totpAt(seed,e.now()).code;
   const session=await e.identity.signIn({username:admin.username,password,totpCode:otp});
   assert.equal((await e.identity.readOrder(session.token,e.order.id)).id,e.order.id);
   // WebAuthn-style step-up is now mandatory for simulated admin refunds.
   await assert.rejects(()=>e.identity.refundOrder(session.token,e.order.id),DemoAuthenticationFailed);
   const [records]=await e.pool.execute('SELECT mfa_verified FROM aff_demo_sessions WHERE token_hash=?',
     [createHash('sha256').update(session.token).digest('hex')]);
   assert.equal(records.length,1);
   assert.equal(records[0].mfa_verified,1);
 }finally{await e.pool.end();}
});

test('MySQL real: TOTP usado no sirve para un segundo acceso y tampoco tras avanzar reloj',
 {skip:!enabled},async()=>{
 const e=await setup();
 try{
   const admin=await e.fixture('SIM_ADMIN');
   const seed=await e.identity.enrollFixtureAdminMfa(admin.accountId);
   const code=totpAt(seed,e.now()).code;
   const valid=await e.identity.signIn({username:admin.username,password,totpCode:code});
   assert.ok(valid.token);
   await assert.rejects(()=>e.identity.signIn({
     username:admin.username,password,totpCode:code
   }),DemoAuthenticationFailed);
   const [f]=await e.pool.execute('SELECT failed_attempts FROM aff_demo_accounts WHERE id=?',[admin.accountId]);
   assert.equal(f[0].failed_attempts,1);
   e.setNow(e.now()+30000);
   const second=await e.identity.signIn({
     username:admin.username,password,totpCode:totpAt(seed,e.now()).code
   });
   assert.notEqual(second.token,valid.token);
 }finally{await e.pool.end();}
});

test('MySQL real: sesiones de administrador falseadas sin MFA se rechazan',
 {skip:!enabled},async()=>{
 const e=await setup();
 try{
   const admin=await e.fixture('SIM_ADMIN');
   await e.identity.enrollFixtureAdminMfa(admin.accountId);
   const token=randomBytes(32).toString('base64url');
   await e.pool.execute(
     'INSERT INTO aff_demo_sessions(id,account_id,token_hash,expires_at_ms,revoked,mfa_verified) VALUES(?,?,?,?,0,0)',
     [randomUUID(),admin.accountId,createHash('sha256').update(token).digest('hex'),e.now()+60000]
   );
   await assert.rejects(()=>e.identity.authenticatedActor(token),DemoAuthenticationFailed);
 }finally{await e.pool.end();}
});

test('MySQL real: renovar segundo factor revoca sesiones previas y exige semilla nueva',
 {skip:!enabled},async()=>{
 const e=await setup();
 try{
   const admin=await e.fixture('SIM_ADMIN');
   const oldSeed=await e.identity.enrollFixtureAdminMfa(admin.accountId);
   const previous=await e.identity.signIn({
     username:admin.username,password,totpCode:totpAt(oldSeed,e.now()).code
   });
   const newSeed=await e.identity.enrollFixtureAdminMfa(admin.accountId);
   assert.notDeepEqual(newSeed,oldSeed);
   await assert.rejects(()=>e.identity.readOrder(previous.token,e.order.id),DemoAuthenticationFailed);
   const current=await e.identity.signIn({
     username:admin.username,password,totpCode:totpAt(newSeed,e.now()).code
   });
   assert.equal((await e.identity.readOrder(current.token,e.order.id)).id,e.order.id);
 }finally{await e.pool.end();}
});

test('MySQL real: MFA CI no habilita al afiliado a reembolsar y su sesión no requiere código admin',
 {skip:!enabled},async()=>{
 const e=await setup();
 try{
   const affiliate=await e.fixture('SIM_AFFILIATE',{affiliateId:e.affiliate.id});
   const session=await e.identity.signIn({username:affiliate.username,password});
   assert.equal((await e.identity.readOrder(session.token,e.order.id)).id,e.order.id);
   await assert.rejects(()=>e.identity.refundOrder(session.token,e.order.id),DemoAccessDenied);
   await assert.rejects(()=>e.identity.enrollFixtureAdminMfa(affiliate.accountId),DemoAuthenticationFailed);
 }finally{await e.pool.end();}
});


test('MySQL real: cinco OTP equivocados bloquean al admin hasta vencer el plazo',
 {skip:!enabled},async()=>{
 const e=await setup();
 try{
   const admin=await e.fixture('SIM_ADMIN');
   const seed=await e.identity.enrollFixtureAdminMfa(admin.accountId);
   const correct=totpAt(seed,e.now()).code;
   const wrong=correct==='000000'?'999999':'000000';
   for(let n=0;n<5;n++){
     await assert.rejects(
       ()=>e.identity.signIn({username:admin.username,password,totpCode:wrong}),
       DemoAuthenticationFailed
     );
   }
   const [accounts]=await e.pool.execute(
     'SELECT failed_attempts,locked_until_ms FROM aff_demo_accounts WHERE id=?',[admin.accountId]
   );
   assert.equal(accounts[0].failed_attempts,5);
   assert.ok(Number(accounts[0].locked_until_ms)>e.now());
   await assert.rejects(
     ()=>e.identity.signIn({username:admin.username,password,totpCode:correct}),
     DemoAuthenticationFailed
   );
   e.setNow(Number(accounts[0].locked_until_ms)+1);
   const fresh=await e.identity.signIn({
     username:admin.username,password,totpCode:totpAt(seed,e.now()).code
   });
   assert.ok(fresh.token);
 }finally{await e.pool.end();}
});

test('MySQL real: dos accesos simultáneos con el mismo TOTP no generan dos sesiones',
 {skip:!enabled},async()=>{
 const e=await setup();
 try{
   const admin=await e.fixture('SIM_ADMIN');
   const seed=await e.identity.enrollFixtureAdminMfa(admin.accountId);
   const totpCode=totpAt(seed,e.now()).code;
   const results=await Promise.allSettled([
     e.identity.signIn({username:admin.username,password,totpCode}),
     e.identity.signIn({username:admin.username,password,totpCode})
   ]);
   assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
   assert.equal(results.filter(r=>r.status==='rejected'&&r.reason instanceof DemoAuthenticationFailed).length,1);
   const [sessions]=await e.pool.execute(
     'SELECT COUNT(*) AS n FROM aff_demo_sessions WHERE account_id=?',[admin.accountId]
   );
   assert.equal(sessions[0].n,1);
 }finally{await e.pool.end();}
});
