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
