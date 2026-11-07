/**
 * Single-use operation-bound authorization for simulated Affiliate refunds.
 * This is an internal MySQL CI lab mechanism, NOT a payment or real-money gate.
 *
 * The grant is consumed in the SAME InnoDB transaction as a simulated refund.
 */
import {createHash} from 'node:crypto';

export const refundApprovalDDL=Object.freeze([
  "CREATE TABLE IF NOT EXISTS aff_demo_wa_refund_challenges ("+
    "session_id CHAR(36) PRIMARY KEY,order_id CHAR(36) NOT NULL,"+
    "challenge VARCHAR(512) NOT NULL,expires_ms BIGINT UNSIGNED NOT NULL,"+
    "used BOOLEAN NOT NULL DEFAULT FALSE,"+
    "FOREIGN KEY(session_id) REFERENCES aff_demo_sessions(id),"+
    "FOREIGN KEY(order_id) REFERENCES aff_demo_orders(id)) ENGINE=InnoDB",
  "CREATE TABLE IF NOT EXISTS aff_demo_wa_refund_grants ("+
    "session_id CHAR(36) PRIMARY KEY,order_id CHAR(36) NOT NULL,"+
    "expires_ms BIGINT UNSIGNED NOT NULL,used BOOLEAN NOT NULL DEFAULT FALSE,"+
    "FOREIGN KEY(session_id) REFERENCES aff_demo_sessions(id),"+
    "FOREIGN KEY(order_id) REFERENCES aff_demo_orders(id)) ENGINE=InnoDB"
]);
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TOKEN_RE=/^[A-Za-z0-9_-]{43}$/;
export class DemoRefundApprovalRejected extends Error {
  constructor(){super('Reembolso simulado no autorizado para este pedido');this.name='DemoRefundApprovalRejected';}
}
export function refundApprovalTokenHash(token){
  if(typeof token!=='string'||!TOKEN_RE.test(token))throw new DemoRefundApprovalRejected();
  return createHash('sha256').update(token).digest('hex');
}
export function refundApprovalOrderId(orderId){
  if(typeof orderId!=='string'||!UUID_RE.test(orderId))throw new DemoRefundApprovalRejected();
  return orderId;
}
export function refundGrantActive(row,nowMs,orderId){
  return !!row && row.order_id===orderId && !row.used &&
     Number.isSafeInteger(nowMs)&&Number(row.expires_ms)>nowMs;
}
export async function consumeAuthorizedRefund(conn,{token,orderId,nowMs}){
  refundApprovalOrderId(orderId);
  const [sessions]=await conn.execute(
    "SELECT s.id AS session_id FROM aff_demo_sessions s "+
    "JOIN aff_demo_accounts a ON a.id=s.account_id "+
    "JOIN aff_demo_principals p ON p.id=a.principal_id "+
    "WHERE s.token_hash=? AND s.revoked=0 AND s.expires_at_ms>? "+
    "AND s.mfa_verified=1 AND s.webauthn_verified=1 "+
    "AND a.enabled=1 AND p.enabled=1 AND p.role='SIM_ADMIN' FOR UPDATE",
    [refundApprovalTokenHash(token),nowMs]
  );
  if(sessions.length!==1)throw new DemoRefundApprovalRejected();
  const sessionId=sessions[0].session_id;
  const [grants]=await conn.execute(
    'SELECT order_id,expires_ms,used FROM aff_demo_wa_refund_grants WHERE session_id=? FOR UPDATE',
    [sessionId]
  );
  if(!refundGrantActive(grants[0],nowMs,orderId))throw new DemoRefundApprovalRejected();
  const [result]=await conn.execute(
    'UPDATE aff_demo_wa_refund_grants SET used=1 WHERE session_id=? AND order_id=? AND used=0',
    [sessionId,orderId]
  );
  if(result.affectedRows!==1)throw new DemoRefundApprovalRejected();
  return Object.freeze({sessionId,orderId,consumed:true});
}
