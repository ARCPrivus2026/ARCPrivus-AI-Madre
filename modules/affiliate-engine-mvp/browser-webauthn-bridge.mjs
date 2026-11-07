/**
 * ARC Affiliate 1.2 — front-end ceremony bridge ONLY.
 * This module has no UI, no live endpoint, no cookies or network activity.
 * The caller must be a secure-origin, user-initiated browser experience.
 * Here, injected APIs are CI fakes and no live browser authenticators are used.
 */
export class DemoBrowserCeremonyError extends Error {
  constructor(){super('Ceremonia de navegador no completada');this.name='DemoBrowserCeremonyError';}
}

export function createFixtureBrowserCeremony({browser,api}={}){
  for(const name of ['startRegistration','startAuthentication']){
    if(typeof browser?.[name]!=='function')throw new DemoBrowserCeremonyError();
  }
  for(const name of ['registrationOptions','verifyRegistration',
    'authenticationOptions','verifyAuthentication']){
    if(typeof api?.[name]!=='function')throw new DemoBrowserCeremonyError();
  }
  async function execute(optionsFn,browserFn,verifyFn){
    const optionsJSON=await optionsFn();
    if(!optionsJSON||typeof optionsJSON.challenge!=='string'||!optionsJSON.challenge){
      throw new DemoBrowserCeremonyError();
    }
    // Official SimpleWebAuthn browser 14.x API: start*( { optionsJSON } ).
    const response=await browserFn({optionsJSON});
    if(!response||typeof response.id!=='string'||!response.id){
      throw new DemoBrowserCeremonyError();
    }
    const result=await verifyFn(response);
    if(!result||result.verified!==true)throw new DemoBrowserCeremonyError();
    return Object.freeze({verified:true,kind:result.kind||'CI_ONLY'});
  }
  return Object.freeze({
    enroll:()=>execute(api.registrationOptions,browser.startRegistration,api.verifyRegistration),
    authenticate:()=>execute(api.authenticationOptions,browser.startAuthentication,api.verifyAuthentication)
  });
}

/**
 * Call this only from a bundled secure-origin browser entrypoint later.
 * Do NOT import this factory into server.js or publish an endpoint based on it.
 */
export async function loadSimpleWebAuthnBrowser(){
  const library=await import('@simplewebauthn/browser');
  if(typeof library.startRegistration!=='function'||
     typeof library.startAuthentication!=='function'){
    throw new DemoBrowserCeremonyError();
  }
  return library;
}
