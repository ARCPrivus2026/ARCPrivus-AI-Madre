// Read-only library service. Trusted adapters must be injected by the existing authenticated backend. No route mounted.
import {libraryDecision} from './academy-access-v1.mjs';
export async function buildLibrary({sessionToken,authenticate,findVerifiedPurchase,now}={}){
 const blocked=(status,reason)=>({httpStatus:status,body:{state:"BLOCKED",reason,products:[]}});
 if(typeof authenticate!=="function"||typeof findVerifiedPurchase!=="function"||typeof now!=="string"||!Number.isFinite(Date.parse(now)))return blocked(503,"SERVICE_UNAVAILABLE");
 if(typeof sessionToken!=="string"||sessionToken.length<32||sessionToken.length>4096)return blocked(401,"AUTH_REQUIRED");
 try{
 const principal=await authenticate(sessionToken);
 if(!principal||principal.authenticated!==true||!["accountId","userId"].every(k=>typeof principal[k]==="string"&&/^[A-Za-z0-9_-]{1,128}$/.test(principal[k])))return blocked(401,"AUTH_REQUIRED");
 const products=[];
 for(const productId of ["ARC-TEC-001","ARC-MODA-001"]){
 const record=await findVerifiedPurchase({accountId:principal.accountId,userId:principal.userId,productId});
 const d=libraryDecision({principal,productId,record,now});
 if(d.state==="PURCHASE_VERIFIED")products.push(d);
 }
 return {httpStatus:200,body:{state:"READY",products,delivery:"HOTMART_ONLY",download:false}};
 }catch{return blocked(503,"SERVICE_UNAVAILABLE")}
}

export async function selfTestLibrary(){
 const now="2026-11-24T22:00:00-05:00";
 const principal={authenticated:true,accountId:"arc",userId:"student1"};
 const good={accountId:"arc",userId:"student1",hotmartId:8911108,source:"AUTHORIZED_PROVIDER_RECONCILIATION",identityVerified:true,transactionId:"tx",status:"COMPLETE",revoked:false,disputed:false,checkedAt:now};
 const args={sessionToken:"fixture_token_for_test_only_123456789",authenticate:async()=>principal,findVerifiedPurchase:async q=>q.productId==="ARC-TEC-001"?good:null,now};
 let count=0;const assert=(x,m)=>{if(!x)throw Error(m);count++};
 const a=await buildLibrary(args);assert(a.httpStatus===200&&a.body.products.length===1,"own verified product");
 assert(a.body.download===false&&a.body.products[0].download===false,"no file delivery");
 assert(!JSON.stringify(a).includes("student1")&&!JSON.stringify(a).includes("transactionId"),"no identifiers");
 assert((await buildLibrary({...args,sessionToken:"bad"})).httpStatus===401,"invalid token");
 assert((await buildLibrary({...args,authenticate:async()=>null})).httpStatus===401,"bad session");
 assert((await buildLibrary({...args,authenticate:async()=>({authenticated:true,userId:"bad id",accountId:"arc"})})).httpStatus===401,"malformed principal");
 assert((await buildLibrary({...args,findVerifiedPurchase:async()=>({...good,userId:"other"})})).body.products.length===0,"no other purchase");
 assert((await buildLibrary({...args,findVerifiedPurchase:async()=>({...good,status:"REFUNDED"})})).body.products.length===0,"refunded");
 assert((await buildLibrary({...args,findVerifiedPurchase:async()=>{throw Error("secret")}})).httpStatus===503,"provider down");
 assert(!(JSON.stringify(await buildLibrary({...args,authenticate:async()=>{throw Error("secret")}}))).includes("secret"),"no error leak");
 assert((await buildLibrary({...args,findVerifiedPurchase:null})).httpStatus===503,"missing adapter");
 let queries=[];await buildLibrary({...args,findVerifiedPurchase:async q=>{queries.push(q);return null}});assert(queries.length===2&&queries.every(q=>q.accountId==="arc"&&q.userId==="student1"),"scoped queries");
 return {passed:count,total:count};
}
