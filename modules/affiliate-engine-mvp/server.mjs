import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DemoAffiliateEngine } from './engine.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.ARC_DEMO_DB || join(here, '.local-data', 'demo.sqlite');
const port = Number(process.env.ARC_DEMO_PORT || 3197);
const engine = new DemoAffiliateEngine(dbPath);
const html = readFileSync(join(here, 'index.html'));
const appJs = readFileSync(join(here, 'app.js'));
const styleCss = readFileSync(join(here, 'style.css'));
const json = (res, status, data) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  });
  res.end(JSON.stringify(data));
};
const body = async (req) => {
  let raw = '';
  for await (const part of req) {
    raw += part;
    if (raw.length > 16_384) throw new Error('Solicitud demasiado grande');
  }
  try { return JSON.parse(raw || '{}'); } catch { throw new Error('JSON inválido'); }
};
const server = createServer(async (req, res) => {
  try {
    // Protección de demostración contra DNS rebinding, CSRF y solicitudes externas.
    const localOrigin = 'http://127.0.0.1:' + port;
    if (req.headers.host !== '127.0.0.1:' + port) {
      return json(res, 403, { error: 'Este prototipo solo admite 127.0.0.1' });
    }
    if (req.method === 'POST') {
      const origin = req.headers.origin;
      const site = req.headers['sec-fetch-site'];
      if ((origin && origin !== localOrigin) ||
          (site && site !== 'same-origin' && site !== 'none')) {
        return json(res, 403, { error: 'Solicitud externa no permitida' });
      }
      const contentType = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      if (contentType !== 'application/json') {
        return json(res, 415, { error: 'Se requiere application/json' });
      }
    }
    const url = new URL(req.url, localOrigin);
    const route = url.pathname;
    if (req.method === 'GET' && route === '/') {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      });
      return res.end(html);
    }
    if (req.method === 'GET' && route === '/style.css') {
      res.writeHead(200, {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      });
      return res.end(styleCss);
    }
    if (req.method === 'GET' && route === '/app.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      return res.end(appJs);
    }
    if (req.method === 'GET' && route === '/api/status') return json(res, 200, { status: 'DEMO_ONLY', livePayments: false, payouts: false });
    if (req.method === 'GET' && route === '/api/summary') return json(res, 200, engine.dashboard());
    if (req.method === 'GET' && route === '/api/products') return json(res, 200, engine.getProducts());
    if (req.method === 'GET' && route === '/api/affiliates') return json(res, 200, engine.getAffiliates());
    if (req.method === 'GET' && route === '/api/referrals') return json(res, 200, engine.getReferrals());
    if (req.method === 'POST' && route === '/api/referrals') return json(res, 201, engine.createReferral(await body(req)));
    const refRoute = route.match(/^\/api\/referrals\/([a-f0-9]{32})$/);
    if (req.method === 'GET' && refRoute) {
      const link = engine.getReferral(refRoute[1]);
      return json(res, link ? 200 : 404, link || { error: 'Enlace inexistente' });
    }
    const visit = route.match(/^\/api\/referrals\/([a-f0-9]{32})\/visit$/);
    if (req.method === 'POST' && visit) return json(res, 200, engine.recordReferralVisit(visit[1]));
    const referralSale = route.match(/^\/api\/referrals\/([a-f0-9]{32})\/demo-sale$/);
    if (req.method === 'POST' && referralSale) {
      const payload = await body(req);
      return json(res, 201, engine.recordReferralSale({ token: referralSale[1], requestId: payload.requestId }));
    }
    if (req.method === 'GET' && route === '/api/sales') return json(res, 200, engine.getSales());
    if (req.method === 'GET' && route === '/api/audit') return json(res, 200, engine.audit());
    if (req.method === 'POST' && route === '/api/products') return json(res, 201, engine.addProduct(await body(req)));
    if (req.method === 'POST' && route === '/api/affiliates') return json(res, 201, engine.addAffiliate(await body(req)));
    if (req.method === 'POST' && route === '/api/demo-sales') return json(res, 201, engine.recordDemoSale(await body(req)));
    const refund = route.match(/^\/api\/demo-sales\/([a-f0-9-]{36})\/refund$/);
    if (req.method === 'POST' && refund) return json(res, 200, engine.refundDemoSale(refund[1]));
    return json(res, 404, { error: 'Ruta no encontrada' });
  } catch (err) {
    return json(res, 400, { error: err.message });
  }
});
// LOCALHOST es obligatorio: no hay autenticación para uso público.
server.listen(port, '127.0.0.1', () => console.log('ARC Affiliate DEMO: http://127.0.0.1:' + port));
