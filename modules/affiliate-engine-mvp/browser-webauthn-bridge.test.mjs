import test from 'node:test';
import assert from 'node:assert/strict';
import {createFixtureBrowserCeremony,DemoBrowserCeremonyError} from './browser-webauthn-bridge.mjs';

const options={challenge:'synthetic-challenge',rp:{id:'localhost'}};
test('bridge browser: pasa optionsJSON al cliente oficial y remite aserción a su verificador',async()=>{
 const events=[];
 const browser={
  async startRegistration({optionsJSON}){
   assert.equal(optionsJSON,options);
   events.push('browser-create');return {id:'credential',type:'public-key'};
  },
  async startAuthentication({optionsJSON}){
   assert.equal(optionsJSON,options);
   events.push('browser-get');return {id:'credential',type:'public-key'};
  }
 };
 const api={
  async registrationOptions(){events.push('registration-options');return options;},
  async verifyRegistration(body){assert.equal(body.id,'credential');events.push('registration-verify');return {verified:true,kind:'registered'};},
  async authenticationOptions(){events.push('auth-options');return options;},
  async verifyAuthentication(body){assert.equal(body.id,'credential');events.push('auth-verify');return {verified:true,kind:'authenticated'};}
 };
 const b=createFixtureBrowserCeremony({browser,api});
 assert.equal((await b.enroll()).kind,'registered');
 assert.equal((await b.authenticate()).kind,'authenticated');
 assert.deepEqual(events,[
  'registration-options','browser-create','registration-verify',
  'auth-options','browser-get','auth-verify'
 ]);
});
test('bridge browser: falla cerrado cuando navegador, opciones o verificador no están disponibles',async()=>{
 assert.throws(()=>createFixtureBrowserCeremony({}),DemoBrowserCeremonyError);
 const browser={
   startRegistration:async()=>({id:'cred'}),
   startAuthentication:async()=>({id:'cred'})
 };
 const api={
   registrationOptions:async()=>({challenge:'x'}),
   verifyRegistration:async()=>({verified:false}),
   authenticationOptions:async()=>({}),
   verifyAuthentication:async()=>({verified:true})
 };
 const bridge=createFixtureBrowserCeremony({browser,api});
 await assert.rejects(()=>bridge.enroll(),DemoBrowserCeremonyError);
 await assert.rejects(()=>bridge.authenticate(),DemoBrowserCeremonyError);
});
