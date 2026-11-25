// Isolated Node/Express integration. Not imported by the main server.
import express from "express";
import mysql from "mysql2/promise";
import {createHash,timingSafeEqual} from "node:crypto";
function normalizeEvent(body){
 if(!body||body.version!=="2.0.0"||typeof body.id!=="string"||! /^[A-Za-z0-9_-]{1,128}$/.test(body.id)||!Number.isSafeInteger(body.creation_date)||body.creation_date<=0)throw Error("Evento inválido");
 const events=["PURCHASE_CANCELED","PURCHASE_COMPLETE","PURCHASE_BILLET_PRINTED","PURCHASE_APPROVED","PURCHASE_PROTEST","PURCHASE_REFUNDED","PURCHASE_CHARGEBACK","PURCHASE_EXPIRED","PURCHASE_DELAYED"];
 if(!events.includes(body.event))throw Error("Evento no admitido");
 const p=body.data?.purchase,product=body.data?.product;
 if(typeof p?.transaction!=="string"||!/^[A-Za-z0-9_-]{1,128}$/.test(p.transaction)||!Number.isSafeInteger(product?.id)||product.id<=0)throw Error("Compra inválida");
 return {id:body.id,event:body.event,created:body.creation_date,transaction:p.transaction,productId:product.id};
}
export {normalizeEvent};
export function createMarketApp({pool,hottok,accountId,reportToken}){
 if(!pool||typeof hottok!=="string"||hottok.length<16||typeof reportToken!=="string"||reportToken.length<32||! /^[A-Za-z0-9_-]{1,64}$/.test(accountId||""))throw Error("Configuración incompleta");
 const app=express();app.disable("x-powered-by");
 const eq=(a,b)=>typeof a==="string"&&timingSafeEqual(createHash("sha256").update(a).digest(),createHash("sha256").update(b).digest());
 app.use((req,res,next)=>{res.set("Cache-Control","no-store");next();});
 app.get("/health",(_req,res)=>res.json({service:"arc-market",status:"running"}));
 app.post("/webhooks/hotmart",(req,res,next)=>eq(req.get("X-HOTMART-HOTTOK"),hottok)?next():res.sendStatus(401),express.json({limit:"128kb"}),async(req,res)=>{
  let e;try{e=normalizeEvent(req.body);}catch{return res.sendStatus(400);}
  try{
   await pool.execute("INSERT INTO arc_market_provider_events (account_id,event_id,event_type,created_ms,transaction_code,product_id) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE event_id=event_id",[accountId,e.id,e.event,e.created,e.transaction,e.productId]);
   return res.sendStatus(200);
  }catch{return res.sendStatus(503);}
 });
 app.get("/reports/events",async(req,res)=>{
  if(!eq(req.get("Authorization"),"Bearer "+reportToken))return res.sendStatus(401);
  try{const [rows]=await pool.execute("SELECT event_type,COUNT(*) AS event_count FROM arc_market_provider_events WHERE account_id=? GROUP BY event_type",[accountId]);res.json({counts:rows,warning:"Conteos de eventos únicos, no ventas ni comisiones conciliadas."});}catch{res.sendStatus(503);}
 });
 app.use((err,req,res,next)=>res.sendStatus(err.status===413?413:400));return app;
}
export async function startMarket(env=process.env){
 const keys=["ARC_MARKET_DB_HOST","ARC_MARKET_DB_USER","ARC_MARKET_DB_PASSWORD","ARC_MARKET_DB_NAME","ARC_MARKET_HOTTOK","ARC_MARKET_ACCOUNT_ID","ARC_MARKET_REPORT_TOKEN"];if(keys.some(k=>!env[k]))throw Error("Variables ARC_MARKET faltantes");
 const port=Number(env.ARC_MARKET_PORT||3215);if(!Number.isInteger(port)||port<1024||port>65535)throw Error("Puerto inválido");
 const pool=mysql.createPool({host:env.ARC_MARKET_DB_HOST,user:env.ARC_MARKET_DB_USER,password:env.ARC_MARKET_DB_PASSWORD,database:env.ARC_MARKET_DB_NAME,connectionLimit:5});
 try{await pool.execute("SELECT 1 FROM arc_market_provider_events LIMIT 1");const app=createMarketApp({pool,hottok:env.ARC_MARKET_HOTTOK,accountId:env.ARC_MARKET_ACCOUNT_ID,reportToken:env.ARC_MARKET_REPORT_TOKEN});return app.listen(port,"127.0.0.1",()=>console.log("ARC Market local",port));}catch(e){await pool.end();throw e;}
}
