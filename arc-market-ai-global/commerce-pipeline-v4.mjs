// ARC Market AI Global V4. Aislado; sin API, credenciales ni publicación automática.
export const CATALOG=[
  {
    "id": "ARC-TEC-001",
    "name": "Diagnóstico práctico de neveras No Frost y lavadoras | ARC",
    "category": "Formación técnica",
    "mode": "own",
    "hotmartId": 8911108,
    "link": "https://go.hotmart.com/Y108383080U",
    "description": "Guía introductoria PDF de seis páginas: cinco casos orientativos, lista de recepción y matriz de síntomas e hipótesis.",
    "priceCOP": 29900,
    "guaranteeDays": 7,
    "approved": true,
    "evidence": "Producto propio activo y enlace revisado por el titular en la sesión anterior; precio observado en Colombia, sujeto a cambios."
  },
  {
    "id": "ARC-MODA-001",
    "name": "ARNOL RC – Biblioteca visual y estudio de colección",
    "category": "Moda y diseño",
    "mode": "own",
    "hotmartId": 8924110,
    "link": "https://go.hotmart.com/F108405517N",
    "description": "PDF en español con 50 láminas de conceptos visuales generados con IA, diez lecciones escritas introductorias, ejercicios, cuaderno de proyectos y guía escrita de desarrollo. No incluye patrones imprimibles ni videoclases.",
    "priceCOP": 29900,
    "guaranteeDays": 7,
    "approved": true,
    "evidence": "Producto propio activo y enlace revisado por el titular en la sesión anterior; precio observado en Colombia, sujeto a cambios."
  },
  {
    "id": "EXT-821513",
    "name": "Manual práctico de instalación de aire acondicionado Split",
    "category": "Formación técnica",
    "mode": "affiliate",
    "hotmartId": 821513,
    "link": "https://go.hotmart.com/W108641912O",
    "source": "https://hotmart.com/es/marketplace/productos/manual-practico-como-instalar-un-aire-acondicionado-split-paso-a-paso/B32594675J",
    "maxCommissionUSD": 2.67,
    "rating": 5,
    "reviews": 1,
    "approved": false,
    "affiliationEvidence": "HotLinks mostrado por titular 2026-11-24; destino sin verificación independiente.",
    "blockers": [
      "Revisar destino exacto del HotLink",
      "Solicitar muestra y revisar seguridad eléctrica y refrigerantes",
      "Verificar condiciones y derechos de promoción"
    ]
  },
  {
    "id": "EXT-1237207",
    "name": "Lavadoras Xpert",
    "category": "Formación técnica",
    "mode": "affiliate",
    "hotmartId": 1237207,
    "link": "https://go.hotmart.com/J108642052R",
    "source": "https://hotmart.com/es/marketplace/productos/lavadoras-xpert/P46201372U",
    "maxCommissionUSD": 71.67,
    "rating": 4.8,
    "reviews": 13,
    "approved": false,
    "affiliationEvidence": "HotLinks mostrado por titular 2026-11-24; destino sin verificación independiente.",
    "blockers": [
      "Revisar destino exacto del HotLink",
      "Solicitar muestra, temario actualizado y garantía",
      "Confirmar derechos de promoción y seguridad técnica"
    ]
  },
  {
    "id": "EXT-PATRON-PREMIUM",
    "name": "Patronaje Digital Premium",
    "category": "Moda y diseño",
    "mode": "affiliate",
    "link": "https://go.hotmart.com/P108642149F",
    "source": "https://hotmart.com/pt-br/marketplace/especialista/tito-lucero-gonzalez/CZ1JIZ10HM",
    "maxCommissionUSD": 71.67,
    "rating": 5,
    "reviews": 1,
    "approved": false,
    "affiliationEvidence": "HotLinks mostrado por titular 2026-11-24; destino sin verificación independiente.",
    "blockers": [
      "Revisar destino exacto del HotLink",
      "Solicitar temario, muestra y garantía",
      "Confirmar programa de patronaje, licencias y costos adicionales",
      "Confirmar derechos de promoción"
    ]
  },
  {
    "id": "CAND-X80346848A",
    "name": "Inteligencia artificial para emprendedores",
    "category": "Inteligencia artificial",
    "mode": "candidate",
    "source": "https://hotmart.com/es/marketplace/productos/inteligencia-artificial-para-emprendedores/X80346848A",
    "rating": 4.8,
    "reviews": 30,
    "approved": false,
    "blockers": [
      "Verificar afiliación, comisión, precio, garantía, actualización del curso y costos de herramientas"
    ]
  },
  {
    "id": "CAND-I94004538M",
    "name": "Inteligencia artificial para crear contenido",
    "category": "Inteligencia artificial",
    "mode": "candidate",
    "source": "https://hotmart.com/es/marketplace/productos/inteligencia-artificial-para-crear-contenido/I94004538M",
    "rating": 4.8,
    "reviews": 11,
    "approved": false,
    "blockers": [
      "Verificar afiliación, comisión, precio, garantía, actualización del curso y costos de herramientas"
    ]
  },
  {
    "id": "CAND-N90262089Y",
    "name": "Inteligencia Artificial y TICs para la Innovación Educativa",
    "category": "Inteligencia artificial",
    "mode": "candidate",
    "source": "https://hotmart.com/es/marketplace/productos/inteligencia-artificial-aplicada-a-la-educacion/N90262089Y",
    "rating": 4.9,
    "reviews": 259,
    "approved": false,
    "blockers": [
      "Verificar afiliación, precio, comisión, calendario de lanzamiento y condiciones"
    ]
  }
];
export function gate(p) {
 const reasons=[];
 if(!p.approved) reasons.push("No aprobado para difusión");
 if(p.mode!=="own"&&p.mode!=="affiliate") reasons.push("Solo candidato");
 if(!/^https:\/\/go\.hotmart\.com\/[A-Za-z0-9]+$/.test(p.link||"")) reasons.push("HotLink inválido o ausente");
 if(!p.description||!p.name||!p.category) reasons.push("Ficha incompleta");
 if(!Number.isInteger(p.guaranteeDays)||p.guaranteeDays<1) reasons.push("Garantía no documentada");
 if(!p.evidence) reasons.push("Falta evidencia de revisión");
 if(p.mode==="affiliate"&&(!p.affiliationEvidence||!p.destinationVerified||!p.promotionRightsVerified)) reasons.push("Afiliación, destino o derechos no verificados");
 if(p.blockers?.length) reasons.push(...p.blockers);
 if(/ganancias garantizadas|dinero fácil|sin riesgo|resultados garantizados/i.test([p.name,p.description].join(" "))) reasons.push("Promesa no admisible");
 return {ready:reasons.length===0,reasons};
}

export function publicCatalog(rows) {return rows.filter(p=>gate(p).ready).map(({id,name,category,mode,link,description,guaranteeDays})=>({id,name,category,mode,link,description,guaranteeDays,disclosure:mode==="affiliate"?"Podemos recibir una comisión por tu compra.":""}));}

export function prepareDrafts(rows,month,limit=20,used=0) {
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!Number.isInteger(limit)||!Number.isInteger(used)||limit<0||used<0)throw Error("Cuota inválida");
 const available=Math.max(0,limit-used);
 const topics={"ARC-TEC-001":"Antes de cambiar componentes, registra el síntoma y contrasta tus hipótesis de diagnóstico.","ARC-MODA-001":"Organiza referencias, colores y siluetas antes de desarrollar una colección."};
 const channels=["facebook","youtube","tiktok","pinterest","bluesky"];
 const queue=[];
 for(const p of publicCatalog(rows)){
 for(const ch of channels){
 const disclosure=p.disclosure?" "+p.disclosure:"";
 const hook=topics[p.id]||"Conoce qué incluye este recurso educativo.";
 const short=hook+" "+p.name+" — consulta el contenido y las condiciones: "+p.link+disclosure;
 const full=hook+" "+p.description+" Consulta el contenido, precio vigente y condiciones: "+p.link+disclosure;
 const isVideo=ch==="youtube"||ch==="tiktok";
 queue.push({id:month+"-"+p.id+"-"+ch,month,productId:p.id,channel:ch,title:p.name,text:ch==="bluesky"?short:full,mediaRequired:isVideo?"video_vertical":ch==="pinterest"?"imagen_vertical":null,mediaBrief:isVideo?{format:"9:16",durationSeconds:30,narration:hook+" "+p.description,closing:"Consulta el catálogo ARNOL RC.",useOriginalAssets:true}:ch==="pinterest"?{format:"2:3",headline:hook,footer:"ARNOL RC",useOriginalAssets:true}:null,status:"draft",autoPublish:false,spendCOP:0,requiresAssetReview:!!(isVideo||ch==="pinterest"),requiresQuotaCheck:true});
 }
 }
 if(queue.some(x=>x.channel==="bluesky"&&Array.from(x.text).length>300)) throw Error("Texto Bluesky requiere ajuste");
 return {month,limit,used,available,eligibleForManualReview:Math.min(available,queue.length),queue};
}

export function selfTest() {
 const assert=(v,label)=>{if(!v)throw Error(label);};
 const publicRows=publicCatalog(CATALOG);
 assert(publicRows.length===2,"Solo dos propios públicos");
 assert(!publicRows.some(p=>p.mode!=="own"),"No filtrar afiliados sin aprobar");
 assert(!gate({...CATALOG[0],link:"https://go.hotmart.com.evil.example/X"}).ready,"Rechazar host falso");
 assert(!gate({...CATALOG[2],approved:true}).ready,"Aprobación simple no desbloquea afiliado");
 const nov=prepareDrafts(CATALOG,"2026-11",20,20);
 assert(nov.available===0&&nov.eligibleForManualReview===0,"Bloqueo noviembre");
 const dec=prepareDrafts(CATALOG,"2026-12",20,0);
 assert(dec.queue.length===10&&dec.queue.every(x=>!x.autoPublish&&x.spendCOP===0),"Diez borradores sin publicación");
 assert(dec.queue.filter(x=>x.mediaRequired).length===6,"Seis briefs visuales");
 assert(!gate({...CATALOG[0],description:"ganancias garantizadas"}).ready,"Bloqueo promesa");
 return "8 comprobaciones PASS";
}
