import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {createStagingPool} from './mysql-staging-adapter.mjs';
import {MysqlStagingDemoStore} from './mysql-staging-store.mjs';
import {MysqlDemoRoleGate} from './mysql-staging-access.mjs';
import {MysqlStagingIdentity,DemoAuthenticationFailed} from './mysql-staging-identity.mjs';
import {totpAt} from './mysql-staging-mfa.mjs';
import {MysqlStagingPasskey} from './mysql-staging-passkey.mjs';
import {fixturePasskey,fixtureAssertion} from './mysql-staging-passkey.fixture.mjs';
import {DemoPasskeyRejected} from './mysql-staging-passkey-verify.mjs';

const enabled=process.env.ARC_AFF_MYSQL_CI_TEST==='1' &&
  process.env.ARC_AFF_STAGING_SCHEMA_TEST==='1';
const password='NOT-A-REAL-PASSWORD-PASSKEY-CI-2026';
const username=()=> 'sim_passkey_'+randomUUID().replaceAll('-','').slice(0,16);

async function setup(){
 const pool=await createStagingPool(process.env);
 try{
  const store=new MysqlStagingDemoStore(pool,process.env);
  await store.initializeSchema();
  const roles=new MysqlDemoRoleGate(pool,store,process.env);
  await roles.initializeSchema();
  let now=Date.now();
  const identity=new MysqlStagingIdentity(pool,roles,process.env,()=>now,randomBytes(32));
  await identity.initializeSchema();
  const passkey=new MysqlStagingPasskey(pool,identity,process.env);
  await passkey.initializeSchema();
  const product=await store.product({title:'Passkey simulated product',priceCop:100000,commissionPct:30});
  const affiliate=await store.affiliate({alias:'Passkey simulated affiliate'});
  const referral=await store.referral({productId:product.id,affiliateId:affiliate.id});
  const order=await store.simulatedOrder({referralId:referral.id,requestId:'passkey-'+randomUUID()});
  const principalId=await roles.createFixture({role:'SIM_ADMIN'});
  const accountId=await identity.createFixtureAccount({principalId,username:username(),password});
  const [accounts]=await pool.execute('SELECT username FROM aff_demo_accounts WHERE id=?',[accountId]);
  const seed=await identity.enrollFixtureAdminMfa(accountId);
  const fixture=fixturePasskey();
  await passkey.enrollFixturePasskey({
    accountId,credentialId:fixture.credentialId,publicKeySpki:fixture.publicKeySpki
  });
  const login=()=>identity.signIn({
    username:accounts[0].username,password,totpCode:totpAt(seed,now).code
  });
  return {pool,store,roles,identity,passkey,fixture,order,accountId,seed,
    login,now:()=>now,setNow:n=>{now=n;}};
 }catch(error){await pool.end();throw error;}
}
test('MySQL real: refund admin denegado sin desafío firmado, aprobado tras verificar clave',
 {skip:!enabled},async()=>{
 const e=await setup();
 try{
  const session=await e.login();
  await assert.rejects(()=>e.identity.refundOrder(session.token,e.order.id),DemoAuthenticationFailed);
  const ch=await e.passkey.beginChallenge(session.token);
  assert.equal(ch.userVerification,'required');
  assert.equal(ch.expiresInMs,120000);
  const response=fixtureAssertion(e.fixture,ch.challenge,{counter:1});
  assert.deepEqual(await e.passkey.finishChallenge(session.token,{
    ...response,challenge:ch.challenge
  }),{verified:true,scope:'SIM_ADMIN_STEP_UP',paymentsEnabled:false});
  const [challengeRows]=await e.pool.execute(
    'SELECT challenge_hash,used FROM aff_demo_passkey_challenges WHERE session_id IN (SELECT id FROM aff_demo_sessions WHERE token_hash=?)',
    [createHash('sha256').update(session.token).digest('hex')]
  );
  assert.equal(challengeRows[0].used,1);
  assert.equal(challengeRows[0].challenge_hash,createHash('sha256').update(ch.challenge).digest('hex'));
  assert.equal((await e.identity.refundOrder(session.token,e.order.id)).status,'SIM_REFUNDED');
  assert.equal((await e.store.reconcile()).ok,true);
 }finally{await e.pool.end();}
});

test('MySQL real: origen falso consume desafío y no habilita reembolso',
 {skip:!enabled},async()=>{
 const e=await setup();
 try{
  const session=await e.login();
  const ch=await e.passkey.beginChallenge(session.token);
  const response=fixtureAssertion(e.fixture,ch.challenge,{
    origin:'https://phishing.example.test',counter:1
  });
  await assert.rejects(()=>e.passkey.finishChallenge(session.token,{
    ...response,challenge:ch.challenge
  }),DemoPasskeyRejected);
  await assert.rejects(()=>e.identity.refundOrder(session.token,e.order.id),DemoAuthenticationFailed);
  const real=fixtureAssertion(e.fixture,ch.challenge,{counter:1});
  await assert.rejects(()=>e.passkey.finishChallenge(session.token,{
    ...real,challenge:ch.challenge
  }),DemoPasskeyRejected);
  const next=await e.passkey.beginChallenge(session.token);
  await e.passkey.finishChallenge(session.token,{
    ...fixtureAssertion(e.fixture,next.challenge,{counter:1}),challenge:next.challenge
  });
  assert.equal((await e.identity.refundOrder(session.token,e.order.id)).status,'SIM_REFUNDED');
 }finally{await e.pool.end();}
});

test('MySQL real: desafío caducado, UV ausente y contador usado no se aceptan',
 {skip:!enabled},async()=>{
 const e=await setup();
 try{
  const session=await e.login();
  const expired=await e.passkey.beginChallenge(session.token);
  e.setNow(e.now()+120001); // session still active for 15 min
  await assert.rejects(()=>e.passkey.finishChallenge(session.token,{
    ...fixtureAssertion(e.fixture,expired.challenge,{counter:1}),
    challenge:expired.challenge
  }),DemoPasskeyRejected);
  const ch=await e.passkey.beginChallenge(session.token);
  await assert.rejects(()=>e.passkey.finishChallenge(session.token,{
    ...fixtureAssertion(e.fixture,ch.challenge,{counter:1,flags:0x01}),
    challenge:ch.challenge
  }),DemoPasskeyRejected);
  const fresh=await e.passkey.beginChallenge(session.token);
  await e.passkey.finishChallenge(session.token,{
    ...fixtureAssertion(e.fixture,fresh.challenge,{counter:1}),
    challenge:fresh.challenge
  });
  const reused=await e.passkey.beginChallenge(session.token);
  await assert.rejects(()=>e.passkey.finishChallenge(session.token,{
    ...fixtureAssertion(e.fixture,reused.challenge,{counter:1}),
    challenge:reused.challenge
  }),DemoPasskeyRejected);
 }finally{await e.pool.end();}
});

test('MySQL real: dos aserciones concurrentes para el mismo desafío aceptan solo una',
 {skip:!enabled},async()=>{
 const e=await setup();
 try{
  const session=await e.login();
  const ch=await e.passkey.beginChallenge(session.token);
  const response={
    ...fixtureAssertion(e.fixture,ch.challenge,{counter:1}),challenge:ch.challenge
  };
  const results=await Promise.allSettled([
    e.passkey.finishChallenge(session.token,response),
    e.passkey.finishChallenge(session.token,response)
  ]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.filter(r=>r.status==='rejected'&&r.reason instanceof DemoPasskeyRejected).length,1);
  const [rows]=await e.pool.execute('SELECT sign_counter FROM aff_demo_passkeys WHERE account_id=?',
    [e.accountId]);
  assert.equal(rows[0].sign_counter,1);
 }finally{await e.pool.end();}
});
