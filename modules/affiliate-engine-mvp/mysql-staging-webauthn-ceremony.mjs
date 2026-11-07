/**
 * ARC Affiliate 1.2 - SimpleWebAuthn-based CI-only server ceremonies.
 *
 * Scope: isolated staging MySQL, fictional administrators and localhost RP.
 * No HTTP server, no real user/device enrollment, no public registration.
 * Never import this module into the ARNOLRC R4 process.
 *
 * A real RP also needs TLS/secure cookies, CSRF, audit, rate limits,
 * WebAuthn recovery, user-consent UX and security reviews.
 */
import {getStagingPoolOptions} from './mysql-staging-adapter.mjs';
import {DemoAuthenticationFailed} from './mysql-staging-identity.mjs';
import {randomUUID} from 'node:crypto';

export const RP_ID='localhost';
export const RP_ORIGIN='http://localhost:3198';
export const CEREMONY_TTL_MS=120000;

export const ceremonyDDL=Object.freeze([
  "CREATE TABLE IF NOT EXISTS aff_demo_wa_credentials ("+
    "id VARCHAR(512) PRIMARY KEY,account_id CHAR(36) NOT NULL,"+
    "public_key VARBINARY(2048) NOT NULL,sign_counter INT UNSIGNED NOT NULL,"+
    "transports_json VARCHAR(512) NOT NULL DEFAULT '[]',"+
    "created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,"+
    "FOREIGN KEY(account_id) REFERENCES aff_demo_accounts(id)) ENGINE=InnoDB",
  "CREATE TABLE IF NOT EXISTS aff_demo_wa_pending ("+
    "session_id CHAR(36) PRIMARY KEY,account_id CHAR(36) NOT NULL,"+
    "purpose ENUM('REGISTER','AUTHENTICATE') NOT NULL,"+
    "challenge VARCHAR(512) NOT NULL,expires_ms BIGINT UNSIGNED NOT NULL,"+
    "used BOOLEAN NOT NULL DEFAULT FALSE,"+
    "FOREIGN KEY(session_id) REFERENCES aff_demo_sessions(id),"+
    "FOREIGN KEY(account_id) REFERENCES aff_demo_accounts(id)) ENGINE=InnoDB"
]);

export class DemoCeremonyRejected extends Error{
  constructor(){super('Ceremonia WebAuthn de laboratorio no autorizada');this.name='DemoCeremonyRejected';}
}

function uuidBytes(uuid){
  if(typeof uuid!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uuid)){
    throw new DemoCeremonyRejected();
  }
  return Buffer.from(uuid.replaceAll('-',''),'hex');
}
function assertLibrary(lib){
  for(const method of ['generateRegistrationOptions','verifyRegistrationResponse',
    'generateAuthenticationOptions','verifyAuthenticationResponse']){
    if(typeof lib?.[method]!=='function')throw new Error('Biblioteca SimpleWebAuthn inválida');
  }
  return lib;
}
function validResponse(response){
  if(!response||typeof response!=='object'||Array.isArray(response)||
    typeof response.id!=='string'||response.id.length>512||response.id.length<1){
    throw new DemoCeremonyRejected();
  }
}
const reject=()=>new DemoCeremonyRejected();

export class MysqlStagingWebAuthnCeremony{
  constructor(pool,identity,env=process.env,lib=null){
    getStagingPoolOptions(env);
    if(env.ARC_AFF_MYSQL_CI_TEST!=='1'||env.ARC_AFF_STAGING_SCHEMA_TEST!=='1'||
      !pool||typeof pool.getConnection!=='function'||typeof pool.query!=='function'||
      !identity||typeof identity.authenticatedActor!=='function'){
      throw new Error('WebAuthn de laboratorio bloqueado fuera del CI aislado');
    }
    this.pool=pool;
    this.identity=identity;
    this.library=lib ? assertLibrary(lib):null;
  }
  async lib(){
    if(!this.library){
      this.library=assertLibrary(await import('@simplewebauthn/server'));
    }
    return this.library;
  }
  async initializeSchema(){
    for(const sql of ceremonyDDL)await this.pool.query(sql);
  }
  async accountFromVerifiedSession(sessionToken,conn=this.pool){
    const actor=await this.identity.authenticatedActor(sessionToken);
    const [rows]=await conn.execute(
      "SELECT s.id AS session_id,s.account_id,a.username,s.webauthn_verified "+
      "FROM aff_demo_sessions s JOIN aff_demo_accounts a ON a.id=s.account_id "+
      "JOIN aff_demo_principals p ON p.id=a.principal_id "+
      "WHERE p.id=? AND p.role='SIM_ADMIN' AND p.enabled=1 "+
      "AND s.token_hash=SHA2(?,256) AND s.revoked=0 AND s.expires_at_ms>? "+
      "AND s.mfa_verified=1 AND a.enabled=1",
      [actor,sessionToken,this.identity.now()]
    );
    if(rows.length!==1)throw reject();
    return rows[0];
  }
  async startRegistration(sessionToken){
    const account=await this.accountFromVerifiedSession(sessionToken);
    const [prior]=await this.pool.execute(
      'SELECT COUNT(*) AS total FROM aff_demo_wa_credentials WHERE account_id=?',
      [account.account_id]
    );
    // Once there is a passkey, an existing passkey-confirmed session is
    // required to add another; a stolen TOTP-only session cannot replace it.
    if(Number(prior[0].total)>0&&!account.webauthn_verified)throw reject();
    const lib=await this.lib();
    const opts=await lib.generateRegistrationOptions({
      rpName:'ARC Affiliate CI (sin usuarios reales)',
      rpID:RP_ID,
      userID:uuidBytes(account.account_id),
      userName:account.username,
      userDisplayName:account.username,
      attestationType:'none',
      authenticatorSelection:{residentKey:'preferred',userVerification:'required'},
      supportedAlgorithmIDs:[-7],
      timeout:CEREMONY_TTL_MS
    });
    if(typeof opts?.challenge!=='string'||!opts.challenge)throw reject();
    await this.pool.execute(
      "INSERT INTO aff_demo_wa_pending(session_id,account_id,purpose,challenge,expires_ms,used) "+
      "VALUES(?,?,'REGISTER',?,?,0) ON DUPLICATE KEY UPDATE "+
      "account_id=VALUES(account_id),purpose='REGISTER',challenge=VALUES(challenge),"+
      "expires_ms=VALUES(expires_ms),used=0",
      [account.session_id,account.account_id,opts.challenge,this.identity.now()+CEREMONY_TTL_MS]
    );
    return opts;
  }
  async startAuthentication(sessionToken){
    const account=await this.accountFromVerifiedSession(sessionToken);
    const [credentials]=await this.pool.execute(
      'SELECT id,transports_json FROM aff_demo_wa_credentials WHERE account_id=?',
      [account.account_id]
    );
    if(credentials.length===0)throw reject();
    const lib=await this.lib();
    const opts=await lib.generateAuthenticationOptions({
      rpID:RP_ID,userVerification:'required',timeout:CEREMONY_TTL_MS,
      allowCredentials:credentials.map(c=>({
        id:c.id,transports:JSON.parse(c.transports_json)
      }))
    });
    if(typeof opts?.challenge!=='string'||!opts.challenge)throw reject();
    await this.pool.execute(
      "INSERT INTO aff_demo_wa_pending(session_id,account_id,purpose,challenge,expires_ms,used) "+
      "VALUES(?,?,'AUTHENTICATE',?,?,0) ON DUPLICATE KEY UPDATE "+
      "account_id=VALUES(account_id),purpose='AUTHENTICATE',challenge=VALUES(challenge),"+
      "expires_ms=VALUES(expires_ms),used=0",
      [account.session_id,account.account_id,opts.challenge,this.identity.now()+CEREMONY_TTL_MS]
    );
    return opts;
  }
  async finishRegistration(sessionToken,response){
    validResponse(response);
    return this.finish(sessionToken,response,'REGISTER');
  }
  async finishAuthentication(sessionToken,response){
    validResponse(response);
    return this.finish(sessionToken,response,'AUTHENTICATE');
  }
  async finish(sessionToken,response,purpose){
    // This uses an InnoDB row lock to prevent simultaneous assertion replay.
    const account=await this.accountFromVerifiedSession(sessionToken);
    const conn=await this.pool.getConnection();
    let active=false, accepted=false, result=null;
    try{
      await conn.beginTransaction();active=true;
      const [rows]=await conn.execute(
        'SELECT purpose,challenge,expires_ms,used,account_id FROM aff_demo_wa_pending WHERE session_id=? FOR UPDATE',
        [account.session_id]
      );
      const row=rows[0];
      if(!row||row.used||row.purpose!==purpose||row.account_id!==account.account_id||
         Number(row.expires_ms)<=this.identity.now())throw reject();
      // Challenge is spent EVEN when verification is rejected.
      await conn.execute('UPDATE aff_demo_wa_pending SET used=1 WHERE session_id=?',[account.session_id]);
      const lib=await this.lib();
      if(purpose==='REGISTER'){
        let verified=null;
        try{
          verified=await lib.verifyRegistrationResponse({
            response,expectedChallenge:row.challenge,expectedOrigin:RP_ORIGIN,
            expectedRPID:RP_ID,requireUserVerification:true
          });
        }catch{verified=null;}
        const credential=verified?.registrationInfo?.credential;
        if(verified?.verified&&credential?.id&&credential?.publicKey instanceof Uint8Array){
          const [prior]=await conn.execute(
            'SELECT id FROM aff_demo_wa_credentials WHERE id=?',[credential.id]
          );
          if(prior.length===0){
            await conn.execute(
              'INSERT INTO aff_demo_wa_credentials(id,account_id,public_key,sign_counter,transports_json) VALUES(?,?,?,?,?)',
              [credential.id,account.account_id,Buffer.from(credential.publicKey),
                credential.counter||0,JSON.stringify(credential.transports||[])]
            );
            // Enrolling another credential invalidates assurance of the old
            // session, and revokes all OTHER sessions for the account.
            await conn.execute(
              'UPDATE aff_demo_sessions SET revoked=1 WHERE account_id=? AND id<>?',
              [account.account_id,account.session_id]
            );
            await conn.execute(
              'UPDATE aff_demo_sessions SET webauthn_verified=0 WHERE id=?',
              [account.session_id]
            );
            accepted=true;
            result={verified:true,kind:'REGISTRATION_CI_ONLY',credentialId:credential.id};
          }
        }
      }else{
        const [creds]=await conn.execute(
          'SELECT id,public_key,sign_counter,transports_json FROM aff_demo_wa_credentials WHERE account_id=? AND id=? FOR UPDATE',
          [account.account_id,response.id]
        );
        if(creds.length===1){
          const saved=creds[0];
          let verified=null;
          try{
            verified=await lib.verifyAuthenticationResponse({
              response,expectedChallenge:row.challenge,expectedOrigin:RP_ORIGIN,
              expectedRPID:RP_ID,requireUserVerification:true,
              credential:{id:saved.id,publicKey:new Uint8Array(saved.public_key),
                counter:saved.sign_counter,transports:JSON.parse(saved.transports_json)}
            });
          }catch{verified=null;}
          if(verified?.verified&&Number.isSafeInteger(verified.authenticationInfo?.newCounter)){
            await conn.execute('UPDATE aff_demo_wa_credentials SET sign_counter=? WHERE id=?',
              [verified.authenticationInfo.newCounter,saved.id]);
            await conn.execute('UPDATE aff_demo_sessions SET webauthn_verified=1 WHERE id=?',
              [account.session_id]);
            accepted=true;
            result={verified:true,kind:'AUTHENTICATION_CI_ONLY'};
          }
        }
      }
      await conn.commit();active=false;
    }catch(error){
      if(active)await conn.rollback();
      throw error instanceof DemoCeremonyRejected?error:reject();
    }finally{conn.release();}
    if(!accepted)throw reject();
    return Object.freeze(result);
  }
}
