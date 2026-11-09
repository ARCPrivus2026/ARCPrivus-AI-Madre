import test from "node:test";
import assert from "node:assert/strict";
import {createArcGoogleClient, planArcGoogleTask} from "./google-interactions.mjs";

test("razonamiento crea plan sin conexiones", () => {
  const p = planArcGoogleTask({prompt:"Hola Natalia"});
  assert.equal(p.model,"gemini-3.8-flash");
  assert.equal(p.requestBody.input,"Hola Natalia");
});
test("rechaza tareas invalidas y prompts vacios", () => {
  assert.throws(() => planArcGoogleTask({task:"desconocida", prompt:"a"}));
  assert.throws(() => planArcGoogleTask({prompt:""}));
});
test("desactivado por defecto", async () => {
  let called=false;
  const c=createArcGoogleClient({env:{},fetchImpl:async()=>{called=true;}});
  await assert.rejects(()=>c.execute({prompt:"hola"}),/desactivada/);
  assert.equal(called,false);
});
test("no habilita video sin doble autorizacion", async () => {
  let called=false;
  const c=createArcGoogleClient({env:{ARC_GOOGLE_AI_ENABLED:"true",GEMINI_API_KEY:"ficticia"},fetchImpl:async()=>{called=true;}});
  await assert.rejects(()=>c.execute({task:"video",prompt:"una escena",approvedSpend:true}),/Video bloqueado/);
  assert.equal(called,false);
});
test("ejecuta solo solicitud simulada; clave fuera de URL", async () => {
  let request;
  const c=createArcGoogleClient({
    env:{ARC_GOOGLE_AI_ENABLED:"true",GEMINI_API_KEY:"clave-ficticia"},
    fetchImpl:async(url,options)=>{
      request={url,options};
      return {ok:true,status:200,json:async()=>({id:"mock_1",output:[]})};
    }
  });
  const out=await c.execute({prompt:"hola"});
  assert.equal(out.interactionId,"mock_1");
  assert.equal(request.options.headers["x-goog-api-key"],"clave-ficticia");
  assert.ok(!request.url.includes("clave-ficticia"));
});
