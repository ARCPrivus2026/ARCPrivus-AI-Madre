import test from 'node:test';
import assert from 'node:assert/strict';
import {checkDemoPermission,DemoAccessDenied,MysqlDemoRoleGate} from './mysql-staging-access.mjs';

const admin={role:'SIM_ADMIN',enabled:true,scope_product_id:null,scope_affiliate_id:null};
const merchant={role:'SIM_MERCHANT',enabled:true,scope_product_id:'product-a',scope_affiliate_id:null};
const affiliate={role:'SIM_AFFILIATE',enabled:true,scope_product_id:null,scope_affiliate_id:'affiliate-a'};

test('roles: administrador puede revisar y reembolsar pero no pagar dinero real',()=>{
  assert.equal(checkDemoPermission(admin,'order.refund'),true);
  assert.equal(checkDemoPermission(admin,'audit.read'),true);
  assert.equal(checkDemoPermission(admin,'payout.execute'),false);
  assert.equal(checkDemoPermission(admin,'payment.charge'),false);
});

test('roles: comerciantes y afiliados solo pueden leer su propio alcance',()=>{
  assert.equal(checkDemoPermission(merchant,'order.read',{productId:'product-a'}),true);
  assert.equal(checkDemoPermission(merchant,'order.read',{productId:'product-b'}),false);
  assert.equal(checkDemoPermission(merchant,'order.refund',{productId:'product-a'}),false);
  assert.equal(checkDemoPermission(affiliate,'order.read',{affiliateId:'affiliate-a'}),true);
  assert.equal(checkDemoPermission(affiliate,'order.read',{affiliateId:'affiliate-b'}),false);
  assert.equal(checkDemoPermission(affiliate,'catalog.manage'),false);
});

test('roles: rechaza identidades anónimas, desactivadas o scopes inconsistentes',()=>{
  assert.equal(checkDemoPermission(null,'order.read'),false);
  assert.equal(checkDemoPermission({},'order.read'),false);
  assert.equal(checkDemoPermission({...admin,enabled:false},'order.refund'),false);
  assert.equal(checkDemoPermission({...merchant,scope_affiliate_id:'x'},'order.read',{productId:'product-a'}),false);
  assert.equal(checkDemoPermission({...affiliate,scope_product_id:'x'},'order.read',{affiliateId:'affiliate-a'}),false);
  assert.equal(checkDemoPermission({...admin,role:'SUPERUSER'},'order.read'),false);
  assert.equal(new DemoAccessDenied().name,'DemoAccessDenied');
});

test('roles: la puerta de datos no puede crearse sin entorno CI aislado',()=>{
  assert.throws(()=>new MysqlDemoRoleGate({}, {}, {}));
});
