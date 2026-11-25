// Isolated policy only. Inputs must be supplied by trusted server adapters, never HTTP client bodies.
// No sessions, provider API, database queries, entitlement grants or delivery implemented here.
const PRODUCTS=Object.freeze(Object.fromEntries(Object.entries({"ARC-TEC-001":{"hotmartId":8911108,"title":"Diagnóstico práctico de neveras No Frost y lavadoras","delivery":"hotmart"},"ARC-MODA-001":{"hotmartId":8924110,"title":"Biblioteca visual y estudio de colección","delivery":"hotmart"}}).map(([id,p])=>[id,Object.freeze(p)])));
export function libraryDecision({principal,productId,record,now,maxAgeMs=3600000}={}){
 const denied=reason=>({state:"BLOCKED",reason,productId:typeof productId==="string"?productId:null,download:false});
 const safeId=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,128}$/.test(x);
 if(!principal||principal.authenticated!==true||!safeId(principal.accountId)||!safeId(principal.userId))return denied("AUTH_REQUIRED");
 if(typeof productId!=="string"||!Object.hasOwn(PRODUCTS,productId))return denied("PRODUCT_NOT_RELEASED");
 if(!record||record.source!=="AUTHORIZED_PROVIDER_RECONCILIATION"||record.identityVerified!==true||!safeId(record.transactionId))return denied("PURCHASE_NOT_VERIFIED");
 if(record.accountId!==principal.accountId||record.userId!==principal.userId)return denied("PURCHASE_NOT_VERIFIED");
 if(record.hotmartId!==PRODUCTS[productId].hotmartId)return denied("PURCHASE_NOT_VERIFIED");
 if(record.status!=="COMPLETE"||record.revoked!==false||record.disputed!==false)return denied("PURCHASE_NOT_ELIGIBLE");
 if(typeof now!=="string"||typeof record.checkedAt!=="string"||!Number.isSafeInteger(maxAgeMs)||maxAgeMs<1||maxAgeMs>3600000)return denied("INVALID_VERIFICATION");
 const age=Date.parse(now)-Date.parse(record.checkedAt);
 if(!Number.isFinite(age)||age<0||age>maxAgeMs)return denied("VERIFICATION_EXPIRED");
 return {state:"PURCHASE_VERIFIED",productId,title:PRODUCTS[productId].title,delivery:"HOTMART",download:false,notice:"Consulta el acceso en tu cuenta de Hotmart. Esta prueba no entrega archivos ni crea una licencia nueva."};
}

export function selfTest(){
 const now="2026-11-24T22:00:00-05:00",principal={authenticated:true,accountId:"arc",userId:"student1"},record={accountId:"arc",userId:"student1",hotmartId:8911108,source:"AUTHORIZED_PROVIDER_RECONCILIATION",identityVerified:true,transactionId:"test_tx",status:"COMPLETE",revoked:false,disputed:false,checkedAt:now};
 const base={principal,record,now,productId:"ARC-TEC-001"};
 let count=0;const assert=(b,m)=>{if(!b)throw Error(m);count++};
 const result=x=>libraryDecision({...base,...x});const blocked=x=>result(x).state==="BLOCKED";
 assert(result({}).state==="PURCHASE_VERIFIED","verified fixture");
 assert(result({}).download===false,"no delivery");
 assert(blocked({principal:null}),"anonymous");
 assert(blocked({principal:{...principal,authenticated:false}}),"unauthenticated");
 assert(blocked({principal:{...principal,userId:"student2"}}),"different student");
 assert(blocked({principal:{...principal,accountId:"other"}}),"different account");
 assert(blocked({record:null}),"missing purchase");
 assert(blocked({record:{...record,source:"CLIENT"}}),"client claim");
 assert(blocked({record:{...record,identityVerified:false}}),"unverified identity");
 assert(blocked({record:{...record,hotmartId:8924110}}),"other product");
 assert(blocked({record:{...record,status:"REFUNDED"}}),"refund");
 assert(blocked({record:{...record,status:"APPROVED"}}),"not complete");
 assert(blocked({record:{...record,revoked:true}}),"revoked");
 assert(blocked({record:{...record,disputed:true}}),"disputed");
 assert(blocked({record:{...record,disputed:undefined}}),"unknown dispute");
 assert(blocked({record:{...record,checkedAt:"2026-11-24T20:59:59-05:00"}}),"expired");
 assert(blocked({record:{...record,checkedAt:"2026-11-24T22:01:00-05:00"}}),"future");
 assert(blocked({productId:"ARC-IA-001"}),"unreleased");
 assert(blocked({productId:"__proto__"}),"prototype");
 assert(blocked({maxAgeMs:3600001}),"maximum freshness");
 assert(result({productId:"ARC-MODA-001",record:{...record,hotmartId:8924110}}).state==="PURCHASE_VERIFIED","fashion");
 assert(!JSON.stringify(result({})).includes("test_tx")&&!JSON.stringify(result({})).includes("student1"),"no identity leak");
 return {passed:count,total:count};
}
