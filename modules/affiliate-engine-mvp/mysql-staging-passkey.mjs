/**
 * ARC Affiliate 1.1 CI-ONLY WebAuthn-style admin step-up.
 * NO browser ceremony, no HTTP routes, no registration attestation, no real users.
 * Fixture public keys only; private keys exist solely in the test harness.
 */
import {createHash,createPublicKey,randomBytes} from 'node:crypto';
import {getStagingPoolOptions} from './mysql-staging-adapter.mjs';
import {
  PASSKEY_RP_ID,PASSKEY_ORIGIN,DemoPasskeyRejected,verifyFixtureWebAuthnAssertion
} from './mysql-staging-passkey-verify.mjs';

const sha=(value)=>createHash('sha256').update(value).digest('hex');
const tokenRe=/^[A-Za-z0-9_-]{43}$/;
const uuidRe=/^[a-f0-9-]{36}$/;
const CHALLENGE_MS=120000;

export const passkeyDDL=Object.freeze([
  "CREATE TABLE IF NOT EXISTS aff_demo_passkeys ("+
    "account_id CHAR(36) PRIMARY KEY,credential_id CHAR(43) UNIQUE NOT NULL,"+
    "public_key_spki VARBINARY(160) NOT NULL,sign_counter INT UNSIGNED NOT NULL DEFAULT 0,"+
    "FOREIGN KEY(account_id) REFERENCES aff_demo_accounts(id)) ENGINE=InnoDB",
  "CREATE TABLE IF NOT EXISTS aff_demo_passkey_challenges ("+
    "session_id CHAR(36) PRIMARY KEY,challenge_hash CHAR(64) NOT NULL,"+
    "expires_at_ms BIGINT UNSIGNED NOT NULL,used BOOLEAN NOT NULL DEFAULT FALSE,"+
    "FOREIGN KEY(session_id) REFERENCES aff_demo_sessions(id)) ENGINE=InnoDB"
]);

function tokenHash(token){
  if(typeof token!=='string'||!tokenRe.test(token))throw new DemoPasskeyRejected();
  return sha(Buffer.from(token,'utf8'));
}
function publicKeyInput(spki){
  if(!Buffer.isBuffer(spki)||spki.length<70||spki.length>160)throw new DemoPasskeyRejected();
  try{
    const key=createPublicKey({key:spki,format:'der',type:'spki'});
    if(key.asymmetricKeyType!=='ec'||key.asymmetricKeyDetails?.namedCurve!=='prime256v1')
      throw new DemoPasskeyRejected();
  }catch{throw new DemoPasskeyRejected();}
  return spki;
}

export class MysqlStagingPasskey {
  constructor(pool,identity,env=process.env){
    getStagingPoolOptions(env);
    if(env.ARC_AFF_MYSQL_CI_TEST!=='1'||env.ARC_AFF_STAGING_SCHEMA_TEST!=='1'||
       !pool||typeof pool.getConnection!=='function'||
       !identity||typeof identity.authenticatedActor!=='function'){
      throw new Error('Passkey demo bloqueado fuera de CI');
    }
    this.pool=pool;
    this.identity=identity;
  }

  async initializeSchema(){
    for(const ddl of passkeyDDL)await this.pool.query(ddl);
  }

  async enrollFixturePasskey({accountId,credentialId,publicKeySpki}){
    if(typeof accountId!=='string'||!uuidRe.test(accountId)||
       typeof credentialId!=='string'||!tokenRe.test(credentialId)){
      throw new DemoPasskeyRejected();
    }
    publicKeyInput(publicKeySpki);
    const conn=await this.pool.getConnection();
    let active=false;
    try{
      await conn.beginTransaction();active=true;
      const [rows]=await conn.execute(
        "SELECT a.id FROM aff_demo_accounts a "+
        "JOIN aff_demo_principals p ON p.id=a.principal_id "+
        "JOIN aff_demo_admin_mfa m ON m.account_id=a.id "+
        "WHERE a.id=? AND a.enabled=1 AND p.enabled=1 AND p.role='SIM_ADMIN' FOR UPDATE",
        [accountId]
      );
      if(rows.length!==1)throw new DemoPasskeyRejected();
      await conn.execute(
        "INSERT INTO aff_demo_passkeys(account_id,credential_id,public_key_spki,sign_counter) "+
        "VALUES(?,?,?,0)",[accountId,credentialId,publicKeySpki]
      );
      await conn.execute('UPDATE aff_demo_sessions SET revoked=1 WHERE account_id=?',[accountId]);
      await conn.commit();active=false;
    }catch(error){if(active)await conn.rollback();throw error;}
    finally{conn.release();}
    return Object.freeze({credentialId,registeredFor:'SIM_ADMIN_CI_ONLY'});
  }

  async beginChallenge(sessionToken){
    const tokenH=tokenHash(sessionToken);
    await this.identity.authenticatedActor(sessionToken);
    const [rows]=await this.pool.execute(
      "SELECT s.id AS session_id,k.credential_id "+
      "FROM aff_demo_sessions s JOIN aff_demo_accounts a ON a.id=s.account_id "+
      "JOIN aff_demo_principals p ON p.id=a.principal_id "+
      "JOIN aff_demo_passkeys k ON k.account_id=a.id "+
      "WHERE s.token_hash=? AND s.revoked=0 AND s.expires_at_ms>? "+
      "AND a.enabled=1 AND p.enabled=1 AND p.role='SIM_ADMIN' AND s.mfa_verified=1",
      [tokenH,this.identity.now()]
    );
    if(rows.length!==1)throw new DemoPasskeyRejected();
    const challenge=randomBytes(32).toString('base64url');
    await this.pool.execute(
      "INSERT INTO aff_demo_passkey_challenges(session_id,challenge_hash,expires_at_ms,used) "+
      "VALUES(?,?,?,0) ON DUPLICATE KEY UPDATE "+
      "challenge_hash=VALUES(challenge_hash),expires_at_ms=VALUES(expires_at_ms),used=0",
      [rows[0].session_id,sha(challenge),this.identity.now()+CHALLENGE_MS]
    );
    return Object.freeze({
      challenge,credentialId:rows[0].credential_id,
      rpId:PASSKEY_RP_ID,origin:PASSKEY_ORIGIN,
      userVerification:'required',expiresInMs:CHALLENGE_MS
    });
  }

  async finishChallenge(sessionToken,response){
    const tokenH=tokenHash(sessionToken);
    await this.identity.authenticatedActor(sessionToken);
    const conn=await this.pool.getConnection();
    let active=false,accepted=false;
    try{
      await conn.beginTransaction();active=true;
      const [sessions]=await conn.execute(
        "SELECT s.id AS session_id,s.account_id "+
        "FROM aff_demo_sessions s JOIN aff_demo_accounts a ON a.id=s.account_id "+
        "JOIN aff_demo_principals p ON p.id=a.principal_id "+
        "WHERE s.token_hash=? AND s.revoked=0 AND s.expires_at_ms>? "+
        "AND a.enabled=1 AND p.enabled=1 AND p.role='SIM_ADMIN' AND s.mfa_verified=1 FOR UPDATE",
        [tokenH,this.identity.now()]
      );
      if(sessions.length!==1)throw new DemoPasskeyRejected();
      const session=sessions[0];
      const [challenges]=await conn.execute(
        'SELECT challenge_hash,expires_at_ms,used FROM aff_demo_passkey_challenges WHERE session_id=? FOR UPDATE',
        [session.session_id]
      );
      const [credentials]=await conn.execute(
        'SELECT credential_id,public_key_spki,sign_counter FROM aff_demo_passkeys WHERE account_id=? FOR UPDATE',
        [session.account_id]
      );
      const challenge=challenges[0],cred=credentials[0];
      let nextCounter=null;
      if(challenge&&!challenge.used&&Number(challenge.expires_at_ms)>this.identity.now()&&cred){
        try{
          if(!response||typeof response.challenge!=='string'||
             !tokenRe.test(response.challenge)||sha(response.challenge)!==challenge.challenge_hash){
            throw new DemoPasskeyRejected();
          }
          const verified=verifyFixtureWebAuthnAssertion({
            ...response,expectedCredentialId:cred.credential_id,
            publicKeySpki:cred.public_key_spki,previousCounter:Number(cred.sign_counter)
          });
          accepted=true;nextCounter=verified.counter;
        }catch{accepted=false;}
      }
      // Consume challenge even on bad signature to avoid unlimited offline-style retry.
      if(challenge)await conn.execute(
        'UPDATE aff_demo_passkey_challenges SET used=1 WHERE session_id=?',
        [session.session_id]
      );
      if(accepted){
        await conn.execute('UPDATE aff_demo_passkeys SET sign_counter=? WHERE account_id=?',
          [nextCounter,session.account_id]);
        await conn.execute('UPDATE aff_demo_sessions SET webauthn_verified=1 WHERE id=?',
          [session.session_id]);
      }
      await conn.commit();active=false;
    }catch(error){if(active)await conn.rollback();throw error;}
    finally{conn.release();}
    if(!accepted)throw new DemoPasskeyRejected();
    return Object.freeze({verified:true,scope:'SIM_ADMIN_STEP_UP',paymentsEnabled:false});
  }
}
