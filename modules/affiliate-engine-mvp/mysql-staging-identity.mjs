/**
 * ARC Affiliate 0.9 — CI-ONLY credential/session prototype.
 * No HTTP endpoints, no cookies, no real customer accounts and no deployment.
 * Uses its OWN ephemeral MySQL staging schema; never imports ARNOLRC R4.
 * Production still requires MFA, IP/device controls, audits, CSRF, TLS and review.
 */
import {randomUUID,randomBytes,createHash,timingSafeEqual,scrypt as scryptCallback} from 'node:crypto';
import {promisify} from 'node:util';
import {getStagingPoolOptions} from './mysql-staging-adapter.mjs';
import {DemoAccessDenied} from './mysql-staging-access.mjs';

const derive=promisify(scryptCallback);
const SESSION_MS=15*60*1000;
const MAX_FAILURES=5;
const LOCK_MS=15*60*1000;
const DUMMY_SALT='00112233445566778899aabbccddeeff';
const DUMMY_DIGEST=Buffer.alloc(32);
const USERNAME_RE=/^sim_[a-z0-9_]{3,44}$/;
const UUID_RE=/^[a-f0-9-]{36}$/;
const TOKEN_RE=/^[A-Za-z0-9_-]{43}$/;

export class DemoAuthenticationFailed extends Error{
  constructor(){super('Credenciales o sesión de prueba inválidas');this.name='DemoAuthenticationFailed';}
}
export const identityDDL=Object.freeze([
  "CREATE TABLE IF NOT EXISTS aff_demo_accounts ("+
   "id CHAR(36) PRIMARY KEY,principal_id CHAR(36) NOT NULL UNIQUE,"+
   "username VARCHAR(48) NOT NULL UNIQUE,"+
   "pwd_salt CHAR(32) NOT NULL,pwd_digest CHAR(64) NOT NULL,"+
   "enabled BOOLEAN NOT NULL DEFAULT TRUE,failed_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,"+
   "locked_until_ms BIGINT UNSIGNED NOT NULL DEFAULT 0,"+
   "FOREIGN KEY(principal_id) REFERENCES aff_demo_principals(id)) ENGINE=InnoDB",
  "CREATE TABLE IF NOT EXISTS aff_demo_sessions ("+
   "id CHAR(36) PRIMARY KEY,account_id CHAR(36) NOT NULL,"+
   "token_hash CHAR(64) NOT NULL UNIQUE,"+
   "expires_at_ms BIGINT UNSIGNED NOT NULL,revoked BOOLEAN NOT NULL DEFAULT FALSE,"+
   "FOREIGN KEY(account_id) REFERENCES aff_demo_accounts(id),"+
   "INDEX idx_demo_expiry(expires_at_ms)) ENGINE=InnoDB"
]);
function passwordValid(password){
  return typeof password==='string'&&password.length>=12&&password.length<=128
    &&Buffer.byteLength(password,'utf8')<=512;
}
function passwordInput(password){
  if(!passwordValid(password))throw new DemoAuthenticationFailed();
  return password;
}
function usernameInput(username){
  if(typeof username!=='string'||!USERNAME_RE.test(username))throw new DemoAuthenticationFailed();
  return username;
}
function sessionInput(token){
  if(typeof token!=='string'||!TOKEN_RE.test(token))throw new DemoAuthenticationFailed();
  return token;
}
function hashSession(token){
  return createHash('sha256').update(sessionInput(token),'utf8').digest('hex');
}
async function passwordDigest(password,salt){
  return (await derive(password,Buffer.from(salt,'hex'),32,{
    N:16384,r:8,p:1,maxmem:32*1024*1024
  })).toString('hex');
}
export async function hashFixturePassword(password){
  passwordInput(password);
  const salt=randomBytes(16).toString('hex');
  return Object.freeze({salt,digest:await passwordDigest(password,salt)});
}
export async function compareFixturePassword(password,salt,digest){
  if(!passwordValid(password)||typeof salt!=='string'||!/^[a-f0-9]{32}$/.test(salt)
     ||typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))return false;
  const actual=Buffer.from(await passwordDigest(password,salt),'hex');
  return timingSafeEqual(actual,Buffer.from(digest,'hex'));
}

export class MysqlStagingIdentity {
  constructor(pool,roleGate,env=process.env,now=()=>Date.now()){
    getStagingPoolOptions(env);
    if(env.ARC_AFF_MYSQL_CI_TEST!=='1'||env.ARC_AFF_STAGING_SCHEMA_TEST!=='1'){
      throw new Error('Identidad simulada solo disponible en CI');
    }
    if(!pool||typeof pool.getConnection!=='function'||!roleGate
        ||typeof roleGate.readOrder!=='function'||typeof now!=='function'){
      throw new Error('Dependencias de identidad no válidas');
    }
    this.pool=pool;
    this.roles=roleGate;
    this.now=now;
  }
  async initializeSchema(){
    for(const statement of identityDDL)await this.pool.query(statement);
  }
  async createFixtureAccount({principalId,username,password}){
    if(typeof principalId!=='string'||!UUID_RE.test(principalId))throw new DemoAuthenticationFailed();
    usernameInput(username);passwordInput(password);
    const actor=await this.roles.principal(principalId);
    if(!actor||!actor.enabled||!this.roles.validScope(actor))throw new DemoAuthenticationFailed();
    const {salt,digest}=await hashFixturePassword(password);
    const accountId=randomUUID();
    await this.pool.execute(
      'INSERT INTO aff_demo_accounts(id,principal_id,username,pwd_salt,pwd_digest) VALUES(?,?,?,?,?)',
      [accountId,principalId,username,salt,digest]
    );
    return accountId;
  }
  async signIn({username,password}){
    usernameInput(username);passwordInput(password);
    const connection=await this.pool.getConnection();
    let active=false;
    let failure=false;
    let result=null;
    try{
      await connection.beginTransaction();active=true;
      const [accounts]=await connection.execute(
        "SELECT a.id,a.pwd_salt,a.pwd_digest,a.failed_attempts,a.locked_until_ms,"+
        "a.enabled AS account_enabled,p.enabled AS principal_enabled "+
        "FROM aff_demo_accounts a JOIN aff_demo_principals p ON p.id=a.principal_id "+
        "WHERE a.username=? FOR UPDATE",[username]
      );
      const a=accounts[0]||null;
      // Perform password derivation even if account does not exist.
      const candidate=await passwordDigest(password,a?.pwd_salt||DUMMY_SALT);
      const saved=a?Buffer.from(a.pwd_digest,'hex'):DUMMY_DIGEST;
      const valid=timingSafeEqual(Buffer.from(candidate,'hex'),saved);
      const now=this.now();
      if(!a||!a.account_enabled||!a.principal_enabled||a.locked_until_ms>now||!valid){
        if(a&&a.account_enabled&&a.principal_enabled&&a.locked_until_ms<=now&&!valid){
          const failures=Math.min(5,Number(a.failed_attempts)+1);
          await connection.execute(
            'UPDATE aff_demo_accounts SET failed_attempts=?,locked_until_ms=? WHERE id=?',
            [failures,failures>=MAX_FAILURES?now+LOCK_MS:0,a.id]
          );
        }
        failure=true;
      }else{
        const token=randomBytes(32).toString('base64url');
        const expiresAtMs=now+SESSION_MS;
        await connection.execute('UPDATE aff_demo_accounts SET failed_attempts=0,locked_until_ms=0 WHERE id=?',[a.id]);
        await connection.execute(
          'INSERT INTO aff_demo_sessions(id,account_id,token_hash,expires_at_ms,revoked) VALUES(?,?,?,?,0)',
          [randomUUID(),a.id,hashSession(token),expiresAtMs]
        );
        result=Object.freeze({token,expiresAtMs});
      }
      await connection.commit();active=false;
    }catch(err){
      if(active)await connection.rollback();
      throw err;
    }finally{connection.release();}
    if(failure)throw new DemoAuthenticationFailed();
    return result;
  }
  async authenticatedActor(token){
    const hash=hashSession(token);
    const [rows]=await this.pool.execute(
      "SELECT a.principal_id FROM aff_demo_sessions s "+
      "JOIN aff_demo_accounts a ON a.id=s.account_id "+
      "JOIN aff_demo_principals p ON p.id=a.principal_id "+
      "WHERE s.token_hash=? AND s.revoked=0 AND s.expires_at_ms>? "+
      "AND a.enabled=1 AND p.enabled=1",
      [hash,this.now()]
    );
    if(rows.length!==1)throw new DemoAuthenticationFailed();
    return rows[0].principal_id;
  }
  async readOrder(token,orderId){
    const actorId=await this.authenticatedActor(token);
    return this.roles.readOrder(actorId,orderId);
  }
  async refundOrder(token,orderId){
    const actorId=await this.authenticatedActor(token);
    return this.roles.refundOrder(actorId,orderId);
  }
  async signOut(token){
    const hash=hashSession(token);
    await this.pool.execute('UPDATE aff_demo_sessions SET revoked=1 WHERE token_hash=?',[hash]);
    return true;
  }
  async disableAccount(accountId){
    if(typeof accountId!=='string'||!UUID_RE.test(accountId))throw new DemoAccessDenied();
    // Admin-only fixture setup operation; not exposed through session API.
    const connection=await this.pool.getConnection();
    let active=false;
    try{
      await connection.beginTransaction();active=true;
      await connection.execute('UPDATE aff_demo_accounts SET enabled=0 WHERE id=?',[accountId]);
      await connection.execute('UPDATE aff_demo_sessions SET revoked=1 WHERE account_id=?',[accountId]);
      await connection.commit();active=false;
    }catch(e){if(active)await connection.rollback();throw e;}
    finally{connection.release();}
  }
}
