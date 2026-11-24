"use strict";
function assess(p,now){
 const missing=[];
 if(!p.id||!p.name||!p.category||!p.audience||!p.deliverable)missing.push("ficha incompleta");
 if(!["own","affiliate","coproduction"].includes(p.mode))missing.push("modelo comercial inválido");
 if(!p.qualityEvidence||!p.reviewer||!p.rightsEvidence||!p.termsEvidence)missing.push("evidencia de calidad, derechos y condiciones");
 if(!p.verifiedAt||!Number.isFinite(Date.parse(p.verifiedAt))||Date.parse(p.verifiedAt)>now||now-Date.parse(p.verifiedAt)>30*86400000)missing.push("revisión vencida o inexistente");
 if(!Number.isSafeInteger(p.priceMinor)||p.priceMinor<=0||!/^[A-Z]{3}$/.test(p.currency||""))missing.push("precio y moneda no verificados");
 if(!/^https:\/\/(?:go\.hotmart\.com|pay\.hotmart\.com)\/[A-Za-z0-9][A-Za-z0-9_?&=.%+/#-]*$/.test(p.hotlink||""))missing.push("Hotlink autorizado");
 if(p.mode==="affiliate"&&!/^https:\/\/go\.hotmart\.com\//.test(p.hotlink||""))missing.push("enlace de afiliado requerido");
 if(!p.authorizationEvidence||p.approval!=="approved")missing.push("autorización comercial");
 if(/(?:ganancias? garantizadas?|sin riesgo|hazte millonario|dinero fácil|ingresos asegurados)/i.test([p.name,p.deliverable,p.copy].join(" ")))missing.push("afirmación prohibida");
 return {ready:!missing.length,missing};
}

function rank(p){const v=p.validation||{};const n=k=>Number.isSafeInteger(v[k])&&v[k]>=0?v[k]:0;return {responses:n("responses"),interested:Math.min(n("responses"),n("interested")),sales:n("sales"),refunds:Math.min(n("sales"),n("refunds"))};}

function kit(p){return {id:p.id,disclosure:p.mode==="affiliate"?"Publicidad con enlace de afiliado; ARC puede recibir una comisión.":p.mode==="coproduction"?"ARC puede participar en los ingresos de este producto.":"Producto propio de ARC, sujeto a validación.",posts:[{channel:"Facebook",format:"educativo",copy:`¿Te interesa ${p.category}? ${p.name}. ${p.deliverable} Consulta la descripción y condiciones vigentes.`},{channel:"Instagram/Reels",format:"guion",copy:`Explica un problema de ${p.category}, demuestra una solución que puedas comprobar y muestra únicamente material autorizado de ${p.name}.`},{channel:"WhatsApp",format:"respuesta solicitada",copy:`Gracias por tu interés en ${p.name}. Te compartimos su descripción y condiciones para que decidas sin presión.`},{channel:"Blog",format:"artículo",copy:`Guía de compra: qué revisar antes de elegir recursos de ${p.category}. Evalúa temario, nivel, soporte, precio y garantía.`}],status:"draft",adBudgetMinor:0};}

function allocation(s){const keys=["grossMinor","refundMinor","platformFeeMinor","affiliateMinor","coproducerMinor","costMinor","taxMinor"];if(!keys.every(k=>Number.isSafeInteger(s[k])&&s[k]>=0))throw Error("Importes inválidos");const sum=keys.slice(1).reduce((a,k)=>a+s[k],0);if(!Number.isSafeInteger(sum))throw Error("Importe excedido");return {currency:s.currency,creatorNetMinor:s.grossMinor-sum,affiliateMinor:s.affiliateMinor,coproducerMinor:s.coproducerMinor,platformFeeMinor:s.platformFeeMinor,kind:"scenario_not_settlement"};}
globalThis.ARCNetwork=Object.freeze({assess,rank,kit,allocation});
