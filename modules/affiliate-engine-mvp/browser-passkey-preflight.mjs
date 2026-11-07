/**
 * ARC Affiliate 1.3: browser readiness ONLY for a future local trial.
 * Never touches credentials, starts a server or makes a network request.
 * Does not claim that a physical authenticator was tested.
 */
export const LAB_PASSKEY_ORIGIN='http://localhost:3198';

export function inspectLocalPasskeyBrowser(env){
  const origin=env?.origin;
  if(origin!==LAB_PASSKEY_ORIGIN){
    return Object.freeze({ready:false,reason:'WRONG_ORIGIN',deviceTested:false});
  }
  if(env?.isSecureContext!==true){
    return Object.freeze({ready:false,reason:'NOT_SECURE_CONTEXT',deviceTested:false});
  }
  if(typeof env?.credentials?.create!=='function'||
     typeof env?.credentials?.get!=='function'||
     env?.publicKeyCredentialAvailable!==true){
    return Object.freeze({ready:false,reason:'WEBAUTHN_NOT_SUPPORTED',deviceTested:false});
  }
  return Object.freeze({
    ready:true,reason:'BROWSER_CAPABILITIES_PRESENT',deviceTested:false,
    notice:'No se realizó inscripción ni verificación de ningún dispositivo físico.'
  });
}

/**
 * This is strictly an inert report. A real browser trial will need a
 * user-initiated secure-local ceremony, origin validation and server session.
 */
export function browserReadinessFromGlobals(scope){
  if(!scope || typeof scope!=='object')return inspectLocalPasskeyBrowser(null);
  return inspectLocalPasskeyBrowser({
    origin:scope.location?.origin,
    isSecureContext:scope.isSecureContext,
    credentials:scope.navigator?.credentials,
    publicKeyCredentialAvailable:typeof scope.PublicKeyCredential==='function'
  });
}
