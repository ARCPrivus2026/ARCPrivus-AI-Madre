import test from 'node:test';
import assert from 'node:assert/strict';
import { createStagingPool } from './mysql-staging-adapter.mjs';
import { MysqlStagingDemoStore } from './mysql-staging-store.mjs';

const enabled = process.env.ARC_AFF_MYSQL_CI_TEST === '1'
  && process.env.ARC_AFF_STAGING_SCHEMA_TEST === '1';

const setup = async(hooks={}) => {
  const pool=await createStagingPool(process.env);
  const store=new MysqlStagingDemoStore(pool,process.env,hooks);
  await store.initializeSchema();
  return {pool,store};
};
const make = async store => {
  const p=await store.product({title:'Producto SIMULADO',priceCop:100000,commissionPct:30});
  const a=await store.affiliate({alias:'Afiliado SIMULADO'});
  const r=await store.referral({productId:p.id,affiliateId:a.id});
  return {p,a,r};
};
const unique = prefix => prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);

test('MySQL real: tablas exclusivas, venta simulada, 10 % comisión y reembolso idempotente',
  {skip:!enabled}, async()=>{
  const {pool,store}=await setup();
  try{
    const {r}=await make(store);
    const req=unique('order');
    const o=await store.simulatedOrder({referralId:r.id,requestId:req});
    assert.equal(o.status,'SIM_CONFIRMED');
    assert.equal(Number(o.price_cop),100000);
    assert.equal(Number(o.merchant_cop),70000);
    assert.equal(Number(o.affiliate_cop),27000);
    assert.equal(Number(o.arc_cop),3000);
    const replay=await store.simulatedOrder({referralId:r.id,requestId:req});
    assert.equal(replay.id,o.id);
    const [c]=await pool.execute('SELECT * FROM aff_demo_commissions WHERE order_id=?',[o.id]);
    assert.equal(c.length,1);
    const returned=await store.refund(o.id);
    assert.equal(returned.status,'SIM_REFUNDED');
    assert.equal((await store.refund(o.id)).status,'SIM_REFUNDED');
    const [audits]=await pool.execute('SELECT * FROM aff_demo_audit WHERE order_id=?',[o.id]);
    assert.equal(audits.length,2);
    const totals=await store.summary();
    const [live]=await pool.execute("SELECT COUNT(*) AS n FROM aff_demo_orders WHERE status='SIM_CONFIRMED'");
    assert.equal(Number(totals.arcCop),Number(live[0].n)*0); // all orders in this test begin refunded
    assert.equal((await store.reconcile()).ok,true);
  }finally{await pool.end();}
});

test('MySQL real: falla forzada revierte inserción de pedido y comisión', {skip:!enabled}, async()=>{
  const {pool,store}=await setup({afterOrderInsert:async()=>{throw new Error('FALLA_CONTROLADA');}});
  try{
    const {r}=await make(store),req=unique('rollback');
    await assert.rejects(()=>store.simulatedOrder({referralId:r.id,requestId:req}),/FALLA_CONTROLADA/);
    assert.equal(await store.byRequest(req),null);
    assert.equal((await store.reconcile()).ok,true);
    const [rows]=await pool.execute(
      "SELECT COUNT(*) AS n FROM aff_demo_commissions WHERE order_id IN "+
      "(SELECT id FROM aff_demo_orders WHERE request_id=?)",[req]);
    assert.equal(rows[0].n,0);
  }finally{await pool.end();}
});

test('MySQL real: múltiples solicitudes idénticas no duplican comisiones', {skip:!enabled},async()=>{
  const {pool,store}=await setup();
  try{
    const {r}=await make(store),req=unique('parallel');
    const orders=await Promise.all(Array.from({length:4},
      ()=>store.simulatedOrder({referralId:r.id,requestId:req})));
    assert.equal(new Set(orders.map(o=>o.id)).size,1);
    const [rows]=await pool.execute('SELECT COUNT(*) AS n FROM aff_demo_orders WHERE request_id=?',[req]);
    assert.equal(rows[0].n,1);
    assert.equal((await store.reconcile()).ok,true);
  }finally{await pool.end();}
});

test('MySQL real: atribución contradictoria se rechaza sin crear comisión', {skip:!enabled},async()=>{
  const {pool,store}=await setup();
  try{
    const {r,p}=await make(store);
    const a2=await store.affiliate({alias:'Segundo afiliado'});
    const r2=await store.referral({productId:p.id,affiliateId:a2.id});
    const req=unique('conflict');
    await store.simulatedOrder({referralId:r.id,requestId:req});
    await assert.rejects(()=>store.simulatedOrder({referralId:r2.id,requestId:req}),/contradictoria/);
    const [orders]=await pool.execute('SELECT * FROM aff_demo_orders WHERE request_id=?',[req]);
    assert.equal(orders.length,1);
    assert.equal(orders[0].referral_id,r.id);
  }finally{await pool.end();}
});

test('MySQL real: evita creación de tablas en ejecución habitual (sin opt-in)',async()=>{
  const env={
    ARC_AFF_STAGING_CONNECT:'1',ARC_AFF_STAGING_ONLY:'1',
    ARC_AFF_DB_HOST:'127.0.0.1',ARC_AFF_DB_NAME:'arc_affiliate_staging_ci',
    ARC_AFF_DB_USER:'arc_aff_ci',ARC_AFF_DB_PASSWORD:'dummy-password-only',
    ARC_AFF_MYSQL_CI_TEST:'0', ARC_AFF_STAGING_SCHEMA_TEST:'0'
  };
  assert.throws(()=>new MysqlStagingDemoStore({getConnection(){},execute(){}},env),/exclusiva de pruebas CI/);
});
