const $ = id => document.getElementById(id);
const cop = n => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n);
async function api(path, options) {
  const r = await fetch('/api/' + path, { headers: { 'Content-Type': 'application/json' }, ...options });
  const v = await r.json(); if (!r.ok) throw new Error(v.error || 'Error'); return v;
}
function element(tag, text) { const x = document.createElement(tag); x.textContent = text; return x; }
function fill(id, items, label) {
  $(id).replaceChildren(...items.map(x => { const o=element('option',label(x)); o.value=x.id; return o; }));
}
async function updateIntegrity() {
  try {
    const r = await fetch('/api/integrity', {cache:'no-store'});
    const report = await r.json();
    $('integrity').textContent = report.ok
      ? 'Correcto: no se detectaron diferencias en las operaciones de prueba.'
      : 'ALERTA: se detectaron diferencias. Las nuevas operaciones están bloqueadas.';
    $('integrity').style.color = report.ok ? '#8ff0d6' : '#ffb4a1';
  } catch {
    $('integrity').textContent = 'No se pudo comprobar la consistencia.';
    $('integrity').style.color = '#ffb4a1';
  }
}
async function reload() {
  const [sum, products, affiliates, sales, refs] = await Promise.all([api('summary'),api('products'),api('affiliates'),api('sales'),api('referrals')]);
  $('sales').textContent=sum.sales; $('affiliate').textContent=cop(sum.affiliateCop);
  $('arc').textContent=cop(sum.arcCop); $('gross').textContent=cop(sum.grossCop);
  fill('productId',products,p=>p.title+' — '+cop(p.priceCop));
  fill('affiliateId',affiliates,a=>a.name);
  fill('refProductId',products,p=>p.title);
  fill('refAffiliateId',affiliates,a=>a.name);
  $('products').replaceChildren(...products.map(p=>element('li',p.title+' · '+cop(p.priceCop)+' · '+p.commissionPct+'% comisión')));
  $('affiliates').replaceChildren(...affiliates.map(a=>element('li',a.name+' · Código '+a.code)));
  $('referrals').replaceChildren(...refs.map(r=>{
    const li=element('li',r.product+' · '+r.affiliate+' · visitas: '+r.clicks+' · ');
    const a=element('a','Abrir página de prueba');
    a.href='/?ref='+encodeURIComponent(r.token);
    li.append(a);
    return li;
  }));
  $('history').replaceChildren(...sales.map(s=>{
    const li=document.createElement('li');
    li.append(element('span',s.product+' | '+s.affiliate+' | '+cop(s.priceCop)+' | ARC '+cop(s.arcCop)+' | '+s.status));
    if(s.status==='DEMO_CONFIRMED') {
      const b=element('button','Simular reembolso');
      b.addEventListener('click',()=>execute(async()=>{await api('demo-sales/'+s.id+'/refund',{method:'POST',body:'{}'});await reload();}));
      li.append(b);
    }
    return li;
  }));
  await updateIntegrity();
}
async function execute(fn) {
  try { await fn(); $('message').textContent='Operación de demostración completada.'; }
  catch(e){ $('message').textContent='Aviso: '+e.message; }
}
$('productForm').addEventListener('submit',e=>{
  e.preventDefault(); const f=new FormData(e.currentTarget);
  execute(async()=>{await api('products',{method:'POST',body:JSON.stringify({title:f.get('title'),priceCop:Number(f.get('priceCop')),commissionPct:Number(f.get('commissionPct'))})});await reload();});
});
$('affiliateForm').addEventListener('submit',e=>{
  e.preventDefault(); const f=new FormData(e.currentTarget);
  execute(async()=>{await api('affiliates',{method:'POST',body:JSON.stringify({name:f.get('name')})});await reload();});
});
$('saleForm').addEventListener('submit',e=>{
  e.preventDefault(); execute(async()=>{await api('demo-sales',{method:'POST',body:JSON.stringify({productId:$('productId').value,affiliateId:$('affiliateId').value,requestId:crypto.randomUUID()})});await reload();});
});
$('refForm').addEventListener('submit',e=>{
  e.preventDefault();
  execute(async()=>{
    await api('referrals',{method:'POST',body:JSON.stringify({
      productId:$('refProductId').value,affiliateId:$('refAffiliateId').value
    })});
    await reload();
  });
});
async function openReferralPage(){
  const token=new URLSearchParams(location.search).get('ref');
  if (!token) return;
  if (!/^[a-f0-9]{32}$/.test(token)) { $('message').textContent='Enlace de prueba inválido.'; return; }
  try{
    const link=await api('referrals/'+token);
    $('landingInfo').textContent='Producto: '+link.product+' · Afiliado: '+link.affiliate;
    $('landing').hidden=false;
    $('simulatePurchase').addEventListener('click',()=>execute(async()=>{
      await api('referrals/'+token+'/demo-sale',{method:'POST',
        body:JSON.stringify({requestId:crypto.randomUUID()})});
      await reload();
    }));
    await api('referrals/'+token+'/visit',{method:'POST',body:'{}'});
    await reload();
  }catch(e){$('message').textContent='No se pudo abrir el enlace: '+e.message;}
}
execute(async()=>{await reload();await openReferralPage();});