import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// Demostrador LOCAL: no existe pasarela de pago, facturación ni retiros.
// El 10 % de ARC se calcula SOBRE LA COMISIÓN COMERCIAL, no sobre la venta.
export const ARC_FEE_BPS = 1000;

function validName(value, label = 'nombre') {
  if (typeof value !== 'string' || value.trim().length < 3 || value.trim().length > 120) {
    throw new Error(`${label}: debe contener entre 3 y 120 caracteres`);
  }
  return value.trim();
}
function validPositiveInt(value, label, max = 1_000_000_000) {
  if (!Number.isSafeInteger(value) || value < 1 || value > max) {
    throw new Error(`${label}: número entero fuera de rango`);
  }
  return value;
}
function validId(value, label) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 100) {
    throw new Error(`${label}: identificador inválido`);
  }
  return value;
}

export function calculateDistribution(priceCop, commissionPct) {
  validPositiveInt(priceCop, 'precio COP');
  if (!Number.isInteger(commissionPct) || commissionPct < 1 || commissionPct > 80) {
    throw new Error('La comisión debe ser un porcentaje entero entre 1 y 80');
  }
  const commissionCop = Math.floor(priceCop * commissionPct / 100);
  const arcCop = Math.floor(commissionCop * ARC_FEE_BPS / 10000);
  const affiliateCop = commissionCop - arcCop;
  const merchantCop = priceCop - commissionCop;
  return { priceCop, commissionPct, commissionCop, arcCop, affiliateCop, merchantCop };
}

export class DemoAffiliateEngine {
  constructor(filename = ':memory:') {
    if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, price_cop INTEGER NOT NULL,
        commission_pct INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS affiliates (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS referral_links (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES products(id),
        affiliate_id TEXT NOT NULL REFERENCES affiliates(id),
        token TEXT NOT NULL UNIQUE, clicks INTEGER NOT NULL DEFAULT 0 CHECK(clicks>=0),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(product_id, affiliate_id)
      );
      CREATE TABLE IF NOT EXISTS demo_sales (
        id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE,
        product_id TEXT NOT NULL REFERENCES products(id),
        affiliate_id TEXT NOT NULL REFERENCES affiliates(id),
        status TEXT NOT NULL CHECK(status IN ('DEMO_CONFIRMED', 'DEMO_REFUNDED')),
        price_cop INTEGER NOT NULL, commission_cop INTEGER NOT NULL,
        arc_cop INTEGER NOT NULL, affiliate_cop INTEGER NOT NULL,
        merchant_cop INTEGER NOT NULL, referral_token TEXT REFERENCES referral_links(token), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY, event_type TEXT NOT NULL, subject_id TEXT NOT NULL,
        details TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Migración compatible: se conserva el historial de la versión 0.2.
    const saleColumns = this.db.prepare('PRAGMA table_info(demo_sales)').all();
    if (!saleColumns.some(c => c.name === 'referral_token')) {
      this.db.exec('ALTER TABLE demo_sales ADD COLUMN referral_token TEXT REFERENCES referral_links(token)');
    }
  }
  close() { this.db.close(); }
  transaction(action) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = action();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  log(eventType, subjectId, details) {
    this.db.prepare('INSERT INTO audit_events (id,event_type,subject_id,details) VALUES (?,?,?,?)')
      .run(randomUUID(), eventType, subjectId, JSON.stringify(details));
  }
  addProduct({ title, priceCop, commissionPct }) {
    title = validName(title, 'producto');
    calculateDistribution(priceCop, commissionPct);
    const id = randomUUID();
    this.transaction(() => {
      this.db.prepare('INSERT INTO products (id,title,price_cop,commission_pct) VALUES (?,?,?,?)')
        .run(id, title, priceCop, commissionPct);
      this.log('PRODUCT_CREATED', id, { title, priceCop, commissionPct });
    });
    return this.getProducts().find(p => p.id === id);
  }
  addAffiliate({ name }) {
    name = validName(name, 'afiliado');
    const id = randomUUID();
    const code = randomUUID().replaceAll('-', '').slice(0, 12);
    this.transaction(() => {
      this.db.prepare('INSERT INTO affiliates (id,name,code) VALUES (?,?,?)').run(id, name, code);
      this.log('AFFILIATE_CREATED', id, { code });
    });
    return this.getAffiliates().find(a => a.id === id);
  }
  getProducts() {
    return this.db.prepare('SELECT id,title,price_cop AS priceCop,commission_pct AS commissionPct FROM products ORDER BY created_at DESC, rowid DESC').all();
  }
  getAffiliates() {
    return this.db.prepare('SELECT id,name,code FROM affiliates ORDER BY created_at DESC, rowid DESC').all();
  }

  createReferral({ productId, affiliateId }) {
    validId(productId, 'producto');
    validId(affiliateId, 'afiliado');
    return this.transaction(() => {
      const product = this.db.prepare('SELECT id FROM products WHERE id=?').get(productId);
      const affiliate = this.db.prepare('SELECT id FROM affiliates WHERE id=?').get(affiliateId);
      if (!product || !affiliate) throw new Error('Producto o afiliado inexistente');
      const id = randomUUID();
      const token = randomUUID().replaceAll('-', '');
      const result = this.db.prepare(
        'INSERT OR IGNORE INTO referral_links (id,product_id,affiliate_id,token) VALUES (?,?,?,?)'
      ).run(id, productId, affiliateId, token);
      if (result.changes === 1) this.log('REFERRAL_CREATED', id, { productId, affiliateId, token });
      return this.db.prepare(`SELECT l.id,l.token,l.clicks,
        l.product_id AS productId,l.affiliate_id AS affiliateId,
        p.title AS product,a.name AS affiliate
        FROM referral_links l JOIN products p ON p.id=l.product_id
        JOIN affiliates a ON a.id=l.affiliate_id
        WHERE l.product_id=? AND l.affiliate_id=?`).get(productId, affiliateId);
    });
  }
  getReferrals() {
    return this.db.prepare(`SELECT l.id,l.token,l.clicks,
      l.product_id AS productId,l.affiliate_id AS affiliateId,
      p.title AS product,a.name AS affiliate
      FROM referral_links l JOIN products p ON p.id=l.product_id
      JOIN affiliates a ON a.id=l.affiliate_id
      ORDER BY l.created_at DESC,l.rowid DESC LIMIT 100`).all();
  }
  getReferral(token) {
    if (typeof token !== 'string' || !/^[a-f0-9]{32}$/.test(token)) throw new Error('Enlace inválido');
    return this.db.prepare(`SELECT l.id,l.token,l.clicks,
      l.product_id AS productId,l.affiliate_id AS affiliateId,
      p.title AS product,a.name AS affiliate
      FROM referral_links l JOIN products p ON p.id=l.product_id
      JOIN affiliates a ON a.id=l.affiliate_id
      WHERE l.token=?`).get(token);
  }
  recordReferralVisit(token) {
    return this.transaction(() => {
      const link = this.getReferral(token);
      if (!link) throw new Error('Enlace inexistente');
      this.db.prepare('UPDATE referral_links SET clicks=clicks+1 WHERE token=?').run(token);
      return this.getReferral(token);
    });
  }
  recordReferralSale({ token, requestId }) {
    const link = this.getReferral(token);
    if (!link) throw new Error('Enlace inexistente');
    return this.recordDemoSale({
      productId: link.productId, affiliateId: link.affiliateId, requestId,
      referralToken: token
    });
  }
  getSales() {
    return this.db.prepare(`SELECT s.id,s.request_id AS requestId,s.status,s.price_cop AS priceCop,
      s.commission_cop AS commissionCop,s.arc_cop AS arcCop,s.affiliate_cop AS affiliateCop,
      s.merchant_cop AS merchantCop,s.referral_token AS referralToken,s.created_at AS createdAt,
      p.title AS product, a.name AS affiliate
      FROM demo_sales s JOIN products p ON p.id=s.product_id
      JOIN affiliates a ON a.id=s.affiliate_id
      ORDER BY s.created_at DESC,s.rowid DESC LIMIT 100`).all();
  }
  getSale(id) {
    validId(id, 'venta');
    return this.db.prepare(`SELECT s.id,s.request_id AS requestId,s.status,
      s.price_cop AS priceCop,s.commission_cop AS commissionCop,
      s.arc_cop AS arcCop,s.affiliate_cop AS affiliateCop,s.merchant_cop AS merchantCop,s.referral_token AS referralToken,
      s.created_at AS createdAt,p.title AS product,a.name AS affiliate
      FROM demo_sales s JOIN products p ON p.id=s.product_id
      JOIN affiliates a ON a.id=s.affiliate_id
      WHERE s.id=?`).get(id);
  }
  recordDemoSale({ productId, affiliateId, requestId, referralToken = null }) {
    validId(productId, 'producto');
    validId(affiliateId, 'afiliado');
    validId(requestId, 'solicitud');
    // Idempotencia: jamás duplicar una solicitud repetida.
    if (referralToken !== null) {
      const ref = this.getReferral(referralToken);
      if (!ref || ref.productId !== productId || ref.affiliateId !== affiliateId) {
        throw new Error('El enlace no corresponde al producto o afiliado');
      }
    }
    const previous = this.db.prepare(
      'SELECT id,product_id AS productId,affiliate_id AS affiliateId,referral_token AS referralToken FROM demo_sales WHERE request_id=?'
    ).get(requestId);
    if (previous) {
      if (previous.productId !== productId || previous.affiliateId !== affiliateId || previous.referralToken !== referralToken) {
        throw new Error('La solicitud repetida no corresponde al mismo producto y afiliado');
      }
      return this.getSale(previous.id);
    }
    return this.transaction(() => {
      const product = this.db.prepare('SELECT * FROM products WHERE id=?').get(productId);
      const affiliate = this.db.prepare('SELECT * FROM affiliates WHERE id=?').get(affiliateId);
      if (!product || !affiliate) throw new Error('Producto o afiliado inexistente');
      const d = calculateDistribution(product.price_cop, product.commission_pct);
      const id = randomUUID();
      this.db.prepare(`INSERT INTO demo_sales
        (id,request_id,product_id,affiliate_id,status,price_cop,commission_cop,arc_cop,affiliate_cop,merchant_cop,referral_token)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
          id, requestId, productId, affiliateId, 'DEMO_CONFIRMED',
          d.priceCop, d.commissionCop, d.arcCop, d.affiliateCop, d.merchantCop, referralToken
        );
      this.log('DEMO_SALE_CREATED', id, { requestId, productId, affiliateId, referralToken, ...d });
      return this.getSale(id);
    });
  }
  refundDemoSale(id) {
    validId(id, 'venta');
    return this.transaction(() => {
      const existing = this.db.prepare('SELECT id,status FROM demo_sales WHERE id=?').get(id);
      if (!existing) throw new Error('Venta de prueba inexistente');
      if (existing.status === 'DEMO_CONFIRMED') {
        this.db.prepare("UPDATE demo_sales SET status='DEMO_REFUNDED' WHERE id=?").run(id);
        this.log('DEMO_SALE_REFUNDED', id, { reason: 'reversión simulada' });
      }
      return this.getSale(id);
    });
  }
  dashboard() {
    const counts = {
      products: this.db.prepare('SELECT COUNT(*) AS n FROM products').get().n,
      affiliates: this.db.prepare('SELECT COUNT(*) AS n FROM affiliates').get().n
    };
    const s = this.db.prepare(`SELECT COUNT(*) AS sales,
      COALESCE(SUM(price_cop),0) AS grossCop,
      COALESCE(SUM(affiliate_cop),0) AS affiliateCop,
      COALESCE(SUM(arc_cop),0) AS arcCop,
      COALESCE(SUM(merchant_cop),0) AS merchantCop
      FROM demo_sales WHERE status='DEMO_CONFIRMED'`).get();
    return { environment: 'DEMO_ONLY', currency: 'COP', ...counts, ...s,
      warning: 'Cifras simuladas: NO son pagos, beneficios ni ingresos reales.' };
  }
  audit(limit = 50) {
    return this.db.prepare('SELECT event_type AS type,subject_id AS subjectId,details,created_at AS createdAt FROM audit_events ORDER BY rowid DESC LIMIT ?').all(Math.min(limit,100));
  }
}
