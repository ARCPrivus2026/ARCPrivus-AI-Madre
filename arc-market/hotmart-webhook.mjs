/**
 * ARC Market AI — receptor de webhook Hotmart v2.
 * Independiente del servidor de Messenger y de MySQL.
 * Este módulo NO crea productos ni inicia cobros.
 */
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const token = process.env.HOTMART_HOTTOK || '';
const dataDir = process.env.ARC_MARKET_DATA_DIR || '';
const port = Number(process.env.ARC_MARKET_WEBHOOK_PORT || 3338);
const allowed = new Set(['PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'PURCHASE_CANCELED', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'PURCHASE_PROTEST', 'PURCHASE_DELAYED']);
if (token.length < 12 || !dataDir || !Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Configuracion incompleta: HOTMART_HOTTOK, ARC_MARKET_DATA_DIR y puerto valido requeridos.');
  process.exit(1);
}
fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const store = path.join(dataDir, 'hotmart-events.jsonl');
const seen = new Set();
if (fs.existsSync(store)) {
  for (const line of fs.readFileSync(store, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { const o = JSON.parse(line); if (o.id) seen.add(o.id); } catch {}
  }
}

function compare(a, b) {
  const aBytes = Buffer.from(String(a || ''));
  const bBytes = Buffer.from(String(b || ''));
  return aBytes.length === bBytes.length && crypto.timingSafeEqual(aBytes, bBytes);
}
function respond(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return respond(res, 200, { service: 'arc-market-hotmart', ready: true, paymentActivation: 'external' });
  }
  if (req.method !== 'POST' || req.url !== '/integrations/hotmart/v2') {
    return respond(res, 404, { error: 'not_found' });
  }
  if (!compare(req.headers['x-hotmart-hottok'], token)) {
    req.resume();
    return respond(res, 401, { error: 'unauthorized' });
  }
  let bytes = 0, parts = [], terminated = false;
  req.on('data', chunk => {
    if (terminated) return;
    bytes += chunk.length;
    if (bytes > 100_000) {
      terminated = true;
      req.resume();
      return respond(res, 413, { error: 'payload_too_large' });
    }
    parts.push(chunk);
  });
  req.on('end', () => {
    if (terminated) return;
    let body;
    try { body = JSON.parse(Buffer.concat(parts).toString('utf8')); }
    catch { return respond(res, 400, { error: 'invalid_json' }); }
    const { id, event, version, data } = body || {};
    if (typeof id !== 'string' || id.length > 160 || !id || !allowed.has(event) || version !== '2.0.0' || !data || typeof data !== 'object') {
      return respond(res, 422, { error: 'invalid_event' });
    }
    if (seen.has(id)) return respond(res, 200, { received: true, duplicate: true });
    const tx = data?.purchase?.transaction || data?.purchase?.id || '';
    const price = data?.purchase?.full_price || {};
    const amount = Number(price?.value);
    const record = {
      id, event, receivedAt: new Date().toISOString(),
      productId: String(data?.product?.ucode || data?.product?.id || '').slice(0, 100),
      transactionHash: tx ? crypto.createHash('sha256').update(String(tx)).digest('hex') : null,
      amount: Number.isFinite(amount) && amount >= 0 ? amount : null,
      currency: String(price?.currency_value || '').slice(0, 8)
    };
    try {
      fs.appendFileSync(store, JSON.stringify(record) + '\n', { encoding: 'utf8', mode: 0o600 });
      seen.add(id);
      return respond(res, 200, { received: true, id });
    } catch {
      return respond(res, 503, { error: 'persistence_failed' });
    }
  });
});
server.listen(port, '127.0.0.1', () => {
  console.log('ARC Market webhook escuchando localmente en puerto ' + port + ' (HTTPS requerido en proxy).');
});
