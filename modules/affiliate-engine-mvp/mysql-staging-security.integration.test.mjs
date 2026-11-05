import test from 'node:test';
import assert from 'node:assert/strict';
import {createStagingPool} from './mysql-staging-adapter.mjs';
import {MysqlStagingDemoStore} from './mysql-staging-store.mjs';
import {MysqlDemoRoleGate,DemoAccessDenied} from './mysql-staging-access.mjs';

const enabled = process.env.ARC_AFF_MYSQL_CI_TEST === '1'
  && process.env.ARC_AFF_STAGING_SCHEMA_TEST === '1';

async function setup(hooks={}){
  const pool=await createStagingPool(process.env);
  const store=new MysqlStagingDemoStore(pool,process.env,hooks);
  await store.initializeSchema();
  const roles=new MysqlDemoRoleGate(pool,store,process.env);
  await roles.initializeSchema();
  const p=await store.product({title:'Producto contable de prueba',priceCop:100000,commissionPct:30});
  const a=await store.affiliate({alias:'Afiliado simulado'});
  const other=await store.affiliate({alias:'Afiliado de otro grupo'});
  const link=await store.referral({productId:p.id,affiliateId:a.id});
  return {pool,store,roles,p,a,other,link};
}

test('MySQL real: journal de doble entrada cuadre y reversión en pedido', {skip:!enabled},async()=>{
  const x=await setup();
  try{
    const order=await x.store.simulatedOrder({referralId:x.link.id,requestId:'ledger-'+crypto.randomUUID()});
    const [journals]=await x.pool.execute('SELECT * FROM aff_demo_journals WHERE order_id=?',[order.id]);
    assert.equal(journals.length,1);
    assert.equal(journals[0].event_type,'SIM_ORDER_CREATED');
    const [lines]=await x.pool.execute('SELECT * FROM aff_demo_postings WHERE journal_id=?',[journals[0].id]);
    assert.equal(lines.length,4);
    const debits=lines.filter(p=>p.side==='DEBIT').reduce((v,p)=>v+Number(p.amount_cop),0);
    const credits=lines.filter(p=>p.side==='CREDIT').reduce((v,p)=>v+Number(p.amount_cop),0);
    assert.equal(debits,100000);
    assert.equal(credits,100000);
    assert.equal((await x.store.reconcile()).journals.ok,true);
    await x.store.refund(order.id);
    const [events]=await x.pool.execute('SELECT * FROM aff_demo_journals WHERE order_id=?',[order.id]);
    assert.equal(events.length,2);
    const [allLines]=await x.pool.execute(
      'SELECT p.account_code,p.side,p.amount_cop FROM aff_demo_postings p JOIN aff_demo_journals j ON j.id=p.journal_id WHERE j.order_id=?',
      [order.id]
    );
    assert.equal(allLines.length,8);
    for(const account of ['SIM_CLEARING','SIM_MERCHANT','SIM_AFFILIATE','SIM_ARC']){
      const part=allLines.filter(row=>row.account_code===account);
      const net=part.reduce((n,row)=>n+(row.side==='DEBIT'?1:-1)*Number(row.amount_cop),0);
      assert.equal(net,0,'reversión neta de '+account);
    }
    assert.equal((await x.store.reconcile()).journals.ok,true);
  }finally{await x.pool.end();}
});

test('MySQL real: anulación transaccional no deja journal ni pedido huérfano', {skip:!enabled},async()=>{
  const x=await setup({afterOrderInsert:async()=>{throw new Error('forced-business-failure');}});
  try{
    const request='journal-fail-'+crypto.randomUUID();
    await assert.rejects(
      ()=>x.store.simulatedOrder({referralId:x.link.id,requestId:request}),/forced-business-failure/
    );
    assert.equal(await x.store.byRequest(request),null);
    assert.equal((await x.store.reconcile()).ok,true);
  }finally{await x.pool.end();}
});

test('MySQL real: conciliación detecta un asiento artificialmente alterado', {skip:!enabled},async()=>{
  const x=await setup();
  try{
    const order=await x.store.simulatedOrder({
      referralId:x.link.id,requestId:'journal-tamper-'+crypto.randomUUID()
    });
    const [lines]=await x.pool.execute(
      "SELECT p.id,p.amount_cop FROM aff_demo_postings p JOIN aff_demo_journals j ON j.id=p.journal_id WHERE j.order_id=? AND p.account_code='SIM_ARC'",
      [order.id]
    );
    assert.equal(lines.length,1);
    try{
      await x.pool.execute('UPDATE aff_demo_postings SET amount_cop=amount_cop+1 WHERE id=?',[lines[0].id]);
      const bad=await x.store.reconcile();
      assert.equal(bad.ok,false);
      assert.ok(bad.journals.unbalanced>=1);
    }finally{
      await x.pool.execute('UPDATE aff_demo_postings SET amount_cop=? WHERE id=?',[lines[0].amount_cop,lines[0].id]);
    }
    assert.equal((await x.store.reconcile()).ok,true);
  }finally{await x.pool.end();}
});

test('MySQL real: administrador, comerciante y afiliado tienen acceso limitado por objeto', {skip:!enabled},async()=>{
  const x=await setup();
  try{
    const order=await x.store.simulatedOrder({referralId:x.link.id,requestId:'rbac-'+crypto.randomUUID()});
    const admin=await x.roles.createFixture({role:'SIM_ADMIN'});
    const merchant=await x.roles.createFixture({role:'SIM_MERCHANT',scopeProductId:x.p.id});
    const affiliate=await x.roles.createFixture({role:'SIM_AFFILIATE',scopeAffiliateId:x.a.id});
    const otherAffiliate=await x.roles.createFixture({role:'SIM_AFFILIATE',scopeAffiliateId:x.other.id});
    assert.equal((await x.roles.readOrder(admin,order.id)).id,order.id);
    assert.equal((await x.roles.readOrder(merchant,order.id)).id,order.id);
    assert.equal((await x.roles.readOrder(affiliate,order.id)).id,order.id);
    await assert.rejects(()=>x.roles.readOrder(otherAffiliate,order.id),DemoAccessDenied);
    await assert.rejects(()=>x.roles.refundOrder(affiliate,order.id),DemoAccessDenied);
    await assert.rejects(()=>x.roles.refundOrder(merchant,order.id),DemoAccessDenied);
    await x.roles.disableFixture(affiliate);
    await assert.rejects(()=>x.roles.readOrder(affiliate,order.id),DemoAccessDenied);
    assert.equal((await x.roles.refundOrder(admin,order.id)).status,'SIM_REFUNDED');
    assert.equal((await x.store.reconcile()).ok,true);
  }finally{await x.pool.end();}
});
