require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;

/* =========================
   CORE IA
========================= */

const absorptionEngine = require("./core/ai_absorption_engine");
const aiLearning = require("./ai-learning");
const brainMap = require("./core/ai_brain_map");
const goalsEngine = require("./core/ai_goals_engine");
const knowledgeEngine = require("./core/ai_global_knowledge");
const selfArchitecture = require("./core/ai_self_architecture_engine");
const intelligenceDetector = require("./core/ai_intelligence_detector");
const internetScanner = require("./core/ai_internet_scanner");
const githubHarvester = require("./core/ai_github_code_harvester");
const capabilitySynthesizer = require("./core/ai_capability_synthesizer");
const civilizationBuilder = require("./core/ai_civilization_builder");
const consciousMonitor = require("./core/ai_conscious_monitor");
const globalObserver = require("./core/ai_global_observer");
const selfExpansion = require("./core/ai_self_expansion_engine");
const recursiveIntelligence = require("./core/ai_recursive_intelligence");
const universalIntegrator = require("./core/ai_universal_integrator");
const ecosystemCore = require("./core/ai_ecosystem_core");
const executiveCore = require("./core/ai_executive_core");
const planetaryNetwork = require("./core/ai_planetary_network");
const motherKernel = require("./core/ai_mother_kernel");
const strategicBrain = require("./core/ai_strategic_brain");

/* =========================
   ARC PRIVUS CORE
========================= */

const ORCHESTRATOR = require("./core/ai_orchestrator");
const ARC_CORE = require("./core/ai_core");

const { saveUser, getUser } = require("./core/ai_users");
const { getConversation, saveConversation } = require("./core/ai_chat_memory");
const { getReminders } = require("./core/ai_reminders");
const { generateImage } = require("./core/ai_image");
const { learnFromMessage, getProfile } = require("./core/ai_user_profile");

const evolutionEngine = require("./core/ai_evolution_engine");
const externalObserver = require("./core/ai_external_observer");
const selfImprovement = require("./core/ai_self_improvement_engine");

/* =========================
   EXPRESS
========================= */

const app = express();
const server = http.createServer(app);

/* =========================
   SOCKET.IO
========================= */

const io = new Server(server,{
  cors:{
    origin:"*",
    methods:["GET","POST"]
  }
});

/* =========================
   ECOSYSTEM REGISTRY
========================= */

ecosystemCore.registerApp("ARC Privus Messenger", "messaging");
ecosystemCore.registerApp("ARC Privus AI Madre", "core_ai");
ecosystemCore.registerApp("ARC Privus Trading", "finance");
ecosystemCore.registerApp("ARC Privus Publicidad", "ads");

ecosystemCore.registerModule("ai_orchestrator", "coordination");
ecosystemCore.registerModule("ai_learning", "learning");
ecosystemCore.registerModule("ai_brain_map", "knowledge_map");
ecosystemCore.registerModule("ai_goals_engine", "goals");
ecosystemCore.registerModule("ai_global_knowledge", "knowledge");
ecosystemCore.registerModule("ai_absorption_engine", "absorption");
ecosystemCore.registerModule("ai_capability_synthesizer", "synthesis");
ecosystemCore.registerModule("ai_civilization_builder", "system_design");
ecosystemCore.registerModule("ai_strategic_brain", "strategy");
ecosystemCore.registerModule("ai_conscious_monitor", "monitoring");
ecosystemCore.registerModule("ai_global_observer", "world_observer");
ecosystemCore.registerModule("ai_self_expansion_engine", "expansion");
ecosystemCore.registerModule("ai_recursive_intelligence", "self_analysis");
ecosystemCore.registerModule("ai_universal_integrator", "integration");

ecosystemCore.linkElements("ARC Privus AI Madre", "ARC Privus Messenger", "controls");
ecosystemCore.linkElements("ARC Privus AI Madre", "ARC Privus Trading", "controls");
ecosystemCore.linkElements("ARC Privus AI Madre", "ARC Privus Publicidad", "controls");
ecosystemCore.linkElements("ai_orchestrator", "ARC Privus AI Madre", "coordinates");
ecosystemCore.linkElements("ai_learning", "ARC Privus AI Madre", "feeds");
ecosystemCore.linkElements("ai_brain_map", "ARC Privus AI Madre", "supports");

/* =========================
   PLANETARY NETWORK
========================= */

planetaryNetwork.registerNode(
  "ARC Privus AI Madre Principal",
  "http://localhost:" + PORT,
  "core_ai"
);

/* =========================
   KERNEL BOOT
========================= */

motherKernel.boot([
"learning",
"brain_map",
"goals_engine",
"global_knowledge",
"absorption_engine",
"capability_synthesizer",
"civilization_builder",
"strategic_brain",
"ecosystem_core",
"executive_core",
"planetary_network"
]);

/* =========================
   MIDDLEWARE
========================= */

app.use(express.json({limit:"10mb"}));
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,"public")));

/* =========================
   PING
========================= */

app.get("/api/ping",(req,res)=>{
res.json({
status:"online",
project:"ARC PRIVUS AI MADRE",
time:new Date().toISOString()
})
})

/* =========================
   HOME
========================= */

app.get("/",(req,res)=>{
res.sendFile(path.join(__dirname,"public","index.html"))
})

/* =========================
   MESSENGER
========================= */

app.get("/messenger/v2",(req,res)=>{
res.sendFile(
path.join(__dirname,"public","messenger","v2","index.html")
)
})

/* =========================
   ADMIN
========================= */

app.get("/admin",(req,res)=>{
res.sendFile(
path.join(__dirname,"public","admin","panel.html")
)
})

/* =========================
   REGISTRO
========================= */

app.post("/api/register",(req,res)=>{

try{

const {name,email,assistantName} = req.body

if(!name || !email){
return res.status(400).json({
error:"Datos incompletos"
})
}

const user = saveUser(name,{
name,
email,
assistantName:assistantName || "AI Madre"
})

res.json({
ok:true,
user
})

}catch(error){

res.status(500).json({
error:"Error interno"
})

}

})

/* =========================
   CHAT IA
========================= */

app.post("/api/chat", async (req, res) => {

try {

const { message, history, userId } = req.body;

if (!message) {
return res.json({
reply: "No recibí ningún mensaje."
});
}

const user = userId || "usuario";

learnFromMessage(user,message);

const conversation = getConversation(user) || { history: [] };
const profile = getProfile(user);

const reply = await ORCHESTRATOR.orchestrate(
message,
user,
history || conversation.history || [],
profile
);

saveConversation(user,message,reply);

res.json({reply});

}catch(error){

console.log(error);

res.json({
reply:"Error procesando el mensaje"
})

}

});

/* =========================
   SOCKET CHAT
========================= */

const onlineUsers={}

io.on("connection",(socket)=>{

socket.on("user-online",(user)=>{

onlineUsers[socket.id]=user

io.emit("online-users",Object.values(onlineUsers))

})

socket.on("chat-message",(data)=>{

io.emit("chat-message",data)

})

socket.on("disconnect",()=>{

delete onlineUsers[socket.id]

io.emit("online-users",Object.values(onlineUsers))

})

})

/* =========================
   FIN PARTE 1
========================= */
/* =========================
   CICLOS IA
========================= */

setInterval(()=>{

try{

selfImprovement.runSelfImprovementCycle()

}catch(error){

console.log("Error auto mejora:",error)

}

},60000)

setInterval(()=>{

try{

internetScanner.runScanner()

}catch(error){

console.log("Error scanner:",error)

}

},180000)

setInterval(()=>{

try{

recursiveIntelligence.analyzeCode()

}catch(error){

console.log("Error recursive intelligence:",error)

}

},210000)

setInterval(()=>{

try{

const capabilities =
absorptionEngine.getAbsorbedCapabilities
? absorptionEngine.getAbsorbedCapabilities()
: [];

selfExpansion.expandFromCapabilities(capabilities);

}catch(error){

console.log("Error expansión IA:",error)

}

},150000)

/* =========================
   ABSORCIÓN IA
========================= */

setInterval(()=>{

try{

absorptionEngine.analyzeExternalAI()

}catch(error){

console.log("Error absorción IA:",error)

}

},90000)

/* =========================
   AUTO ARQUITECTURA
========================= */

setInterval(()=>{

try{

selfArchitecture.runArchitectureAnalysis()

}catch(error){

console.log("Error arquitectura IA:",error)

}

},120000)

/* =========================
   PLANETARY NETWORK
========================= */

setInterval(()=>{

try{

planetaryNetwork.updateNodeStatus(
"http://localhost:"+PORT,
"online"
)

}catch(error){

console.log("Error planetary network:",error)

}

},140000)

/* =========================
   KERNEL
========================= */

setInterval(()=>{

try{

motherKernel.cycle()

}catch(error){

console.log("Kernel error:",error)

}

},60000)

/* =========================
   EXECUTIVE CORE
========================= */

setInterval(()=>{

try{

const ecosystem = ecosystemCore.getState()
const strategies = strategicBrain.getStrategies()
const systems = civilizationBuilder.getSystems()
const capabilities = capabilitySynthesizer.getSynthesizedCapabilities()

executiveCore.analyzeSystem({
ecosystem,
strategies,
systems,
capabilities
})

}catch(error){

console.log("Error executive core:",error)

}

},160000)

/* =========================
   SERVIDOR
========================= */

server.listen(PORT,()=>{

console.log("================================")
console.log("ARC PRIVUS SERVIDOR INICIADO")
console.log("Servidor:", "http://localhost:"+PORT)
console.log("Messenger:", "http://localhost:"+PORT+"/messenger/v2")
console.log("Admin:", "http://localhost:"+PORT+"/admin")
console.log("API Ping:", "http://localhost:"+PORT+"/api/ping")
console.log("================================")

})