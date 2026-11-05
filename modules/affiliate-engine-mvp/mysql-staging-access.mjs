/**
 * Authorization boundaries for the CI-ONLY Affiliate prototype.
 * No real authentication, session cookies, JWT, identity verification, or PII.
 * actorId MUST eventually originate from verified server-side authentication,
 * never from user-supplied JSON, query string, cookies, or client-chosen headers.
 * This module is NOT imported by any public-facing server.
 */
import {randomUUID} from 'node:crypto';
import {getStagingPoolOptions} from './mysql-staging-adapter.mjs';

export const accessDDL = Object.freeze([
  "CREATE TABLE IF NOT EXISTS aff_demo_principals ("+
    "id CHAR(36) PRIMARY KEY,"+
    "role ENUM('SIM_ADMIN','SIM_MERCHANT','SIM_AFFILIATE') NOT NULL,"+
    "scope_product_id CHAR(36) NULL,"+
    "scope_affiliate_id CHAR(36) NULL,"+
    "enabled BOOLEAN NOT NULL DEFAULT TRUE,"+
    "FOREIGN KEY(scope_product_id) REFERENCES aff_demo_products(id),"+
    "FOREIGN KEY(scope_affiliate_id) REFERENCES aff_demo_affiliates(id),"+
    "CHECK(("+
      "role='SIM_ADMIN' AND scope_product_id IS NULL AND scope_affiliate_id IS NULL) OR ("+
      "role='SIM_MERCHANT' AND scope_product_id IS NOT NULL AND scope_affiliate_id IS NULL) OR ("+
      "role='SIM_AFFILIATE' AND scope_product_id IS NULL AND scope_affiliate_id IS NOT NULL))"+
  ") ENGINE=InnoDB"
]);
const allowedRoles = new Set(['SIM_ADMIN','SIM_MERCHANT','SIM_AFFILIATE']);
function validId(v) {
  if (typeof v !== 'string' || !/^[a-f0-9-]{36}$/.test(v)) throw new Error('Identificador inválido');
  return v;
}

export function checkDemoPermission(principal,action,resource={}) {
  // fail closed for unknown, disabled, ill-scoped and forged role or action
  if(!principal || !allowedRoles.has(principal.role) || !principal.enabled) return false;
  if(typeof action!=='string')return false;
  if(principal.role==='SIM_ADMIN'){
    return new Set(['order.read','order.refund','order.simulate','audit.read','catalog.manage']).has(action);
  }
  if(principal.role==='SIM_MERCHANT'){
    if(!principal.scope_product_id || principal.scope_affiliate_id) return false;
    return action==='order.read' && resource.productId===principal.scope_product_id;
  }
  if(principal.role==='SIM_AFFILIATE'){
    if(!principal.scope_affiliate_id || principal.scope_product_id) return false;
    return action==='order.read' && resource.affiliateId===principal.scope_affiliate_id;
  }
  return false;
}

export class DemoAccessDenied extends Error {
  constructor() {super('Acceso denegado a operación demostrativa');this.name='DemoAccessDenied';}
}

/**
 * Demonstration identity directory in the isolated MySQL CI database.
 * CI actors are fixtures, not authenticated users.
 */
export class MysqlDemoRoleGate {
  constructor(pool,store,env=process.env){
    getStagingPoolOptions(env);
    if(env.ARC_AFF_MYSQL_CI_TEST!=='1'||env.ARC_AFF_STAGING_SCHEMA_TEST!=='1'){
      throw new Error('Autorización simulada solo disponible en CI');
    }
    this.pool=pool;
    this.store=store;
  }
  async initializeSchema() {
    for(const sql of accessDDL)await this.pool.query(sql);
  }
  async createFixture({role,scopeProductId=null,scopeAffiliateId=null}){
    if(!allowedRoles.has(role))throw new DemoAccessDenied();
    const p={role,scope_product_id:scopeProductId,scope_affiliate_id:scopeAffiliateId,enabled:true};
    if(!this.validScope(p))throw new DemoAccessDenied();
    const id=randomUUID();
    await this.pool.execute(
      'INSERT INTO aff_demo_principals(id,role,scope_product_id,scope_affiliate_id,enabled) VALUES(?,?,?,?,1)',
      [id,role,scopeProductId,scopeAffiliateId]
    );
    return id;
  }
  validScope(p){
    if(p.role==='SIM_ADMIN')return p.scope_product_id===null&&p.scope_affiliate_id===null;
    if(p.role==='SIM_MERCHANT')return !!p.scope_product_id&&!p.scope_affiliate_id;
    if(p.role==='SIM_AFFILIATE')return !!p.scope_affiliate_id&&!p.scope_product_id;
    return false;
  }
  async principal(actorId){
    validId(actorId);
    const [rows]=await this.pool.execute(
      'SELECT id,role,scope_product_id,scope_affiliate_id,enabled FROM aff_demo_principals WHERE id=?',
      [actorId]
    );
    return rows[0]||null;
  }
  async authorize(actorId,action,resource={}){
    const actor=await this.principal(actorId);
    if(!actor||!this.validScope(actor)||!checkDemoPermission(actor,action,resource)){
      throw new DemoAccessDenied();
    }
    return actor;
  }
  async readOrder(actorId,orderId){
    validId(orderId);
    const order=await this.store.byId(orderId);
    if(!order)throw new DemoAccessDenied(); // do not disclose existence of other orders
    await this.authorize(actorId,'order.read',{
      productId:order.product_id, affiliateId:order.affiliate_id
    });
    return order;
  }
  async refundOrder(actorId,orderId){
    validId(orderId);
    await this.authorize(actorId,'order.refund');
    return this.store.refund(orderId);
  }
  async disableFixture(actorId){
    validId(actorId);
    await this.pool.execute('UPDATE aff_demo_principals SET enabled=0 WHERE id=?',[actorId]);
  }
}
