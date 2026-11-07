import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DemoAffiliateEngine} from './engine.mjs';
import {DemoMarketingStudio,SAMPLE_DRAFTS} from './marketing-studio.mjs';

function fresh(){
 const engine=new DemoAffiliateEngine();
 const studio=new DemoMarketingStudio(engine);
 return {engine,studio,close:()=>engine.close()};
}
test('catálogo editorial 1.5: tres borradores técnicos, ninguno publicable ni cobrado',()=>{
 const x=fresh();
 try{
  assert.equal(SAMPLE_DRAFTS.length,3);
  assert.equal(x.studio.getCatalog().length,0);
  const pages=x.studio.seedSampleDrafts();
  assert.equal(pages.length,3);
  assert.equal(pages.filter(p=>p.kind==='DIGITAL_GUIDE').length,2);
  assert.equal(pages.filter(p=>p.kind==='REMOTE_ADVICE').length,1);
  assert.ok(pages.every(p=>p.state==='DEMO_DRAFT'&&p.realProduct===false));
  assert.deepEqual(pages.map(p=>p.priceCop),[49000,39000,79000]);
  assert.deepEqual(x.studio.seedSampleDrafts().map(p=>p.productId),
    pages.map(p=>p.productId));
  assert.equal(x.engine.dashboard().products,3);
  assert.equal(x.engine.dashboard().sales,0);
  assert.equal(x.studio.overview().actualRevenueCop,0);
  assert.equal(x.engine.reconcile().ok,true);
 }finally{x.close();}
});

test('edición editorial: revisión optimista y transacciones sin datos parciales',()=>{
 const x=fresh();
 try{
  const p=x.studio.seedSampleDrafts()[0];
  const edited=x.studio.saveDraft({
    productId:p.productId,slug:p.slug,kind:p.kind,
    headline:'Manual mejorado de diagnóstico técnico No Frost',
    audience:p.audience,summary:p.summary,
    highlights:p.highlights,expectedRevision:1
  });
  assert.equal(edited.revision,2);
  assert.match(edited.headline,/mejorado/);
  assert.throws(()=>x.studio.saveDraft({
    productId:p.productId,slug:p.slug,kind:p.kind,
    headline:p.headline,audience:p.audience,summary:p.summary,
    highlights:p.highlights,expectedRevision:1
  }),/Conflicto de revisión/);
  assert.equal(x.studio.getPageByProduct(p.productId).revision,2);
  assert.equal(x.engine.reconcile().ok,true);
 }finally{x.close();}
});

test('marketing: no acepta HTML, slugs engañosos ni listas vacías',()=>{
 const x=fresh();
 try{
  const p=x.studio.seedSampleDrafts()[0];
  const base={
    productId:p.productId,slug:p.slug,kind:p.kind,
    headline:p.headline,audience:p.audience,summary:p.summary,
    highlights:p.highlights,expectedRevision:1
  };
  for(const field of [
    {slug:'bad-slug-<script>'},
    {headline:'<img src=x onerror=alert(1)>'},
    {summary:'<h1>injected demo</h1>'},
    {highlights:['Sin contenido']},
    {kind:'BANK_CHECKOUT'},
    {productId:'nonexisting-id'}
  ]){
    assert.throws(()=>x.studio.saveDraft({...base,...field}));
  }
  assert.equal(x.studio.getPageByProduct(p.productId).revision,1);
  assert.equal(x.engine.reconcile().ok,true);
 }finally{x.close();}
});

test('flujo integral: borrador → afiliado → enlace → visitas → ventas SIMULADAS → reembolso',()=>{
 const x=fresh();
 try{
  const p=x.studio.seedSampleDrafts()[0];
  const affiliate=x.engine.addAffiliate({name:'Afiliado de laboratorio'});
  const link=x.engine.createReferral({productId:p.productId,affiliateId:affiliate.id});
  const landing=x.studio.landingForReferral(link.token);
  assert.equal(landing.page.headline,p.headline);
  assert.equal(landing.paymentsEnabled,false);
  assert.equal(landing.publicLink,false);
  const promo=x.studio.promoText(link.token);
  assert.equal(promo.publishable,false);
  assert.match(promo.copy,/BORRADOR SIN COMPRA/);
  for(let i=0;i<5;i++)x.engine.recordReferralVisit(link.token);
  const sale=x.engine.recordReferralSale({token:link.token,requestId:'campaign-1'});
  const replay=x.engine.recordReferralSale({token:link.token,requestId:'campaign-1'});
  assert.equal(replay.id,sale.id);
  assert.equal(sale.arcCop,1470); // COP 49,000 * 30% commission * 10% ARC
  const o=x.studio.overview();
  assert.equal(o.campaigns.length,1);
  assert.equal(o.totals.clicks,5);
  assert.equal(o.totals.simulatedOrders,1);
  assert.equal(o.totals.simulatedRefunds,0);
  assert.equal(o.totals.demoGrossCop,49000);
  assert.equal(o.totals.demoArcCop,1470);
  assert.equal(o.campaigns[0].demoOrdersPer100Visits,20);
  assert.equal(o.actualSales,0);
  assert.equal(o.actualRevenueCop,0);
  x.engine.refundDemoSale(sale.id);
  const reverted=x.studio.overview();
  assert.equal(reverted.totals.simulatedOrders,0);
  assert.equal(reverted.totals.simulatedRefunds,1);
  assert.equal(reverted.totals.demoGrossCop,0);
  assert.equal(reverted.totals.demoArcCop,0);
  assert.equal(x.engine.reconcile().ok,true);
 }finally{x.close();}
});

test('marketing: sin visitas la proporción no se inventa, y las ventas directas no se atribuyen',()=>{
 const x=fresh();
 try{
  const p=x.studio.seedSampleDrafts()[0];
  const a=x.engine.addAffiliate({name:'Afiliado de prueba'});
  x.engine.createReferral({productId:p.productId,affiliateId:a.id});
  x.engine.recordDemoSale({productId:p.productId,affiliateId:a.id,requestId:'direct-local'});
  const stats=x.studio.overview();
  assert.equal(stats.campaigns[0].demoOrdersPer100Visits,null);
  assert.equal(stats.campaigns[0].simulatedOrders,0);
  assert.equal(stats.totals.demoGrossCop,0);
  assert.equal(x.engine.dashboard().sales,1);
 }finally{x.close();}
});

test('persistencia SQLite: migración aditiva de borradores conservando ventas anteriores',()=>{
 const dir=mkdtempSync(join(tmpdir(),'arc-marketing-15-'));
 const path=join(dir,'demo.sqlite');
 try{
  const before=new DemoAffiliateEngine(path);
  const p=before.addProduct({title:'Producto anterior',priceCop:15000,commissionPct:20});
  const a=before.addAffiliate({name:'Afiliado anterior'});
  const oldSale=before.recordDemoSale({
    productId:p.id,affiliateId:a.id,requestId:'historical-1'
  });
  before.close();
  const after=new DemoAffiliateEngine(path);
  const studio=new DemoMarketingStudio(after);
  assert.equal(studio.getCatalog().length,0);
  assert.equal(after.getSale(oldSale.id).id,oldSale.id);
  studio.seedSampleDrafts();
  assert.equal(after.getSale(oldSale.id).status,'DEMO_CONFIRMED');
  assert.equal(after.reconcile().ok,true);
  after.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});
