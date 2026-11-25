// Read-only V5 bridge for normalized ARC_MARKET_SYNC_V4 reports. No network or publication.
export function reconcileOwnProducts(catalog,report,{now=new Date().toISOString(),maxAgeMs=86400000}={}){
 if(!Array.isArray(catalog)||!Number.isSafeInteger(maxAgeMs)||maxAgeMs<=0||!Number.isFinite(Date.parse(now)))throw Error("Configuración inválida");
 const expected=catalog.filter(p=>p.mode==="own"&&p.approved===true);
 if(!expected.length||expected.some(p=>!Number.isSafeInteger(p.hotmartId)||p.hotmartId<=0||!p.id)||new Set(expected.map(p=>p.hotmartId)).size!==expected.length)throw Error("Identidad de catálogo inválida");
 const problems=[];
 const age=Date.parse(now)-Date.parse(report?.generated_at);
 if(report?.mode!=="READ_ONLY"||report?.version!==4)problems.push("Formato de sincronización no reconocido");
 if(report?.status!=="CORE_PASS"||!Array.isArray(report?.errors)||report.errors.length)problems.push("Sincronización incompleta");
 if(!Number.isFinite(age)||age<0||age>maxAgeMs)problems.push("Informe ausente, futuro o desactualizado");
 const source=Array.isArray(report?.catalog)?report.catalog:[];
 if(!Array.isArray(report?.catalog))problems.push("Catálogo de origen ausente");
 if(source.some(p=>!p||!Number.isSafeInteger(p.id)||p.id<=0)||new Set(source.map(p=>p?.id)).size!==source.length)problems.push("Identificadores inválidos o duplicados");
 const normalized=s=>String(s??"").normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
 const cleanSummary=arr=>Array.isArray(arr)&&arr.every(x=>Number.isSafeInteger(x?.count)&&x.count>=0&&((x.count===0&&x.amount===null&&x.currency===null)||(Number.isFinite(x.amount)&&x.amount>=0&&/^[A-Z]{3}$/.test(x.currency))))?arr.map(({count,amount,currency})=>({count,amount,currency})):null;
 const cleanCommissions=v=>v&&Number.isSafeInteger(v.transaction_rows)&&v.transaction_rows>=0&&Array.isArray(v.producer_entries)&&v.producer_entries.every(x=>Number.isFinite(x?.amount)&&x.amount>=0&&/^[A-Z]{3}$/.test(x.currency))?{transactionRows:v.transaction_rows,producerEntries:v.producer_entries.map(({amount,currency})=>({amount,currency}))}:null;
 const rows=expected.map(p=>{
  const found=source.find(x=>x?.id===p.hotmartId),blockers=[...problems];
  if(!found)blockers.push("Producto no devuelto por Hotmart");
  else {
   if(found.status!=="ACTIVE")blockers.push("Producto no activo");
   if(!normalized(found.name)||normalized(found.name)!==normalized(p.name))blockers.push("Nombre diferente: revisar identidad");
   if(!Number.isSafeInteger(found.warranty_days)||found.warranty_days<1||found.warranty_days!==p.guaranteeDays)blockers.push("Garantía sin confirmar o modificada");
  }
  const complete=cleanSummary(found?.complete),producerCommissions=cleanCommissions(found?.producer_commissions);
  return {id:p.id,hotmartId:p.hotmartId,name:p.name,eligibleForPreview:!blockers.length,blockers,metrics:blockers.length?{complete:null,producerCommissions:null}:{complete,producerCommissions}};
 });
 return {checkedAt:now,sourceGeneratedAt:typeof report?.generated_at==="string"?report.generated_at:null,mode:"READ_ONLY_RECONCILIATION",status:rows.every(r=>r.eligibleForPreview)?"PREVIEW_READY":"BLOCKED",problems,rows,pricesVerified:false,affiliateCatalogVerified:false,payoutBalanceVerified:false,autoPublish:false,spendCOP:0};
}

export function selfTestReconciliation(){
 const now="2026-11-24T22:00:00-05:00";
 const catalog=[{id:"own1",mode:"own",approved:true,hotmartId:1,name:"Prueba técnica",guaranteeDays:7},{id:"affiliate",mode:"affiliate",approved:true,hotmartId:2,name:"Otro",guaranteeDays:7}];
 const p={id:1,name:"Prueba técnica",status:"ACTIVE",warranty_days:7,complete:[{count:1,amount:7.24,currency:"USD",secret:"fixture"}],producer_commissions:{transaction_rows:1,producer_entries:[{amount:7.24,currency:"USD",extra:"fixture"}]}};
 const report={version:4,mode:"READ_ONLY",status:"CORE_PASS",generated_at:now,errors:[],catalog:[p]};
 const run=(r=report)=>reconcileOwnProducts(catalog,r,{now});
 const assert=(b,m)=>{if(!b)throw Error(m)};
 const v=run();assert(v.status==="PREVIEW_READY"&&v.rows.length===1,"own only");
 assert(v.rows[0].metrics.complete[0].amount===7.24,"amount");
 assert(!JSON.stringify(v).includes("fixture"),"allowlist");
 assert(!v.pricesVerified&&!v.affiliateCatalogVerified&&!v.payoutBalanceVerified&&!v.autoPublish&&v.spendCOP===0,"no claims");
 assert(run({...report,status:"PARTIAL"}).status==="BLOCKED","partial");
 assert(run({...report,errors:["error"]}).status==="BLOCKED","errors");
 assert(run({...report,generated_at:"2026-11-22T00:00:00-05:00"}).status==="BLOCKED","stale");
 assert(run({...report,generated_at:"2026-11-25T00:00:00-05:00"}).status==="BLOCKED","future");
 assert(run({...report,catalog:[]}).status==="BLOCKED","missing");
 assert(run({...report,catalog:[p,p]}).status==="BLOCKED","duplicate");
 assert(run({...report,catalog:[{...p,status:"INACTIVE"}]}).status==="BLOCKED","inactive");
 assert(run({...report,catalog:[{...p,name:"Different"}]}).status==="BLOCKED","identity");
 assert(run({...report,catalog:[{...p,warranty_days:15}]}).status==="BLOCKED","warranty");
 assert(run({...report,catalog:[{...p,complete:null}]}).rows[0].metrics.complete===null,"unavailable not zero");
 assert(run({...report,catalog:[{...p,complete:[{count:1,amount:"7",currency:"USD"}]}]}).rows[0].metrics.complete===null,"invalid amount");
 assert(run({...report,status:"PARTIAL"}).rows[0].metrics.complete===null,"no stale metrics");
 assert(run({...report,catalog:[{...p,name:"Different"}]}).rows[0].metrics.complete===null,"no misattributed metrics");
 return "17/17 PASS";
}
