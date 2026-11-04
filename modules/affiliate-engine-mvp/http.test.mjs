import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
async function startLocalServer(){
  const child = spawn(process.execPath, [join(here, 'server.mjs')], {
    cwd: here, env: { ...process.env, ARC_DEMO_PORT: '0', ARC_DEMO_DB: ':memory:' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const url = await new Promise((resolve, reject) => {
    let output = '';
    let errors = '';
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('Servidor local no respondió: ' + errors.slice(-400)));
    }, 7000);
    child.stderr.on('data', data => { errors += data.toString(); });
    child.stdout.on('data', data => {
      output += data.toString();
      const m = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (m) { clearTimeout(timeout); resolve(m[0]); }
    });
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('exit', code => {
      clearTimeout(timeout);
      reject(new Error('Servidor finalizó inesperadamente: ' + code + ', ' + errors.slice(-400)));
    });
  });
  return { url, child };
}
const post = (url, body, headers = {}) => fetch(url, {
  method: 'POST',
  headers: { 'content-type':'application/json', ...headers },
  body: JSON.stringify(body),
  signal: AbortSignal.timeout(5000)
});

test('servidor localhost: vistas CSP, bloqueo externo y flujo de promoción', async () => {
  const {url,child} = await startLocalServer();
  try {
    const home = await fetch(url, {signal:AbortSignal.timeout(5000)});
    assert.equal(home.status,200);
    const page=await home.text();
    assert.match(page, /style\.css/);
    assert.match(home.headers.get('content-security-policy'),/script-src 'self'/);
    const css=await fetch(url+'/style.css');
    assert.equal(css.status,200);
    assert.match(css.headers.get('content-type'),/text\/css/);
    const script=await fetch(url+'/app.js');
    assert.equal(script.status,200);

    const outside=await post(url+'/api/products',
      {title:'Bloqueada',priceCop:100000,commissionPct:30},
      {origin:'https://sitio-externo.invalid'});
    assert.equal(outside.status,403);
    const malformed=await fetch(url+'/api/products',{
      method:'POST', headers:{'content-type':'text/plain'},
      body:JSON.stringify({title:'Inválida',priceCop:100000,commissionPct:30})
    });
    assert.equal(malformed.status,415);

    const productResponse=await post(url+'/api/products',
      {title:'Curso de prueba',priceCop:100000,commissionPct:30});
    assert.equal(productResponse.status,201);
    const product=await productResponse.json();
    const affiliateResponse=await post(url+'/api/affiliates',{name:'Afiliado demostrativo'});
    assert.equal(affiliateResponse.status,201);
    const affiliate=await affiliateResponse.json();
    const referralResponse=await post(url+'/api/referrals',{
      productId:product.id, affiliateId:affiliate.id
    });
    assert.equal(referralResponse.status,201);
    const link=await referralResponse.json();
    assert.match(link.token,/^[a-f0-9]{32}$/);
    const visit=await post(url+'/api/referrals/'+link.token+'/visit',{});
    assert.equal((await visit.json()).clicks,1);

    const first=await post(url+'/api/referrals/'+link.token+'/demo-sale',{requestId:'demo-1'});
    assert.equal(first.status,201);
    const sale=await first.json();
    assert.equal(sale.arcCop,3000);
    assert.equal(sale.affiliateCop,27000);
    assert.equal(sale.referralToken,link.token);
    const replay=await post(url+'/api/referrals/'+link.token+'/demo-sale',{requestId:'demo-1'});
    assert.equal((await replay.json()).id,sale.id);
    const summary=await (await fetch(url+'/api/summary')).json();
    assert.equal(summary.sales,1);
    assert.equal(summary.arcCop,3000);
    const refund=await post(url+'/api/demo-sales/'+sale.id+'/refund',{});
    assert.equal(refund.status,200);
    const zero=await (await fetch(url+'/api/summary')).json();
    assert.equal(zero.sales,0);
    assert.equal(zero.arcCop,0);
    const integrity = await fetch(url+'/api/integrity');
    assert.equal(integrity.status,200);
    const checks = await integrity.json();
    assert.equal(checks.ok,true);
    assert.equal(checks.productionReady,false);
  } finally { child.kill(); }
});
