/* ARC Affiliate 1.4 - LOCAL LAB ONLY. No production, bank or real user data. */
(()=>{'use strict';
const token=new URL(location.href).searchParams.get('lab');
if(token)history.replaceState(null,'',location.pathname);
const $=id=>document.getElementById(id);
const currency=n=>new Intl.NumberFormat('es-CO',{
  style:'currency',currency:'COP',maximumFractionDigits:0
}).format(n);
const controls=['register','ack','verify','execute'];
let state=null,grantReady=false,busy=false;
function message(text){$('message').textContent=text;}
function update(){
  const ready=state?.order?.status==='SIM_CONFIRMED';
  const compatible=window.isSecureContext===true &&
    typeof window.PublicKeyCredential==='function' &&
    !!navigator.credentials?.create && !!navigator.credentials?.get &&
    !!window.SimpleWebAuthnBrowser?.startRegistration &&
    !!window.SimpleWebAuthnBrowser?.startAuthentication;
  $('compatibility').textContent=compatible?
    'WebAuthn disponible en este contexto. Aún NO se ha probado el dispositivo.':
    'WebAuthn no está disponible o faltan sus componentes. No se puede continuar.';
  $('register').disabled=busy||!compatible||!ready||!token||!!state?.credentialRegistered;
  $('ack').disabled=busy||!ready||!state?.credentialRegistered;
  $('verify').disabled=busy||!compatible||!ready||!$('ack').checked||!state?.credentialRegistered;
  $('execute').disabled=busy||!ready||!grantReady;
}
function render(){
  if(!state){update();return;}
  const o=state.order;
  $('product').textContent=o.title;
  $('order-id').textContent=o.id;
  $('price').textContent=currency(o.priceCop);
  $('merchant').textContent=currency(o.merchantCop);
  $('affiliate').textContent=currency(o.affiliateCop);
  $('arc').textContent=currency(o.arcCop);
  $('order-status').textContent=o.status==='SIM_CONFIRMED'?'PEDIDO FICTICIO':'REEMBOLSADO EN SIMULACIÓN';
  if(o.status!=='SIM_CONFIRMED'){$('ack').checked=false;grantReady=false;}
  update();
}
async function api(path,body){
  if(!token)throw Error('Falta la clave temporal del laboratorio. Abre el enlace indicado en la consola.');
  const request={method:body===undefined?'GET':'POST',
    headers:{'X-Lab-Token':token,'X-Lab-CSRF':'lab-user-action'}};
  if(body!==undefined){
    request.headers['Content-Type']='application/json';
    request.body=JSON.stringify(body);
  }
  const response=await fetch(path,request);
  let data;
  try{data=await response.json();}catch{throw Error('Respuesta de laboratorio no válida');}
  if(!response.ok)throw Error('El servidor rechazó la operación ('+(data.error||response.status)+').');
  return data;
}
async function refresh(){
  state=await api('/api/order');
  render();
}
async function withBusy(callback){
  if(busy)return;
  busy=true;update();
  try{await callback();}
  catch(error){
    grantReady=false;
    message('No se completó la operación: '+(error?.message||'error de prueba'));
  }
  finally{busy=false;update();}
}
$('ack').addEventListener('change',()=>{
  grantReady=false;update();
});
$('register').addEventListener('click',()=>withBusy(async()=>{
  if(!window.confirm('Vas a registrar una PASSKEY FICTICIA para localhost. Puede quedar guardada en el dispositivo o gestor de contraseñas aunque cierres el laboratorio. ¿Continuar?')){
    message('Registro cancelado, no se creó ninguna credencial.');return;
  }
  message('Solicitando registro local de una credencial de prueba…');
  const optionsJSON=await api('/api/passkey/register/options',{});
  const response=await window.SimpleWebAuthnBrowser.startRegistration({optionsJSON});
  await api('/api/passkey/register/verify',{response});
  $('ack').checked=false;
  await refresh();
  message('Passkey de prueba registrada. Revisa el pedido antes de autorizar una simulación.');
}));
$('verify').addEventListener('click',()=>withBusy(async()=>{
  if(!$('ack').checked||!state||state.order.status!=='SIM_CONFIRMED')
    throw Error('Primero debes revisar y confirmar el pedido ficticio.');
  const order=state.order;
  const digest=state.digest;
  grantReady=false;
  message('Verifica en tu navegador la passkey para ESTE pedido ficticio.');
  const optionsJSON=await api('/api/refund/options',{
    orderId:order.id,digest,acknowledged:true
  });
  const response=await window.SimpleWebAuthnBrowser.startAuthentication({optionsJSON});
  const result=await api('/api/refund/verify',{orderId:order.id,digest,response});
  if(!result.verified)throw Error('Verificación de prueba no aprobada.');
  grantReady=true;
  message('Passkey verificada. Permiso temporal de 60 segundos, solo para el pedido mostrado. Si caduca, vuelve a verificar.');
}));
$('execute').addEventListener('click',()=>withBusy(async()=>{
  if(!grantReady||!state||!$('ack').checked)
    throw Error('Falta una confirmación específica del pedido.');
  // Deliberate second human-visible confirmation, no automatic refund action.
  if(!window.confirm('¿Ejecutar el REEMBOLSO SOLO SIMULADO del pedido '+state.order.id+
      ' por '+currency(state.order.priceCop)+'? No mueve dinero.')){
    message('Simulación cancelada.');return;
  }
  grantReady=false;
  const result=await api('/api/refund/execute',{
    orderId:state.order.id,digest:state.digest
  });
  state.order=result.order;
  render();
  $('receipt').textContent='Comprobante FICTICIO: '+result.receipt.operation+
    ' · Pedido '+result.receipt.orderId+' · '+currency(result.receipt.amountCop)+
    ' · Dinero real: NO';
  message('REEMBOLSO SIMULADO completado. No se ha movido dinero.');
}));
(async()=>{
  try{
    if(!token){message('Abre el enlace temporal mostrado al iniciar el servidor de laboratorio.');return;}
    await refresh();
    message('Pedido ficticio cargado. Revisa sus datos antes de registrar o utilizar una passkey.');
  }catch(error){message('No se pudo iniciar: '+(error?.message||'error'));}
  finally{update();}
})();
})();
