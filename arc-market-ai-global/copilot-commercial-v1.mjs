// ARC Copilot commercial advisory module. No network, credentials, write actions or student access.
// Inputs must be obtained by an authorized server adapter; source labels are not authentication.
export function summarizePlanner(rows,month){
 if(!Array.isArray(rows)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error("Entrada de calendario inválida");
 const byNetwork={},seen=new Set();let entries=0;
 for(const p of rows){
  if(typeof p?.publicationDate?.dateTime!=="string"||!p.publicationDate.dateTime.startsWith(month+"-"))continue;
  if(p.draft===true)continue;
  const id=String(p.uuid??p.id??"");if(!id||!Array.isArray(p.providers)||!p.providers.length)throw Error("Entrada sin identidad o redes");
  const networks=new Set();let counted=false;
  for(const q of p.providers){
   if(!["facebook","bluesky","youtube","tiktok","pinterest","instagram","linkedin","threads","twitter","gmb"].includes(q?.network))throw Error("Red no reconocida");
   if(networks.has(q.network))throw Error("Red duplicada en entrada");networks.add(q.network);
   const key=id+"|"+q.network;if(seen.has(key))throw Error("Entrada duplicada");seen.add(key);counted=true;
   const n=byNetwork[q.network]??={published:0,pending:0,failed:0,unknown:0};
   const status=String(q.status??"").toUpperCase();
   n[status==="PUBLISHED"?"published":status==="PENDING"?"pending":status==="FAILED"?"failed":"unknown"]++;
  }if(counted)entries++;
 }
 const total={published:0,pending:0,failed:0,unknown:0};for(const r of Object.values(byNetwork))for(const k of Object.keys(total))total[k]+=r[k];
 return {month,entries,distributions:seen.size,...total,byNetwork};
}

export function planCommercialDay({now,planner,hotmart,monthlyLimit=20}={}){
 if(typeof now!=="string"||!Number.isFinite(Date.parse(now))||!Number.isSafeInteger(monthlyLimit)||monthlyLimit<1)throw Error("Configuración inválida");
 const actions=[];const add=(priority,code,message)=>actions.push({priority,code,message,mode:"RECOMMENDATION_ONLY"});
 const recent=(stamp)=>{const age=Date.parse(now)-Date.parse(stamp);return Number.isFinite(age)&&age>=0&&age<=86400000};
 let campaigns=null;
 if(planner?.source==="METRICOOL_READ"&&recent(planner.checkedAt)&&Array.isArray(planner.rows)){
  try{campaigns=["2026-11","2026-12"].map(m=>summarizePlanner(planner.rows,m))}catch{add(1,"PLANNER_INVALID","Reconciliar entradas inválidas o duplicadas de Metricool.")}
 }else add(1,"PLANNER_STALE","Consultar el calendario mediante el conector autorizado.");
 if(campaigns){for(const c of campaigns){if(c.failed||c.unknown)add(1,"REVIEW_DELIVERY_"+c.month,"Revisar distribuciones fallidas o con estado desconocido de "+c.month+".");if(c.distributions>monthlyLimit)add(1,"QUOTA_CONFLICT_"+c.month,"Calendario superior al límite de referencia; no añadir publicaciones.");}}
 const dec=campaigns?.find(c=>c.month==="2026-12");
 if(dec)add(2,"RESERVE_DECEMBER","Conservar "+Math.max(0,monthlyLimit-dec.distributions)+" espacios teóricos de diciembre; confirmar contador real y resultados antes de utilizarlos.");
 const ids=["ARC-TEC-001","ARC-MODA-001"];let sales=null;
 if(hotmart?.source==="HOTMART_LOCAL_REPORT"&&recent(hotmart.checkedAt)&&Array.isArray(hotmart.rows)&&hotmart.rows.length===2&&ids.every(id=>hotmart.rows.filter(r=>r?.id===id).length===1)&&hotmart.rows.every(r=>Number.isSafeInteger(r.completeCount)&&r.completeCount>=0&&(r.commissionUSD===null||(Number.isFinite(r.commissionUSD)&&r.commissionUSD>=0)))){
  sales={checkedAt:hotmart.checkedAt,scope:"Último informe local observado, no atribución de campañas",rows:hotmart.rows.map(({id,completeCount,commissionUSD})=>({id,completeCount,commissionUSD}))};
 }else add(1,"HOTMART_REFRESH","Obtener informe V6 de solo lectura actualizado; no inferir ventas nuevas.");
 add(2,"REVIEW_OWN_PRODUCTS","Validar el kit de taller y el curso de IA con usuarios de prueba antes de registrarlos en Hotmart.");
 add(2,"REVIEW_AFFILIATES","Verificar muestras, garantías y derechos de los tres afiliados. No promocionarlos todavía.");
 add(3,"REVIEW_METRICS","Comparar alcance, clics y ventas verificadas sin atribuir ventas a redes por coincidencia temporal.");
 return {generatedAt:now,mode:"READ_ONLY_ADVISORY",campaigns,sales,actions:actions.sort((a,b)=>a.priority-b.priority),monthlyLimitReference:monthlyLimit,quotaVerified:false,studentCount:null,netProfit:null,withdrawableBalance:null,automaticPublishing:false,spendAuthorizedCOP:0};
}

export function selfTest(){
 const now="2026-11-24T22:30:00-05:00",row={id:1,publicationDate:{dateTime:"2026-12-01T09:00:00"},providers:[{network:"facebook",status:"PENDING"}]};
 const p={source:"METRICOOL_READ",checkedAt:now,rows:[row]},h={source:"HOTMART_LOCAL_REPORT",checkedAt:now,rows:[{id:"ARC-TEC-001",completeCount:0,commissionUSD:0},{id:"ARC-MODA-001",completeCount:1,commissionUSD:7.24}]};
 const run=(o={})=>planCommercialDay({now,planner:p,hotmart:h,...o});let count=0;
 const check=(b,m)=>{if(!b)throw Error(m);count++};
 const a=run();check(a.campaigns[1].pending===1,"pending");check(a.campaigns[1].published===0,"not published");check(a.sales.rows[1].commissionUSD===7.24,"commission");check(a.netProfit===null&&a.studentCount===null&&a.withdrawableBalance===null,"unknown metrics");check(!a.automaticPublishing&&a.spendAuthorizedCOP===0&&!a.quotaVerified,"no publishing");
 check(run({planner:null}).campaigns===null,"missing planner");check(run({hotmart:null}).sales===null,"missing hotmart");check(run({hotmart:{...h,checkedAt:"2026-11-22T00:00:00-05:00"}}).sales===null,"stale");
 check(run({hotmart:{...h,rows:[h.rows[0],h.rows[0]]}}).sales===null,"duplicate products");check(run({planner:{...p,rows:[row,row]}}).campaigns===null,"duplicate posts");
 check(run({planner:{...p,rows:[{...row,providers:[{network:"facebook",status:"FAILED"}]}]}}).actions.some(x=>x.code==="REVIEW_DELIVERY_2026-12"),"failure");
 check(run({planner:{...p,rows:[{...row,draft:true}]}}).campaigns[1].distributions===0,"draft");
 check(run({planner:{...p,rows:[{...row,providers:[{network:"facebook",status:"PUBLISHED"},{network:"youtube",status:"NEW"}]}]}}).campaigns[1].unknown===1,"unknown");
 check(run({hotmart:{...h,source:"SIMULATION"}}).sales===null,"simulation");
 check(run({planner:{...p,rows:[{...row,providers:[{network:"facebook",status:"PENDING"},{network:"youtube",status:"PENDING"}]}]},monthlyLimit:1}).actions.some(x=>x.code==="QUOTA_CONFLICT_2026-12"),"quota");
 return {passed:count,total:count};
}
