/**
 * MySQL staging ledger for ARC Affiliate (DEMO ONLY).
 * CI-gated: separate schema and user, never imported into R4 or an HTTP server.
 */
import { randomUUID } from 'node:crypto';
import { calculateDistribution } from './engine.mjs';
import { getStagingPoolOptions } from './mysql-staging-adapter.mjs';

const ddl = [
  "CREATE TABLE IF NOT EXISTS aff_demo_products ("+
   "id CHAR(36) PRIMARY KEY,title VARCHAR(120) NOT NULL,"+
   "price_cop BIGINT UNSIGNED NOT NULL,commission_pct TINYINT UNSIGNED NOT NULL,"+
   "CHECK (price_cop BETWEEN 1 AND 1000000000),CHECK (commission_pct BETWEEN 1 AND 80)) ENGINE=InnoDB",
  "CREATE TABLE IF NOT EXISTS aff_demo_affiliates ("+
   "id CHAR(36) PRIMARY KEY,alias VARCHAR(120) NOT NULL,code CHAR(24) NOT NULL UNIQUE) ENGINE=InnoDB",
  "CREATE TABLE IF NOT EXISTS aff_demo_referrals ("+
   "id CHAR(36) PRIMARY KEY,product_id CHAR(36) NOT NULL,affiliate_id CHAR(36) NOT NULL,"+
   "token CHAR(32) UNIQUE NOT NULL,UNIQUE KEY uniq_ref (product_id,affiliate_id),"+
   "FOREIGN KEY (product_id) REFERENCES aff_demo_products(id),"+
   "FOREIGN KEY (affiliate_id) REFERENCES aff_demo_affiliates(id)) ENGINE=InnoDB",
  "CREATE TABLE IF NOT EXISTS aff_demo_orders ("+
   "id CHAR(36) PRIMARY KEY,request_id VARCHAR(100) NOT NULL UNIQUE,"+
   "product_id CHAR(36) NOT NULL,affiliate_id CHAR(36) NOT NULL,referral_id CHAR(36) NOT NULL,"+
   "status ENUM('SIM_CONFIRMED','SIM_REFUNDED') NOT NULL,"+
   "price_cop BIGINT UNSIGNED NOT NULL,commission_cop BIGINT UNSIGNED NOT NULL,"+
   "merchant_cop BIGINT UNSIGNED NOT NULL,affiliate_cop BIGINT UNSIGNED NOT NULL,arc_cop BIGINT UNSIGNED NOT NULL,"+
   "FOREIGN KEY (product_id) REFERENCES aff_demo_products(id),"+
   "FOREIGN KEY (affiliate_id) REFERENCES aff_demo_affiliates(id),"+
   "FOREIGN KEY (referral_id) REFERENCES aff_demo_referrals(id),"+
   "CHECK (price_cop=merchant_cop+affiliate_cop+arc_cop),"+
   "CHECK (commission_cop=affiliate_cop+arc_cop)) ENGINE=InnoDB",
  "CREATE TABLE IF NOT EXISTS aff_demo_commissions ("+
   "order_id CHAR(36) PRIMARY KEY,affiliate_cop BIGINT UNSIGNED NOT NULL,arc_cop BIGINT UNSIGNED NOT NULL,"+
   "state ENUM('SIM_ACTIVE','SIM_REVERSED') NOT NULL,"+
   "FOREIGN KEY (order_id) REFERENCES aff_demo_orders(id)) ENGINE=InnoDB",
  "CREATE TABLE IF NOT EXISTS aff_demo_audit ("+
   "id CHAR(36) PRIMARY KEY,order_id CHAR(36) NOT NULL,"+
   "event_type ENUM('SIM_ORDER_CREATED','SIM_ORDER_REFUNDED') NOT NULL,"+
   "FOREIGN KEY (order_id) REFERENCES aff_demo_orders(id)) ENGINE=InnoDB"
];

function name(v) {
  if (typeof v !== 'string' || v.trim().length < 3 || v.trim().length > 120) {
    throw new Error('Nombre de prueba inválido');
  }
  return v.trim();
}
function id(v) {
  if (typeof v !== 'string' || !/^[a-f0-9-]{36}$/.test(v)) throw new Error('ID inválido');
  return v;
}
function requestId(v) {
  if (typeof v !== 'string' || !/^[a-zA-Z0-9_-]{3,100}$/.test(v)) throw new Error('Solicitud inválida');
  return v;
}
function same(order, referral, req) {
  if (!order || order.request_id !== req || order.product_id !== referral.product_id ||
      order.affiliate_id !== referral.affiliate_id || order.referral_id !== referral.id) {
    throw new Error('Solicitud repetida con atribución contradictoria');
  }
  return order;
}

export class MysqlStagingDemoStore {
  constructor(pool, env = process.env, hooks = {}) {
    getStagingPoolOptions(env);
    if (env.ARC_AFF_MYSQL_CI_TEST !== '1' || env.ARC_AFF_STAGING_SCHEMA_TEST !== '1') {
      throw new Error('Persistencia MySQL exclusiva de pruebas CI');
    }
    if (!pool || typeof pool.getConnection !== 'function' || typeof pool.execute !== 'function') {
      throw new Error('Pool de staging inválido');
    }
    this.pool = pool;
    this.hooks = hooks;
  }
  async initializeSchema() {
    // MySQL DDL commits automatically. Only the exclusive ephemeral CI schema.
    for (const sql of ddl) await this.pool.query(sql);
  }
  async product({title,priceCop,commissionPct}) {
    title=name(title);
    calculateDistribution(priceCop,commissionPct);
    const productId=randomUUID();
    await this.pool.execute('INSERT INTO aff_demo_products(id,title,price_cop,commission_pct) VALUES(?,?,?,?)',
      [productId,title,priceCop,commissionPct]);
    return {id:productId,title,priceCop,commissionPct};
  }
  async affiliate({alias}) {
    alias=name(alias);
    const affiliateId=randomUUID(),code=randomUUID().replaceAll('-','').slice(0,24);
    await this.pool.execute('INSERT INTO aff_demo_affiliates(id,alias,code) VALUES(?,?,?)',
      [affiliateId,alias,code]);
    return {id:affiliateId,alias,code};
  }
  async referral({productId,affiliateId}) {
    id(productId);id(affiliateId);
    const referralId=randomUUID(),token=randomUUID().replaceAll('-','');
    await this.pool.execute(
      'INSERT INTO aff_demo_referrals(id,product_id,affiliate_id,token) VALUES(?,?,?,?)',
      [referralId,productId,affiliateId,token]);
    return {id:referralId,productId,affiliateId,token};
  }
  async byRequest(req) {
    const [rows]=await this.pool.execute('SELECT * FROM aff_demo_orders WHERE request_id=?',[requestId(req)]);
    return rows[0]||null;
  }
  async byId(orderId) {
    const [rows]=await this.pool.execute('SELECT * FROM aff_demo_orders WHERE id=?',[id(orderId)]);
    return rows[0]||null;
  }
  async simulatedOrder({referralId,requestId:request}) {
    id(referralId);requestId(request);
    const conn=await this.pool.getConnection();
    let inTx=false, duplicate=false, committedId=null, existing=null;
    try {
      await conn.beginTransaction();inTx=true;
      const [refs]=await conn.execute('SELECT * FROM aff_demo_referrals WHERE id=? FOR UPDATE',[referralId]);
      const ref=refs[0];
      if(!ref)throw new Error('Enlace inexistente');
      const [previous]=await conn.execute('SELECT * FROM aff_demo_orders WHERE request_id=? FOR UPDATE',[request]);
      if(previous[0]) {
        existing=same(previous[0],ref,request);
      } else {
        const [products]=await conn.execute('SELECT price_cop,commission_pct FROM aff_demo_products WHERE id=?',[ref.product_id]);
        if(!products[0])throw new Error('Producto inexistente');
        const dist=calculateDistribution(Number(products[0].price_cop),Number(products[0].commission_pct));
        committedId=randomUUID();
        await conn.execute(
          "INSERT INTO aff_demo_orders(id,request_id,product_id,affiliate_id,referral_id,status,price_cop,commission_cop,merchant_cop,affiliate_cop,arc_cop) "+
          "VALUES(?,?,?,?,?,'SIM_CONFIRMED',?,?,?,?,?)",
          [committedId,request,ref.product_id,ref.affiliate_id,ref.id,
           dist.priceCop,dist.commissionCop,dist.merchantCop,dist.affiliateCop,dist.arcCop]);
        if(this.hooks.afterOrderInsert)await this.hooks.afterOrderInsert();
        await conn.execute(
          "INSERT INTO aff_demo_commissions(order_id,affiliate_cop,arc_cop,state) VALUES(?,?,?,'SIM_ACTIVE')",
          [committedId,dist.affiliateCop,dist.arcCop]);
        await conn.execute(
          "INSERT INTO aff_demo_audit(id,order_id,event_type) VALUES(?,?,'SIM_ORDER_CREATED')",
          [randomUUID(),committedId]);
      }
      await conn.commit();inTx=false;
    } catch(e) {
      if(inTx)await conn.rollback();
      if(e.code==='ER_DUP_ENTRY')duplicate=true;
      else throw e;
    } finally {
      conn.release();
    }
    if(existing)return existing;
    if(duplicate) {
      const order=await this.byRequest(request);
      const [refs]=await this.pool.execute('SELECT * FROM aff_demo_referrals WHERE id=?',[referralId]);
      if(!refs[0])throw new Error('Enlace inexistente');
      return same(order,refs[0],request);
    }
    return this.byId(committedId);
  }
  async refund(orderId) {
    id(orderId);
    const conn=await this.pool.getConnection();
    let inTx=false,found=null;
    try {
      await conn.beginTransaction();inTx=true;
      const [rows]=await conn.execute('SELECT * FROM aff_demo_orders WHERE id=? FOR UPDATE',[orderId]);
      found=rows[0];
      if(!found)throw new Error('Pedido inexistente');
      if(found.status==='SIM_CONFIRMED'){
        await conn.execute("UPDATE aff_demo_orders SET status='SIM_REFUNDED' WHERE id=?",[orderId]);
        await conn.execute("UPDATE aff_demo_commissions SET state='SIM_REVERSED' WHERE order_id=?",[orderId]);
        await conn.execute("INSERT INTO aff_demo_audit(id,order_id,event_type) VALUES(?,?,'SIM_ORDER_REFUNDED')",[randomUUID(),orderId]);
      }
      await conn.commit();inTx=false;
    }catch(e){if(inTx)await conn.rollback();throw e;}
    finally{conn.release();}
    return this.byId(orderId);
  }
  async summary() {
    const [rows]=await this.pool.query(
      "SELECT COUNT(*) AS orders,COALESCE(SUM(CASE WHEN status='SIM_CONFIRMED' THEN price_cop ELSE 0 END),0) AS grossCop,"+
      "COALESCE(SUM(CASE WHEN status='SIM_CONFIRMED' THEN affiliate_cop ELSE 0 END),0) AS affiliateCop,"+
      "COALESCE(SUM(CASE WHEN status='SIM_CONFIRMED' THEN arc_cop ELSE 0 END),0) AS arcCop FROM aff_demo_orders");
    return rows[0];
  }
  async reconcile() {
    const [rows]=await this.pool.query(
      "SELECT "+
       "(SELECT COUNT(*) FROM aff_demo_orders) AS total,"+
       "(SELECT COUNT(*) FROM aff_demo_commissions) AS commissions,"+
       "(SELECT COUNT(*) FROM aff_demo_audit WHERE event_type='SIM_ORDER_CREATED') AS created,"+
       "(SELECT COUNT(*) FROM aff_demo_orders WHERE status='SIM_REFUNDED') AS refunded,"+
       "(SELECT COUNT(*) FROM aff_demo_audit WHERE event_type='SIM_ORDER_REFUNDED') AS refund_events,"+
       "(SELECT COUNT(*) FROM aff_demo_orders o LEFT JOIN aff_demo_commissions c ON c.order_id=o.id "+
         "WHERE c.order_id IS NULL OR o.affiliate_cop<>c.affiliate_cop OR o.arc_cop<>c.arc_cop "+
         "OR (o.status='SIM_CONFIRMED' AND c.state<>'SIM_ACTIVE') "+
         "OR (o.status='SIM_REFUNDED' AND c.state<>'SIM_REVERSED')) AS mismatches");
    const r=rows[0];
    return {ok:r.total===r.commissions&&r.total===r.created&&r.refunded===r.refund_events&&r.mismatches===0,
      mode:'SIMULATION_ONLY',productionReady:false,...r};
  }
}
