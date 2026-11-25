// Local offline report consumer. Never write to the existing store or call a provider.
import {readFile,mkdtemp,writeFile,mkdir} from "node:fs/promises";
import path from "node:path";
import {CATALOG,publicCatalog,prepareDrafts,selfTest} from "./commerce-pipeline-v4.mjs";
import {buildHandoff,selfTestHandoff} from "./delivery-guard-v4.mjs";
import {reconcileOwnProducts,selfTestReconciliation} from "./hotmart-reconciliation-v5.mjs";

export function buildLocalPreview(report,{month,used,now=new Date().toISOString()}){
 const checks=[selfTest(),selfTestHandoff(),selfTestReconciliation()];
 const reconciliation=reconcileOwnProducts(CATALOG,report,{now});
 const allowed=new Set(reconciliation.rows.filter(r=>r.eligibleForPreview).map(r=>r.id));
 // Block the entire preview if any expected product has failed reconciliation.
 const reviewed=reconciliation.status==="PREVIEW_READY"?CATALOG.filter(p=>p.mode==="own"&&allowed.has(p.id)):[];
 const publicRows=publicCatalog(reviewed);
 const drafts=prepareDrafts(reviewed,month,20,used);
 const handoff=buildHandoff({drafts,quota:{month,limit:20,used,confirmed:false},approvedProducts:publicRows.map(p=>p.id),stop:true,now});
 if(handoff.eligible!==0||handoff.quotaVerified||publicRows.some(p=>p.mode!=="own"))throw Error("Control de seguridad fallido");
 return {publicRows,privateReport:{checks,reconciliation,drafts,handoff,liveDeployment:false,providerWrite:false}};
}
async function main(){
 const [file,month,usedArg]=process.argv.slice(2);
 if(!file||!month||!/^\d+$/.test(usedArg||"")||!Number.isSafeInteger(Number(usedArg)))throw Error("Uso: node run-reconciliation-v5.mjs INFORME.json 2026-12 0");
 const raw=await readFile(path.resolve(file));
 if(raw.length>4*1024*1024)throw Error("Informe demasiado grande");
 const result=buildLocalPreview(JSON.parse(raw.toString("utf8").replace(/^\uFEFF/,"")),{month,used:Number(usedArg)});
 const out=await mkdtemp(path.resolve("ARC_MARKET_V5_"));
 await mkdir(path.join(out,"PRIVADO"));
 await writeFile(path.join(out,"PRIVADO","reconciliacion.json"),JSON.stringify(result.privateReport,null,2)+"\n",{flag:"wx"});
 if(result.privateReport.reconciliation.status==="PREVIEW_READY"){
  await mkdir(path.join(out,"VISTA_PREVIA_NO_PUBLICAR"));
  await writeFile(path.join(out,"VISTA_PREVIA_NO_PUBLICAR","catalog.json"),JSON.stringify(result.publicRows,null,2)+"\n",{flag:"wx"});
 }
 console.log(JSON.stringify({status:result.privateReport.reconciliation.status,checks:result.privateReport.checks,publicPreviewProducts:result.publicRows.length,drafts:result.privateReport.drafts.queue.length,handoffEligible:result.privateReport.handoff.eligible,quotaVerified:false,autoPublish:false,spendCOP:0,output:out},null,2));
 if(result.privateReport.reconciliation.status!=="PREVIEW_READY")process.exitCode=2;
}
// Importing the module for tests never triggers filesystem writes.
import {pathToFileURL} from "node:url";
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(e=>{console.error("RECONCILIATION_FAILED:",e.code||"INVALID_INPUT_OR_OUTPUT");process.exitCode=1;});
