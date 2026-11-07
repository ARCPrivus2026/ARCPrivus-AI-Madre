import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSimulatedPostings} from './mysql-staging-journal.mjs';

const order={priceCop:100000,merchantCop:70000,affiliateCop:27000,arcCop:3000};
const amount = (entries,side) => entries.filter(e=>e.side===side).reduce((s,e)=>s+e.amountCop,0);

test('asiento simulado de pedido cuadra: 100000 COP débito y créditos de 70000/27000/3000',()=>{
 const postings=buildSimulatedPostings(order,'SIM_ORDER_CREATED');
 assert.equal(postings.length,4);
 assert.equal(amount(postings,'DEBIT'),100000);
 assert.equal(amount(postings,'CREDIT'),100000);
 assert.deepEqual(postings.filter(p=>p.side==='CREDIT').map(p=>p.amountCop),[70000,27000,3000]);
 assert.equal(postings[0].account,'SIM_CLEARING');
 assert.equal(Object.isFrozen(postings[0]),true);
});

test('reembolso añade asiento inverso, no borra asiento original',()=>{
 const original=buildSimulatedPostings(order,'SIM_ORDER_CREATED');
 const reverse=buildSimulatedPostings(order,'SIM_ORDER_REFUNDED');
 assert.equal(amount(reverse,'DEBIT'),100000);
 assert.equal(amount(reverse,'CREDIT'),100000);
 assert.deepEqual(original.map(x=>x.account),reverse.map(x=>x.account));
 assert.deepEqual(original.map(x=>x.side==='DEBIT'),reverse.map(x=>x.side==='CREDIT'));
});

test('rechaza asientos falsos, desbalanceados o importes negativos',()=>{
 assert.throws(()=>buildSimulatedPostings({...order,arcCop:4000},'SIM_ORDER_CREATED'),/conserva/);
 assert.throws(()=>buildSimulatedPostings({...order,arcCop:-1},'SIM_ORDER_CREATED'),/inválido/);
 assert.throws(()=>buildSimulatedPostings({...order,merchantCop:1.5},'SIM_ORDER_CREATED'),/inválido/);
 assert.throws(()=>buildSimulatedPostings(order,'PAYMENT_SETTLED'),/no reconocido/);
});

test('cero en cuentas opcionales no crea partidas ficticias',()=>{
 const entries=buildSimulatedPostings({priceCop:1000,merchantCop:1000,affiliateCop:0,arcCop:0},'SIM_ORDER_CREATED');
 assert.equal(entries.length,2);
 assert.equal(amount(entries,'DEBIT'),amount(entries,'CREDIT'));
});
