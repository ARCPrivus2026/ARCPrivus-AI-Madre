require("dotenv").config();

const PORT = process.env.PORT || 3000;

const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET","POST"] }
});

/* =========================
   IMPORTACIÓN SEGURA IA
========================= */

function safeRequire(module){
  try { return require(module); }
  catch(e){
    console.log("⚠ Módulo no cargado:", module);
    return {};
  }
}

const ORCHESTRATOR = safeRequire("./core/ai_orchestrator");
const memoryBrain = safeRequire("./core/ai_memory_brain");
const consciousCore = safeRequire("./core/ai_conscious_core");
const aiLearning = safeRequire("./core/ai_learning");
const brainMap = safeRequire("./core/ai_brain_map");
const goalsEngine = safeRequire("./core/ai_goals_engine");
const externalObserver = safeRequire("./core/ai_external_observer");
const motherKernel = safeRequire("./core/ai_mother_kernel");

const evolutionEngine = safeRequire("./core/ai_evolution_engine");
const selfImprovement = safeRequire("./core/ai_self_improvement_engine");
const internetScanner = safeRequire("./core/ai_internet_scanner");
const recursiveIntelligence = safeRequire("./core/ai_recursive_intelligence");

/* =========================
   CORE FUNCIONAL
========================= */

const { saveUser, getUser } = safeRequire("./core/ai_users");
const { getConversation, saveConversation } = safeRequire("./core/ai_chat_memory");
const { generateImage } = safeRequire("./core/ai_image");
const { learnFromMessage, getProfile } = safeRequire("./core/ai_user_profile");

/* =========================
   MIDDLEWARE
========================= */

app.use(express.json({ limit:"10mb" }));
app.use(express.urlencoded({ extended:true }));
app.use(express.static(path.join(__dirname,"public")));

/* =========================
   FRONTEND
========================= */

app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"public/messenger/v2/index.html"));
});

/* =========================
   MONETIZACIÓN
========================= */

const userPlans = {};
const usage = {};

function checkUsage(user){
  if(!usage[user]) usage[user] = {count:0};

  usage[user].count++;

  const plan = userPlans[user]?.plan || "free";

  if(plan === "free" && usage[user].count > 50){
    return false;
  }

  return true;
}

/* =========================
   CHAT PRINCIPAL (ÚNICO)
========================= */

app.post("/api/chat", async (req,res)=>{

try{

const { message, history, userId } = req.body;
if(!message) return res.json({reply:"Mensaje vacío"});

const user = userId || "usuario";
const msg = message.toLowerCase();

/* ===== MONETIZACIÓN POR CHAT ===== */

if(msg.includes("activar pro")){
return res.json({
reply:
"💰 Activar PRO\n\nNequi: 300 XXX XXXX\nValor: $10.000\n\nEscribe: YA PAGUE"
});
}

if(msg.includes("ya pague") || msg.includes("ya pagué")){
userPlans[user] = {plan:"pro"};
return res.json({reply:"✅ PRO activado"});
}

/* ===== CONTROL FREE ===== */

if(!checkUsage(user)){
return res.json({
reply:
"🚀 Límite alcanzado\nActiva PRO para continuar\nEscribe: ACTIVAR PRO"
});
}

/* ===== IA PROCESOS ===== */

motherKernel?.processEvent?.("chat", {user,message});
aiLearning?.learnFromMessage?.(message);
brainMap?.analyzeMessage?.(message);
goalsEngine?.detectGoals?.(message);
externalObserver?.detectExternalIdeas?.(message);
consciousCore?.reflect?.(message);
memoryBrain?.learn?.(message);

learnFromMessage?.(user,message);

/* ===== RESPUESTA ===== */

const conversation = getConversation?.(user) || {history:[]};
const profile = getProfile?.(user);

const reply = await ORCHESTRATOR?.orchestrate?.(
  message,
  user,
  history || conversation.history,
  profile
) || "Sin respuesta IA";

saveConversation?.(user,message,reply);

res.json({reply});

}catch(e){
console.log("ERROR CHAT:", e);
res.json({reply:"Error IA"});
}

});

/* =========================
   IMÁGENES (PRO)
========================= */

app.post("/api/generate-image", async (req,res)=>{

const user = req.body.user || "usuario";
const plan = userPlans[user]?.plan || "free";

if(plan !== "pro"){
return res.json({url:null,error:"Solo PRO"});
}

const url = await generateImage?.(req.body.prompt);
res.json({url});

});

/* =========================
   REGISTRO
========================= */

app.post("/api/register",(req,res)=>{

const {name,email} = req.body;

if(!name || !email){
return res.json({error:"Datos incompletos"});
}

saveUser?.(name,{name,email});
res.json({ok:true});

});

/* =========================
   SOCKET.IO
========================= */

io.on("connection",(socket)=>{

socket.on("chat-message",(data)=>{
io.emit("chat-message",data);
});

});

/* =========================
   CICLOS IA (SEGUROS)
========================= */

setInterval(()=>{
try{ selfImprovement?.runSelfImprovementCycle?.(); }catch{}
},60000);

setInterval(()=>{
try{ internetScanner?.runScanner?.(); }catch{}
},120000);

setInterval(()=>{
try{ recursiveIntelligence?.analyzeCode?.(); }catch{}
},180000);

setInterval(()=>{
try{ evolutionEngine?.evaluateCapabilities?.(); }catch{}
},240000);

/* =========================
   START
========================= */

server.listen(PORT,()=>{
console.log("=================================");
console.log("ARC PRIVUS AI MADRE ACTIVA");
console.log("http://localhost:"+PORT);
console.log("=================================");
});