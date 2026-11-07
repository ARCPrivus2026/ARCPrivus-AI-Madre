import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
async function startLocalServer(databaseFile = ':memory:'){
  const child = spawn(process.execPath, [join(here, 'server.mjs')], {
    cwd: here, env: { ...process.env, ARC_DEMO_PORT: '0', ARC_DEMO_DB: databaseFile, ARC_DEMO_TEST_MODE: '1' },
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

test('bloquea nuevas operaciones cuando hay alteraciones en el registro contable', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'arc-affiliate-http-'));
  const dbFile = join(dir, 'test.sqlite');
  const { url, child } = await startLocalServer(dbFile);
  try {
    const product = await (await post(url+'/api/products',{
      title:'Producto auditoría', priceCop:100000, commissionPct:30
    })).json();
    const affiliate = await (await post(url+'/api/affiliates',{name:'Afiliado Auditoría'})).json();
    const response = await post(url+'/api/demo-sales',{
      productId:product.id, affiliateId:affiliate.id, requestId:'tamper-sale'
    });
    assert.equal(response.status,201);
    const db = new DatabaseSync(dbFile);
    db.prepare("UPDATE demo_sales SET arc_cop=arc_cop+1 WHERE request_id=?").run('tamper-sale');
    db.close();
    const health=await fetch(url+'/api/integrity');
    assert.equal(health.status,503);
    assert.equal((await health.json()).financialMismatches,1);
    const blocked=await post(url+'/api/products',{
      title:'Operación bloqueada',priceCop:100000,commissionPct:30
    });
    assert.equal(blocked.status,503);
    assert.match((await blocked.json()).error,/bloqueadas/i);
  } finally {
    await new Promise(resolve => {
      child.once('exit',resolve);
      child.kill();
    });
    rmSync(dir,{recursive:true,force:true});
  }
});

test('servidor se niega a habilitar cobros reales o a abrir base ajena',()=>{
  const app=join(here,'server.mjs');
  const live=spawnSync(process.execPath,[app],{
    cwd:here,encoding:'utf8',timeout:5000,
    env:{...process.env,ARC_LIVE_PAYMENTS:'1',ARC_DEMO_DB:':memory:',ARC_DEMO_TEST_MODE:'1'}
  });
  assert.notEqual(live.status,0);
  assert.match(live.stderr,/Pagos reales deshabilitados/i);
  const hijack=spawnSync(process.execPath,[app],{
    cwd:here,encoding:'utf8',timeout:5000,
    env:{...process.env,ARC_DEMO_DB:':memory:',ARC_DEMO_TEST_MODE:'0',
      ARC_LIVE_PAYMENTS:'0',ARC_AFFILIATE_LIVE:'0',ARC_ENABLE_PAYOUTS:'0'}
  });
  assert.notEqual(hijack.status,0);
  assert.match(hijack.stderr,/base SQLite de la DEMO/i);
});


test('ARC Market 1.5 HTTP: catálogo local, landing, enlace, campaña, reversión e integridad',async()=>{
  const {url,child}=await startLocalServer();
  try{
    const first=await (await fetch(url+'/api/marketing/catalog')).json();
    assert.deepEqual(first,[]);
    const seeded=await post(url+'/api/marketing/seed',{});
    assert.equal(seeded.status,201);
    const catalog=await seeded.json();
    assert.equal(catalog.length,3);
    assert.equal(catalog.filter(x=>x.kind==='DIGITAL_GUIDE').length,2);
    assert.ok(catalog.every(x=>x.state==='DEMO_DRAFT'&&x.realProduct===false));
    assert.deepEqual((await (await post(url+'/api/marketing/seed',{})).json())
      .map(x=>x.productId),catalog.map(x=>x.productId));
    const html=await (await fetch(url)).text();
    assert.match(html,/ARC Market AI 1\.5/);
    assert.match(html,/marketingEditForm/);
    const script=await (await fetch(url+'/app.js')).text();
    assert.match(script,/marketing\/overview/);
    const affiliate=await (await post(url+'/api/affiliates',{name:'Afiliado de campaña local'})).json();
    const link=await (await post(url+'/api/referrals',{
      productId:catalog[0].productId,affiliateId:affiliate.id
    })).json();
    const landing=await (await fetch(url+'/api/marketing/landing/'+link.token)).json();
    assert.equal(landing.page.headline,catalog[0].headline);
    assert.equal(landing.paymentsEnabled,false);
    assert.equal(landing.publicLink,false);
    const promo=await (await fetch(url+'/api/marketing/promo/'+link.token)).json();
    assert.equal(promo.publishable,false);
    assert.match(promo.copy,/BORRADOR SIN COMPRA/);
    assert.equal(promo.localPreviewPath,'/?ref='+link.token);
    for(let i=0;i<4;i++)assert.equal(
      (await post(url+'/api/referrals/'+link.token+'/visit',{})).status,200
    );
    const made=await (await post(url+'/api/referrals/'+link.token+'/demo-sale',{
      requestId:'market-15-http'
    })).json();
    const replay=await (await post(url+'/api/referrals/'+link.token+'/demo-sale',{
      requestId:'market-15-http'
    })).json();
    assert.equal(replay.id,made.id);
    let overview=await (await fetch(url+'/api/marketing/overview')).json();
    assert.equal(overview.totals.clicks,4);
    assert.equal(overview.totals.simulatedOrders,1);
    assert.equal(overview.totals.simulatedRefunds,0);
    assert.equal(overview.totals.demoGrossCop,49000);
    assert.equal(overview.totals.demoArcCop,1470);
    assert.equal(overview.actualRevenueCop,0);
    const rejected=await post(url+'/api/marketing/draft',{
      productId:catalog[0].productId,slug:'wrong<script>',kind:'DIGITAL_GUIDE',
      headline:catalog[0].headline,audience:catalog[0].audience,
      summary:catalog[0].summary,highlights:catalog[0].highlights,expectedRevision:1
    });
    assert.equal(rejected.status,400);
    const changed=await post(url+'/api/marketing/draft',{
      productId:catalog[0].productId,slug:catalog[0].slug,kind:'DIGITAL_GUIDE',
      headline:'Curso de diagnóstico técnico No Frost mejorado',
      audience:catalog[0].audience,summary:catalog[0].summary,
      highlights:catalog[0].highlights,expectedRevision:1
    });
    assert.equal(changed.status,200);
    assert.equal((await changed.json()).revision,2);
    const conflicting=await post(url+'/api/marketing/draft',{
      productId:catalog[0].productId,slug:catalog[0].slug,kind:'DIGITAL_GUIDE',
      headline:catalog[0].headline,audience:catalog[0].audience,
      summary:catalog[0].summary,highlights:catalog[0].highlights,expectedRevision:1
    });
    assert.equal(conflicting.status,400);
    assert.equal((await post(url+'/api/demo-sales/'+made.id+'/refund',{})).status,200);
    overview=await (await fetch(url+'/api/marketing/overview')).json();
    assert.equal(overview.totals.simulatedOrders,0);
    assert.equal(overview.totals.simulatedRefunds,1);
    assert.equal(overview.totals.demoGrossCop,0);
    assert.equal((await (await fetch(url+'/api/integrity')).json()).ok,true);
  }finally{
    await new Promise(resolve=>{
      if(child.exitCode!==null||child.killed){child.kill();resolve();return;}
      child.once('exit',resolve);child.kill();
    });
  }
});
