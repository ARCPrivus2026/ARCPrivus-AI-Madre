/**
 * Journal for simulated orders only. No fiat settlement, custody or payouts.
 * Only call with the SAME MySQL InnoDB transaction that writes the simulated order.
 * Its 'SIM_CLEARING' account is fictional; it is NOT cash in a bank.
 */
import {randomUUID} from 'node:crypto';

export const simulatedJournalDDL = Object.freeze([
  "CREATE TABLE IF NOT EXISTS aff_demo_journals ("+
    "id CHAR(36) NOT NULL PRIMARY KEY,"+
    "order_id CHAR(36) NOT NULL,"+
    "event_type ENUM('SIM_ORDER_CREATED','SIM_ORDER_REFUNDED') NOT NULL,"+
    "UNIQUE KEY uq_demo_order_event(order_id,event_type),"+
    "FOREIGN KEY(order_id) REFERENCES aff_demo_orders(id)) ENGINE=InnoDB",
  "CREATE TABLE IF NOT EXISTS aff_demo_postings ("+
    "id CHAR(36) NOT NULL PRIMARY KEY,"+
    "journal_id CHAR(36) NOT NULL,"+
    "account_code ENUM('SIM_CLEARING','SIM_MERCHANT','SIM_AFFILIATE','SIM_ARC') NOT NULL,"+
    "side ENUM('DEBIT','CREDIT') NOT NULL,"+
    "amount_cop BIGINT UNSIGNED NOT NULL,"+
    "FOREIGN KEY(journal_id) REFERENCES aff_demo_journals(id),"+
    "CHECK(amount_cop > 0)) ENGINE=InnoDB"
]);

function integer(value, label) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 1000000000) {
    throw new Error(label + ': importe COP inválido');
  }
  return value;
}
function exactOrderAmount(order) {
  const priceCop=integer(order.priceCop,'precio');
  const merchantCop=integer(order.merchantCop,'comerciante');
  const affiliateCop=integer(order.affiliateCop,'afiliado');
  const arcCop=integer(order.arcCop,'ARC');
  if (priceCop < 1 || priceCop !== merchantCop+affiliateCop+arcCop) {
    throw new Error('Asiento no conserva el precio de la operación');
  }
  return {priceCop, merchantCop, affiliateCop, arcCop};
}

export function buildSimulatedPostings(order, event) {
  if (!['SIM_ORDER_CREATED','SIM_ORDER_REFUNDED'].includes(event)) {
    throw new Error('Evento de asiento no reconocido');
  }
  const d=exactOrderAmount(order);
  const normal=event==='SIM_ORDER_CREATED';
  const debit=normal?'DEBIT':'CREDIT';
  const credit=normal?'CREDIT':'DEBIT';
  const postings=[
    {account:'SIM_CLEARING',side:debit,amountCop:d.priceCop},
    {account:'SIM_MERCHANT',side:credit,amountCop:d.merchantCop},
    {account:'SIM_AFFILIATE',side:credit,amountCop:d.affiliateCop},
    {account:'SIM_ARC',side:credit,amountCop:d.arcCop}
  ].filter(p=>p.amountCop>0);
  const debits=postings.filter(p=>p.side==='DEBIT').reduce((n,p)=>n+p.amountCop,0);
  const credits=postings.filter(p=>p.side==='CREDIT').reduce((n,p)=>n+p.amountCop,0);
  if (debits !== credits) throw new Error('Asiento descuadrado');
  return Object.freeze(postings.map(p=>Object.freeze({...p})));
}

export async function recordSimulatedJournal(conn,{orderId,order,event}) {
  if(typeof orderId!=='string' || !/^[a-f0-9-]{36}$/.test(orderId)) {
    throw new Error('Pedido inválido para asiento');
  }
  const postings=buildSimulatedPostings(order,event);
  const journalId=randomUUID();
  await conn.execute(
    'INSERT INTO aff_demo_journals(id,order_id,event_type) VALUES(?,?,?)',
    [journalId,orderId,event]
  );
  for(const p of postings) {
    await conn.execute(
      'INSERT INTO aff_demo_postings(id,journal_id,account_code,side,amount_cop) VALUES(?,?,?,?,?)',
      [randomUUID(),journalId,p.account,p.side,p.amountCop]
    );
  }
  return {journalId,count:postings.length};
}

/**
 * Each event must have a journal and debit-credit balance.
 * Counts alone cannot detect a forged, equally offsetting journal.
 * This is a structural check, NOT an immutable, independently attested ledger.
 */
export async function reconcileSimulatedJournals(pool) {
  const [rows]=await pool.query(
    "SELECT "+
    "(SELECT COUNT(*) FROM aff_demo_audit) AS audit_events,"+
    "(SELECT COUNT(*) FROM aff_demo_journals) AS journal_events,"+
    "(SELECT COUNT(*) FROM aff_demo_orders o WHERE "+
      "NOT EXISTS(SELECT 1 FROM aff_demo_journals j WHERE j.order_id=o.id AND j.event_type='SIM_ORDER_CREATED') "+
      "OR (o.status='SIM_REFUNDED' AND NOT EXISTS(SELECT 1 FROM aff_demo_journals j "+
      "WHERE j.order_id=o.id AND j.event_type='SIM_ORDER_REFUNDED')) "+
      "OR (o.status='SIM_CONFIRMED' AND EXISTS(SELECT 1 FROM aff_demo_journals j "+
      "WHERE j.order_id=o.id AND j.event_type='SIM_ORDER_REFUNDED'))) AS missing_or_extra,"+
    "(SELECT COUNT(*) FROM ("+
       "SELECT j.id,COUNT(p.id) AS posting_count,"+
       "COALESCE(SUM(CASE WHEN p.side='DEBIT' THEN p.amount_cop ELSE 0 END),0) AS debits,"+
       "COALESCE(SUM(CASE WHEN p.side='CREDIT' THEN p.amount_cop ELSE 0 END),0) AS credits "+
       "FROM aff_demo_journals j LEFT JOIN aff_demo_postings p ON p.journal_id=j.id GROUP BY j.id"+
     ") totals WHERE totals.posting_count<2 OR totals.debits<>totals.credits) AS unbalanced"
  );
  const r=rows[0];
  return Object.freeze({
    ok:r.audit_events===r.journal_events && r.missing_or_extra===0 && r.unbalanced===0,
    journalEvents:Number(r.journal_events),
    auditEvents:Number(r.audit_events),
    missingOrExtra:Number(r.missing_or_extra),
    unbalanced:Number(r.unbalanced),
    currency:'COP',
    mode:'SIMULATION_ONLY',
    productionReady:false
  });
}
