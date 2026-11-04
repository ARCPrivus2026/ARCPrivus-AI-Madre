import test from 'node:test';
import assert from 'node:assert/strict';
import { DemoAffiliateEngine, calculateDistribution } from './engine.mjs';

test('distribución transparente de venta COP 100.000', () => {
  assert.deepEqual(calculateDistribution(100000,30),{
    priceCop:100000, commissionPct:30,commissionCop:30000,arcCop:3000,affiliateCop:27000,merchantCop:70000
  });
});
test('redondeo entero, sin fracciones COP ni distribución negativa',()=>{
  const d=calculateDistribution(99999,33);
  assert.equal(d.commissionCop,32999);
  assert.equal(d.arcCop,3299);
  assert.equal(d.priceCop,d.arcCop+d.affiliateCop+d.merchantCop);
});
test('rechaza entradas inválidas y tasas abusivas',()=>{
  assert.throws(()=>calculateDistribution(-1,30));
  assert.throws(()=>calculateDistribution(10000,81));
  assert.throws(()=>calculateDistribution(10000,2.4));
});
test('crea producto, afiliado, venta y distribuye 10 % sobre comisión',()=>{
  const db=new DemoAffiliateEngine();
  try {
    const p=db.addProduct({title:'Curso demostrativo',priceCop:100000,commissionPct:30});
    const a=db.addAffiliate({name:'Afiliado Prueba'});
    const s=db.recordDemoSale({productId:p.id,affiliateId:a.id,requestId:'prueba-unica'});
    assert.equal(s.arcCop,3000);
    assert.equal(s.affiliateCop,27000);
    assert.equal(s.merchantCop,70000);
    assert.equal(db.dashboard().sales,1);
    assert.equal(db.dashboard().arcCop,3000);
    assert.equal(db.audit().filter(e=>e.type==='DEMO_SALE_CREATED').length,1);
  } finally { db.close(); }
});
test('idempotencia: mismo requestId no duplica venta',()=>{
  const db=new DemoAffiliateEngine();
  try{
    const p=db.addProduct({title:'Producto ejemplo',priceCop:10000,commissionPct:20});
    const a=db.addAffiliate({name:'Afiliada Prueba'});
    const args={productId:p.id,affiliateId:a.id,requestId:'idempotente'};
    const s=db.recordDemoSale(args);
    assert.equal(db.recordDemoSale(args).id,s.id);
    assert.equal(db.dashboard().sales,1);
  }finally{db.close();}
});
test('reembolso resta cifras sin eliminar huella de auditoría',()=>{
  const db=new DemoAffiliateEngine();
  try{
    const p=db.addProduct({title:'Producto ejemplo',priceCop:100000,commissionPct:30});
    const a=db.addAffiliate({name:'Afiliado Prueba'});
    const s=db.recordDemoSale({productId:p.id,affiliateId:a.id,requestId:'reverso'});
    db.refundDemoSale(s.id);db.refundDemoSale(s.id);
    assert.equal(db.dashboard().sales,0);
    assert.equal(db.dashboard().grossCop,0);
    assert.equal(db.dashboard().arcCop,0);
    assert.equal(db.getSales()[0].status,'DEMO_REFUNDED');
    assert.equal(db.audit().filter(e=>e.type==='DEMO_SALE_REFUNDED').length,1);
  }finally{db.close();}
});
test('no paga por invitar personas: crear afiliados no crea saldos',()=>{
 const db=new DemoAffiliateEngine();
 try{db.addAffiliate({name:'Persona nueva'});assert.equal(db.dashboard().arcCop,0);assert.equal(db.dashboard().affiliateCop,0);}
 finally{db.close();}
});

test('enlace repetido no duplica campaña y las visitas no almacenan datos personales',()=>{
  const db=new DemoAffiliateEngine();
  try{
    const p=db.addProduct({title:'Curso de muestra',priceCop:100000,commissionPct:30});
    const a=db.addAffiliate({name:'Afiliado muestra'});
    const link=db.createReferral({productId:p.id,affiliateId:a.id});
    assert.equal(db.createReferral({productId:p.id,affiliateId:a.id}).token,link.token);
    assert.match(link.token,/^[a-f0-9]{32}$/);
    assert.equal(db.recordReferralVisit(link.token).clicks,1);
    assert.equal(db.recordReferralVisit(link.token).clicks,2);
    assert.equal(db.getReferrals().length,1);
    assert.equal(db.getReferrals()[0].clicks,2);
    assert.equal(Object.hasOwn(db.getReferrals()[0],'ip'),false);
  }finally{db.close();}
});
test('venta simulada atribuida a enlace y reembolso revierten cifras',()=>{
  const db=new DemoAffiliateEngine();
  try{
    const p=db.addProduct({title:'Producto de muestra',priceCop:100000,commissionPct:30});
    const a=db.addAffiliate({name:'Afiliado muestra'});
    const link=db.createReferral({productId:p.id,affiliateId:a.id});
    const sale=db.recordReferralSale({token:link.token,requestId:'transaccion-enlace'});
    assert.equal(sale.affiliateCop,27000);
    assert.equal(sale.arcCop,3000);
    assert.equal(db.dashboard().sales,1);
    db.refundDemoSale(sale.id);
    assert.equal(db.dashboard().sales,0);
    assert.equal(db.dashboard().arcCop,0);
  }finally{db.close();}
});
test('la misma solicitud no puede adjudicarse a otro afiliado',()=>{
  const db=new DemoAffiliateEngine();
  try{
    const p=db.addProduct({title:'Curso muestra',priceCop:30000,commissionPct:20});
    const a=db.addAffiliate({name:'Afiliado Uno'});
    const b=db.addAffiliate({name:'Afiliado Dos'});
    db.recordDemoSale({productId:p.id,affiliateId:a.id,requestId:'misma-solicitud'});
    assert.throws(()=>db.recordDemoSale({
      productId:p.id,affiliateId:b.id,requestId:'misma-solicitud'
    }),/misma solicitud|solicitud repetida/i);
    assert.equal(db.dashboard().sales,1);
  }finally{db.close();}
});
test('recupera venta directa aunque existan más de 100 operaciones',()=>{
  const db=new DemoAffiliateEngine();
  try{
    const p=db.addProduct({title:'Curso de prueba',priceCop:1000,commissionPct:10});
    const a=db.addAffiliate({name:'Afiliado muestra'});
    const first=db.recordDemoSale({productId:p.id,affiliateId:a.id,requestId:'first'});
    for(let i=0;i<102;i++)db.recordDemoSale({
      productId:p.id,affiliateId:a.id,requestId:'id-'+i
    });
    assert.equal(db.getSales().length,100);
    assert.equal(db.getSale(first.id).id,first.id);
    assert.equal(db.recordDemoSale({
      productId:p.id,affiliateId:a.id,requestId:'first'
    }).id,first.id);
  }finally{db.close();}
});

test('venta atribuida conserva enlace y evita cambiar la fuente al reintentar',()=>{
  const db=new DemoAffiliateEngine();
  try{
    const p=db.addProduct({title:'Producto confianza',priceCop:100000,commissionPct:30});
    const a=db.addAffiliate({name:'Afiliado Confianza'});
    const link=db.createReferral({productId:p.id,affiliateId:a.id});
    const direct=db.recordDemoSale({productId:p.id,affiliateId:a.id,requestId:'direct-first'});
    assert.equal(direct.referralToken,null);
    assert.throws(()=>db.recordReferralSale({token:link.token,requestId:'direct-first'}),/solicitud repetida|atribución/i);
    const s=db.recordReferralSale({token:link.token,requestId:'ref-sale'});
    assert.equal(s.referralToken,link.token);
    assert.equal(db.getSale(s.id).referralToken,link.token);
    assert.throws(()=>db.recordDemoSale({
      productId:p.id,affiliateId:a.id,requestId:'fraud',referralToken:'f'.repeat(32)
    }));
    assert.equal(db.dashboard().sales,2);
  }finally{db.close();}
});
test('reconciliación detecta anomalías financieras y de auditoría',()=>{
  const db=new DemoAffiliateEngine();
  try{
    const p=db.addProduct({title:'Producto auditado',priceCop:100000,commissionPct:30});
    const a=db.addAffiliate({name:'Afiliado Auditado'});
    const s=db.recordDemoSale({productId:p.id,affiliateId:a.id,requestId:'audit-1'});
    assert.equal(db.reconcile().ok,true);
    assert.equal(db.reconcile().productionReady,false);
    db.db.prepare('UPDATE demo_sales SET arc_cop=arc_cop+1 WHERE id=?').run(s.id);
    assert.equal(db.reconcile().financialMismatches,1);
    db.db.prepare('UPDATE demo_sales SET arc_cop=arc_cop-1 WHERE id=?').run(s.id);
    db.db.exec("DELETE FROM audit_events WHERE event_type='DEMO_SALE_CREATED'");
    assert.equal(db.reconcile().auditMismatches,1);
    assert.equal(db.reconcile().ok,false);
  }finally{db.close();}
});
test('migra base previa sin perder ventas ni eventos',async()=>{
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir=mkdtempSync(join(tmpdir(),'arc-affiliates-migration-'));
  const location=join(dir,'old.sqlite');
  try{
    const db=new DemoAffiliateEngine(location);
    const p=db.addProduct({title:'Producto antiguo',priceCop:100000,commissionPct:30});
    const a=db.addAffiliate({name:'Afiliado Antiguo'});
    const sale=db.recordDemoSale({productId:p.id,affiliateId:a.id,requestId:'old-sale'});
    db.db.exec('ALTER TABLE demo_sales DROP COLUMN referral_token');
    db.close();
    const reopened=new DemoAffiliateEngine(location);
    assert.equal(reopened.getSale(sale.id).referralToken,null);
    assert.equal(reopened.reconcile().ok,true);
    assert.equal(reopened.dashboard().arcCop,3000);
    reopened.close();
  }finally{rmSync(dir,{recursive:true,force:true});}
});
