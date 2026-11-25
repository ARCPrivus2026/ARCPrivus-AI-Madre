"use strict";
function audit(p){
 const missing=["name","audience","deliverable","source","reviewer","terms","link"].filter(k=>!String(p[k]||"").trim());
 const bad=/ganancias? garantizadas?|dinero garantizado|sin riesgo|hazte millonario|resultados garantizados|testimonio inventado|ingresos asegurados/i;
 if(bad.test([p.name,p.deliverable,p.copy].join(" ")))missing.push("afirmación prohibida");
 if(!/^https:\/\/(?:pay\.hotmart\.com|go\.hotmart\.com|hotmart\.com)\/[^\s\\]+$/i.test(p.link||""))missing.push("enlace Hotmart no admitido");
 if(!p.rights)missing.push("derechos y autorización");if(!p.verified)missing.push("revisión documentada del contenido");if(p.kind==="affiliate"&&!p.affiliateApproved)missing.push("afiliación autorizada");
 if(!Number.isSafeInteger(p.price)||p.price<=0)missing.push("precio positivo");
 return {ready:missing.length===0,missing};
}

function campaign(p){
 const intro=`${p.name}: ${p.deliverable}. Dirigido a ${p.audience}.`;
 const disclosure=p.kind==="affiliate"?" Enlace de afiliado: podemos recibir una comisión.":"";
 return [{channel:"Facebook",text:`${intro} Consulta contenido, precio y condiciones antes de comprar.${disclosure}`},{channel:"WhatsApp",text:`¿Te interesa ${p.name}? ${p.deliverable}. Si deseas conocer la información completa, solicítala.${disclosure}`},{channel:"Video corto",text:`Pregunta inicial: ¿qué necesitas aprender sobre ${p.name}? Explica una idea útil, muestra una demostración real y presenta el material disponible. No prometas resultados.${disclosure}`}];
}

function finance(rows){
 const totals={income:0,refund:0,fees:0,ads:0,costs:0,tax:0};
 for(const r of rows){if(!Object.hasOwn(totals,r.kind)||!Number.isSafeInteger(r.amount)||r.amount<0||!String(r.ref||"").trim())throw Error("Movimiento inválido"); totals[r.kind]+=r.amount;if(!Number.isSafeInteger(totals[r.kind]))throw Error("Importe excedido");}
 return {...totals,net:totals.income-totals.refund-totals.fees-totals.ads-totals.costs-totals.tax,roas:totals.ads>0?totals.income/totals.ads:null};
}
 globalThis.ARCMarket=Object.freeze({audit,campaign,finance});
