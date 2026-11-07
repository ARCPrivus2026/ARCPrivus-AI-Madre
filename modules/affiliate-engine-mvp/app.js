const $ = id => document.getElementById(id);
let marketingCatalog = [];
let marketingCopy = '';
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
  const [sum, products, affiliates, sales, refs, catalog, campaigns] =
    await Promise.all([
      api('summary'),api('products'),api('affiliates'),
      api('sales'),api('referrals'),
      api('marketing/catalog'),api('marketing/overview')
    ]);
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
  marketingCatalog = catalog;
  const selected = $('marketingProductId').value;
  fill('marketingProductId',products,p=>p.title+' — '+cop(p.priceCop));
  if(products.some(p=>p.id===selected))$('marketingProductId').value=selected;
  loadMarketingEditor($('marketingProductId').value);
  renderMarketingCatalog(catalog,campaigns);
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

function renderMarketingCatalog(catalog,overview) {
  $('marketingCatalog').replaceChildren(...catalog.map(p=>
    element('li',p.title+' — '+cop(p.priceCop)+' — '+p.kind+
      ' — revisión '+p.revision+' — BORRADOR, NO PUBLICADO')
  ));
  const t=overview.totals;
  $('marketingTotals').textContent='Visitas DEMO: '+t.clicks+
    ' · Pedidos SIMULADOS vigentes: '+t.simulatedOrders+
    ' · Reembolsos SIMULADOS: '+t.simulatedRefunds+
    ' · Total ficticio atribuido: '+cop(t.demoGrossCop)+
    ' · ARC ficticio: '+cop(t.demoArcCop)+
    ' · Ventas reales: 0 COP.';
  $('marketingCampaigns').replaceChildren(...overview.campaigns.map(c=>{
    const ratio=c.demoOrdersPer100Visits===null?'sin visitas':
      c.demoOrdersPer100Visits+' pedidos simulados por cada 100 visitas';
    return element('li',c.product+' · '+c.affiliate+' · visitas '+c.clicks+
      ' · pedidos demo '+c.simulatedOrders+' · reembolsos demo '+c.simulatedRefunds+
      ' · '+ratio);
  }));
}
function loadMarketingEditor(productId) {
  const p=marketingCatalog.find(x=>x.productId===productId);
  $('marketingKind').value=p?.kind||'DIGITAL_GUIDE';
  $('marketingSlug').value=p?.slug||'';
  $('marketingHeadline').value=p?.headline||'';
  $('marketingAudience').value=p?.audience||'';
  $('marketingSummary').value=p?.summary||'';
  $('marketingHighlights').value=p?.highlights.join('\n')||'';
  $('marketingRevision').textContent='Revisión actual: '+(p?.revision||0)+
    ' · Esta ficha no está publicada.';
}
$('seedDrafts').addEventListener('click',()=>{
  execute(async()=>{
    await api('marketing/seed',{method:'POST',body:'{}'});
    await reload();
    $('message').textContent='Se crearon o recuperaron los tres borradores ficticios. No se ha publicado nada.';
  });
});
$('marketingProductId').addEventListener('change',e=>loadMarketingEditor(e.target.value));
$('marketingEditForm').addEventListener('submit',e=>{
  e.preventDefault();
  const productId=$('marketingProductId').value;
  const before=marketingCatalog.find(p=>p.productId===productId);
  const highlights=$('marketingHighlights').value
    .split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  execute(async()=>{
    await api('marketing/draft',{
      method:'POST',
      body:JSON.stringify({
        productId,slug:$('marketingSlug').value,
        kind:$('marketingKind').value,
        headline:$('marketingHeadline').value,
        audience:$('marketingAudience').value,
        summary:$('marketingSummary').value,
        highlights,expectedRevision:before?.revision||0
      })
    });
    await reload();
    $('marketingProductId').value=productId;
    loadMarketingEditor(productId);
    $('message').textContent='Borrador local guardado. NO ha sido publicado ni vendido.';
  });
});
$('copyPromo').addEventListener('click',()=>{
  execute(async()=>{
    if(!marketingCopy)throw new Error('No existe todavía un texto promocional de prueba.');
    if(!navigator.clipboard?.writeText)throw new Error('El navegador no permite copiar aquí.');
    await navigator.clipboard.writeText(marketingCopy);
    $('message').textContent='Texto de BORRADOR copiado; revísalo antes de cualquier publicación.';
  });
});

async function openReferralPage(){
  const token=new URLSearchParams(location.search).get('ref');
  if (!token) return;
  if (!/^[a-f0-9]{32}$/.test(token)) { $('message').textContent='Enlace de prueba inválido.'; return; }
  try{
    const link=await api('referrals/'+token);
    $('landingInfo').textContent='Producto: '+link.product+' · Afiliado de prueba: '+link.affiliate;
    try {
      const landing=await api('marketing/landing/'+token);
      const draft=landing.page;
      $('landingHeadline').textContent=draft.headline;
      $('landingAudience').textContent='Dirigido a: '+draft.audience;
      $('landingSummary').textContent=draft.summary;
      $('landingHighlights').replaceChildren(...draft.highlights.map(v=>element('li',v)));
      const promo=await api('marketing/promo/'+token);
      marketingCopy=promo.copy;
      $('landingPromo').textContent=marketingCopy;
      $('copyPromo').disabled=false;
    } catch {
      marketingCopy='';
      $('landingHeadline').textContent='Producto de prueba sin ficha redactada';
      $('landingAudience').textContent='Borrador pendiente.';
      $('landingSummary').textContent='Todavía no se ha redactado la descripción de este producto ficticio.';
      $('landingHighlights').replaceChildren();
      $('landingPromo').textContent='Pendiente de contenido comercial.';
      $('copyPromo').disabled=true;
    }
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