// Isolated manual handoff guard. No network, no credentials, no publication.
export function buildHandoff({drafts,quota,reviewedIds=[],approvedProducts=[],assetEvidence={},existingIds=[],stop=true,now}) {
 if(!drafts||!Array.isArray(drafts.queue)||!quota||typeof now!=="string"||!Number.isFinite(Date.parse(now)))throw Error("Entrada inválida");
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(drafts.month))throw Error("Mes inválido");
 const validQuota=quota.confirmed===true&&quota.month===drafts.month&&Number.isSafeInteger(quota.limit)&&Number.isSafeInteger(quota.used)&&quota.limit>=0&&quota.used>=0&&quota.checkedAt&&Number.isFinite(Date.parse(quota.checkedAt))&&Date.parse(quota.checkedAt)<=Date.parse(now)&&Date.parse(now)-Date.parse(quota.checkedAt)<=86400000;
 let remaining=validQuota?Math.max(0,quota.limit-quota.used):0;
 const approved=new Set(approvedProducts),reviewed=new Set(reviewedIds),seen=new Set(existingIds);
 const rows=[];
 for(const d of drafts.queue){
 const blockers=[];
 if(stop!==false)blockers.push("Parada de seguridad activa");
 if(!validQuota)blockers.push("Cuota no confirmada o desactualizada");
 if(!d.id||d.month!==drafts.month||!["facebook","youtube","tiktok","pinterest","bluesky"].includes(d.channel))blockers.push("Identidad de borrador inválida");
 if(d.status!=="draft"||d.autoPublish!==false||d.spendCOP!==0)blockers.push("Borrador no seguro");
 if(!approved.has(d.productId))blockers.push("Producto no habilitado");
 if(!reviewed.has(d.id))blockers.push("Revisión editorial pendiente");
 if(seen.has(d.id))blockers.push("Duplicado");
 if(typeof d.text!=="string"||!d.text.trim()||/ganancias garantizadas|dinero fácil|sin riesgo|resultados garantizados/i.test(d.text))blockers.push("Texto no admisible");
 if(d.channel==="bluesky"&&Array.from(d.text||"").length>300)blockers.push("Texto Bluesky demasiado largo");
 const required=["youtube","tiktok"].includes(d.channel)?"video_vertical":d.channel==="pinterest"?"imagen_vertical":null;
 if(required||d.mediaRequired){
 const a=assetEvidence[d.id];
 if(!a||a.reviewed!==true||a.rightsConfirmed!==true||a.format!==(required||d.mediaRequired)||!a.ref)blockers.push("Multimedia y derechos pendientes");
 }
 if(remaining<=0)blockers.push("Sin cupo disponible");
 const eligible=blockers.length===0;
 if(eligible)remaining--;
 if(d.id)seen.add(d.id);
 rows.push({id:d.id,productId:d.productId,channel:d.channel,eligibleForManualHandoff:eligible,blockers,autoPublish:false,spendCOP:0});
 }
 return {month:drafts.month,quotaVerified:!!validQuota,stop:stop!==false,eligible:rows.filter(r=>r.eligibleForManualHandoff).length,rows,automaticPublishingImplemented:false};
}

export function selfTestHandoff(){
 const now="2026-12-01T12:00:00-05:00";
 const d={id:"test",month:"2026-12",channel:"facebook",productId:"own",status:"draft",autoPublish:false,spendCOP:0,text:"Recurso educativo"};
 const base={drafts:{month:d.month,queue:[d]},quota:{confirmed:true,month:d.month,limit:20,used:19,checkedAt:now},reviewedIds:[d.id],approvedProducts:["own"],stop:false,now};
 const assert=(v,m)=>{if(!v)throw Error(m)};
 const ok=x=>buildHandoff(x).eligible;
 assert(ok(base)===1,"eligible");
 assert(ok({...base,stop:true})===0,"stop");
 assert(ok({...base,quota:{...base.quota,confirmed:false}})===0,"unknown quota");
 assert(ok({...base,quota:{...base.quota,checkedAt:"2026-11-28T00:00:00-05:00"}})===0,"stale");
 assert(ok({...base,quota:{...base.quota,used:20}})===0,"exhausted");
 assert(ok({...base,existingIds:[d.id]})===0,"duplicate");
 assert(ok({...base,reviewedIds:[]})===0,"unreviewed");
 assert(ok({...base,approvedProducts:[]})===0,"unapproved");
 assert(ok({...base,drafts:{...base.drafts,queue:[{...d,channel:"youtube"}]}})===0,"missing media");
 assert(ok({...base,drafts:{...base.drafts,queue:[{...d,channel:"youtube"}]},assetEvidence:{test:{reviewed:true,rightsConfirmed:true,format:"video_vertical",ref:"fixture"}}})===1,"media reviewed");
 assert(ok({...base,drafts:{...base.drafts,queue:[{...d,spendCOP:1}]}})===0,"spend");
 assert(ok({...base,drafts:{...base.drafts,queue:[{...d,autoPublish:true}]}})===0,"automatic");
 assert(ok({...base,drafts:{...base.drafts,queue:[d,{...d,id:"test2"}]},reviewedIds:["test","test2"]})===1,"cap");
 assert(ok({...base,drafts:{...base.drafts,queue:[d,d]},quota:{...base.quota,used:0}})===1,"duplicate in batch");
 return "14/14 PASS";
}
