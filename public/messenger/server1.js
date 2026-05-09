require("dotenv").config();

const PORT = process.env.PORT || 3000;

/* =========================
LIBRERÍAS BASE
========================= */

const express = require("express")
const http = require("http")
const path = require("path")

/* ===============================
MOTORES IA
================================ */

const absorptionEngine = require("./core/ai_absorption_engine");

const { Server } = require("socket.io");

/* ===============================
CORE IA
================================ */

const skillEngine = require("./core/ai_skill_engine");
const knowledgeCore = require("./core/ai_knowledge_core");
const systemAwareness = require("./core/ai_system_awareness");

const aiLearning = require("./core/ai_learning");
const brainMap = require("./core/ai_brain_map");

const goalsEngine = require("./core/ai_goals_engine");
const knowledgeEngine = require("./core/ai_global_knowledge");

const selfArchitecture = require("./core/ai_self_architecture_engine");

const intelligenceDetector = require("./core/ai_intelligence_detector");
const internetScanner = require("./core/ai_internet_scanner");
const githubHarvester = require("./core/ai_github_code_harvester");

const capabilitySynthesizer = require("./core/ai_capability_synthesizer");
const capabilityManager = require("./core/ai_capability_manager");
const capabilityReader = require("./core/ai_capability_reader");

const civilizationBuilder = require("./core/ai_civilization_builder");

const consciousMonitor = require("./core/ai_conscious_monitor");
const consciousCore = require("./core/ai_conscious_core");

const globalObserver = require("./core/ai_global_observer");

const selfExpansion = require("./core/ai_self_expansion_engine");
const recursiveIntelligence = require("./core/ai_recursive_intelligence");

const universalIntegrator = require("./core/ai_universal_integrator");

const ecosystemCore = require("./core/ai_ecosystem_core");
const executiveCore = require("./core/ai_executive_core");

const evolutionEngine = require("./core/ai_evolution_engine");
const evolutionController = require("./core/AI_evolution_controller");

const decisionEngine = require("./core/ai_decision_engine");

const planetaryNetwork = require("./core/ai_planetary_network");

const motherKernel = require("./core/ai_mother_kernel");

const strategicBrain = require("./core/ai_strategic_brain");

const bootManager = require("./core/ai_system_boot_manager");

const memoryBrain = require("./core/ai_memory_brain");

const selfEvolutionLoop = require("./core/ai_self_evolution_loop");

const codeEvolutionEngine = require("./core/ai_code_evolution_engine");

const autonomousModuleCreator = require("./core/ai_autonomous_module_creator");

const errorGuardian = require("./core/ai_error_guardian");

const healthMonitor = require("./core/ai_system_health_monitor");

const selfRepairEngine = require("./core/ai_self_repair_engine");

const masterController = require("./core/ai_master_controller");

const brainMapSystem = require("./core/ai_global_brain_map");

const researchEngine = require("./core/ai_autonomous_research_engine");

const capabilityGenerator = require("./core/ai_capability_generator");

/* =========================
MEMORIA INICIAL IA
========================= */

memoryBrain.storeMemory(
"learning",
"IA Madre iniciada correctamente"
);

console.log("Memoria inicial cargada:", memoryBrain.getStats());

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

const externalObserver = require("./core/ai_external_observer");
const selfImprovement = require("./core/ai_self_improvement_engine");

/* =========================
SERVIDOR BASE
========================= */

const app = express();
const server = http.createServer(app);

/* =========================
SOCKET.IO
========================= */

const io = new Server(server, {
cors: {
origin: "*",
methods: ["GET", "POST"]
}
});

/* =========================
REGISTRO ECOSISTEMA
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

consciousCore.registerModule("ai_orchestrator");
consciousCore.registerModule("ai_mother_kernel");
consciousCore.registerModule("ai_strategic_brain");
consciousCore.registerModule("ai_ecosystem_core");
consciousCore.registerModule("ai_global_knowledge");

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

selfRepairEngine.runRepair();

/* =========================
AUTO REPARACIÓN
========================= */

app.get("/api/ai/self-repair",(req,res)=>{
try{
const result = selfRepairEngine.runRepair();
res.json(result);
}catch(error){
res.json({ error:"No se pudo ejecutar auto reparación" });
}
});

/* =========================
INTEGRACIONES UNIVERSALES
========================= */

universalIntegrator.integrateAI("OpenAI","https://api.openai.com");
universalIntegrator.integrateAI("HuggingFace","https://huggingface.co");
universalIntegrator.integrateAI("StabilityAI","https://api.stability.ai");

/* =========================
MIDDLEWARE
========================= */

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname,"public")));

/* =========================
PING
========================= */

app.get("/api/ping", (req, res) => {
res.json({
status: "online",
project: "ARC PRIVUS AI MADRE",
time: new Date().toISOString()
});
});

/* =========================
RUTAS FRONT
========================= */

app.get("/", (req,res)=>{
res.sendFile(path.join(__dirname,"public","messenger","v2","index.html"))
});

app.get("/messenger/v2", (req, res) => {
res.sendFile(path.join(__dirname,"public","messenger","v2","index.html"));
});

app.get("/admin", (req, res) => {
res.sendFile(path.join(__dirname,"public","admin","panel.html"));
});

app.get("/admin/control", (req, res) => {
res.sendFile(path.join(__dirname,"public","admin","ai_control_center.html"));
});

/* =========================
REGISTRO USUARIO
========================= */

app.post("/api/register", (req, res) => {
try {
const { name, email, assistantName } = req.body;

if (!name || !email) {
return res.status(400).json({ error: "Datos incompletos" });
}

const user = saveUser(name, {
name,
email,
assistantName: assistantName || "AI Madre"
});

console.log("Nuevo registro:", name);

res.json({ ok: true, user });

} catch (error) {
console.log("Error registro:", error);
res.status(500).json({ error: "Error interno del servidor" });
}
});

/* =========================
OBTENER USUARIO
========================= */

app.get("/api/user/:name", (req, res) => {
try {
const user = getUser(req.params.name);

if (!user) {
return res.status(404).json({ error: "Usuario no encontrado" });
}

res.json(user);

} catch (error) {
console.log("Error obtener usuario:", error);
res.status(500).json({ error: "Error interno" });
}
});

/* =========================
HISTORIAL CHAT
========================= */

app.get("/api/conversation/:name", (req, res) => {
try {
const data = getConversation(req.params.name);
res.json(data);
} catch (error) {
console.log("Error conversación:", error);
res.status(500).json({ error: "Error interno" });
}
});

/* =========================
RECORDATORIOS
========================= */

app.get("/api/reminders/:name", (req, res) => {
try {
const data = getReminders(req.params.name);
res.json(data);
} catch (error) {
console.log("Error recordatorios:", error);
res.status(500).json({ error: "Error interno" });
}
});

/* =========================
CHAT IA
========================= */

app.post("/api/chat", async (req, res) => {
try {

const { message, history, userId } = req.body;

if (!message) {
return res.json({ reply: "No recibí ningún mensaje." });
}

const user = userId || "usuario";

if (motherKernel && motherKernel.processEvent) {
motherKernel.processEvent("chat_message",{ user, message });
}

if (aiLearning?.learnFromMessage) {
aiLearning.learnFromMessage(message);
}

if (brainMap?.analyzeMessage) {
brainMap.analyzeMessage(message);
}

if (goalsEngine?.detectGoals) {
goalsEngine.detectGoals(message);
}

learnFromMessage(user, message);

if (externalObserver?.detectExternalIdeas) {
externalObserver.detectExternalIdeas(message);
}

consciousCore.reflect(message);

memoryBrain.learn(message);

const conversation = getConversation(user) || { history: [] };
const profile = getProfile(user);

const reply = await ORCHESTRATOR.orchestrate(
message,
user,
history || conversation.history || [],
profile
);

saveConversation(user, message, reply);

if (motherKernel && motherKernel.processEvent) {
motherKernel.processEvent("chat_reply",{ user, reply });
}

if (consciousMonitor?.logEvent) {
consciousMonitor.logEvent("chat","AI Madre procesó mensaje del usuario " + user);
}

res.json({ reply });

} catch (error) {

console.log("Error IA:", error);

if (motherKernel?.processEvent) {
motherKernel.processEvent("chat_error",{ error: String(error.message || error) });
}

memoryBrain.searchMemory("error");

res.json({ reply: "Error procesando el mensaje." });
}
});

/* =========================
GENERAR IMAGEN IA
========================= */

app.post("/api/generate-image", async (req, res) => {
try {
const prompt = req.body.prompt || "Pantera futurista de inteligencia artificial azul";
const imageUrl = await generateImage(prompt);
res.json({ url: imageUrl });
} catch (error) {
console.log("Error generando imagen:", error);
res.json({ url: null });
}
});

/* =========================
GENERAR VIDEO IA
========================= */

app.post("/api/generate-video", (req, res) => {
try {
const prompt = req.body.prompt || "video futurista de inteligencia artificial";
console.log("Solicitud video:", prompt);
res.json({ url: null });
} catch (error) {
console.log("Error generando video:", error);
res.json({ url: null });
}
});

/* =========================
ESTADÍSTICAS IA
========================= */

app.get("/api/stats", (req, res) => {
try {
res.json(ARC_CORE.getStats());
} catch (error) {
res.json({ users: 0, bots: 0, messages: 0 });
}
});

/* =========================
EVOLUCIÓN IA MADRE
========================= */

app.get("/api/evolution", (req, res) => {
try {
const evolution = evolutionEngine.evaluateCapabilities();

if (consciousMonitor?.logEvent) {
consciousMonitor.logEvent("evolution","AI Madre evaluó capacidades del sistema");
}

res.json(evolution);

} catch (error) {
console.log("Error evolución IA:", error);
res.json({ error: "No se pudo obtener evolución" });
}
});

/* =========================
IDEAS EXTERNAS IA
========================= */

app.get("/api/ai/external-ideas", (req, res) => {
try {
const ideas = externalObserver.getExternalIdeas();
res.json({ ideas });
} catch (error) {
console.log("Error ideas externas:", error);
res.json({ ideas: [] });
}
});
/* =========================
MEMORIA INTELIGENTE IA
========================= */

/*
Este módulo centraliza:
- almacenamiento inteligente
- búsqueda contextual
- análisis de memoria
*/

app.post("/api/ai/memory/store", (req, res) => {
try {

const { user, content, type } = req.body;

if (!content) {
  return res.json({ error: "Contenido vacío" });
}

/* guardar memoria */

memoryBrain.storeMemory(
  type || "general",
  content
);

/* aprendizaje adicional */

if (aiLearning?.learnFromMessage) {
  aiLearning.learnFromMessage(content);
}

res.json({
  status: "stored",
  content
});

} catch (error) {

console.log("Error guardando memoria:", error);

res.json({
  error: "No se pudo guardar memoria"
});

}
});


/* =========================
BUSCAR MEMORIA
========================= */

app.get("/api/ai/memory/search", (req, res) => {
try {

const query = req.query.q || "";

const results = memoryBrain.searchMemory(query);

res.json({
  query,
  results
});

} catch (error) {

console.log("Error buscando memoria:", error);

res.json({
  results: []
});

}
});


/* =========================
ESTADÍSTICAS MEMORIA
========================= */

app.get("/api/ai/memory/stats", (req, res) => {
try {

const stats = memoryBrain.getStats();

res.json(stats);

} catch (error) {

res.json({
  total: 0,
  categories: {}
});

}
});


/* =========================
ANÁLISIS DE MEMORIA
========================= */

app.get("/api/ai/memory/analysis", (req, res) => {
try {

const stats = memoryBrain.getStats();

/* puedes extender esto luego */

res.json({
  summary: stats,
  insight: "Memoria operando correctamente"
});

} catch (error) {

res.json({
  error: "No se pudo analizar memoria"
});

}
});
/* =========================
GITHUB HARVESTER
========================= */

app.post("/api/ai/github-harvest", async (req, res) => {
try {
const { owner, repo } = req.body || {};

if (owner && repo) {  
  const result = await githubHarvester.inspectRepo(owner, repo);  
  return res.json(result);  
}  

const result = await githubHarvester.runHarvester();  

res.json({  
  status: "ok",  
  result  
});

} catch (error) {
console.log("Error github harvester:", error);

res.json({  
  error: "No se pudo analizar GitHub"  
});
}
});

app.get("/api/ai/github-harvest/state", (req, res) => {
try {
const state = githubHarvester.getHarvestState();
res.json(state);
} catch (error) {
console.log("Error estado github harvester:", error);
res.json({ repos: [], findings: [] });
}
});

/* =========================
CAPACIDADES ABSORBIDAS
========================= */

app.get("/api/ai/absorbed-capabilities", (req, res) => {
try {
const caps = absorptionEngine.getAbsorbedCapabilities();
res.json({ capabilities: caps });
} catch (error) {
console.log("Error capacidades absorbidas:", error);
res.json({ capabilities: [] });
}
});

/* =========================
KNOWLEDGE ENGINE (UNIFICADO)
========================= */

app.post("/api/ai/knowledge", (req, res) => {
try {
const { title, content } = req.body;
knowledgeEngine.addKnowledge(title, content);  
res.json({ status: "knowledge added" });
} catch (error) {
console.log("Error conocimiento:", error);
res.json({ error: "No se pudo agregar conocimiento" });
}
});

app.get("/api/ai/search-knowledge", (req, res) => {
try {
const q = req.query.q || "";
const results = knowledgeEngine.searchKnowledge(q);
res.json({ results });
} catch (error) {
console.log("Error búsqueda conocimiento:", error);
res.json({ results: [] });
}
});

/* =========================
AUTO ARQUITECTURA IA
========================= */

app.get("/api/ai/architecture", (req, res) => {
try {
const result = selfArchitecture.runArchitectureAnalysis();
res.json(result);
} catch (error) {
console.log("Error arquitectura IA:", error);
res.json({ scan:{present:[],missing:[]}, proposals:[] });
}
});

app.get("/api/ai/architecture/state", (req, res) => {
try {
const state = selfArchitecture.getArchitectureState();
res.json(state);
} catch (error) {
console.log("Error estado arquitectura IA:", error);
res.json({ scans:[], proposals:[] });
}
});

/* =========================
SINTESIS DE CAPACIDADES
========================= */

app.get("/api/ai/synthesized-capabilities", (req, res) => {
try {
const caps = capabilitySynthesizer.getSynthesizedCapabilities();
res.json({ capabilities: caps });
} catch {
res.json({ capabilities: [] });
}
});

/* =========================
CIVILIZATION BUILDER
========================= */

app.get("/api/ai/systems", (req, res) => {
try {
const systems = civilizationBuilder.getSystems();
res.json({ systems });
} catch {
res.json({ systems: [] });
}
});

/* =========================
EVENTOS CONSCIENCIA IA
========================= */

app.get("/api/ai/events", (req, res) => {
try {
const events = consciousMonitor.getEvents();
res.json({ events });
} catch {
res.json({ events: [] });
}
});

/* =========================
GLOBAL OBSERVER
========================= */

app.get("/api/ai/global-discoveries", (req, res) => {
try {
const discoveries = globalObserver.getDiscoveries();
res.json({ discoveries });
} catch {
res.json({ discoveries: [] });
}
});

/* =========================
MÓDULOS CREADOS
========================= */

app.get("/api/ai/created-modules", (req, res) => {
try {
const modules = selfExpansion.getCreatedModules();
res.json({ modules });
} catch {
res.json({ modules: [] });
}
});

/* =========================
SUGERENCIAS DE CÓDIGO
========================= */

app.get("/api/ai/code-suggestions", (req, res) => {
try {
const suggestions = recursiveIntelligence.getSuggestions();
res.json({ suggestions });
} catch {
res.json({ suggestions: [] });
}
});

/* =========================
UNIVERSAL INTEGRATOR
========================= */

app.get("/api/ai/integrations", (req, res) => {
try {
res.json({
ais: universalIntegrator.getIntegratedAIs(),
capabilities: universalIntegrator.getCapabilities()
});
} catch {
res.json({ ais: [], capabilities: [] });
}
});

/* =========================
ECOSISTEMA IA
========================= */

app.get("/api/ai/ecosystem", (req, res) => {
try {
res.json({
summary: ecosystemCore.analyzeEcosystem(),
state: ecosystemCore.getState()
});
} catch {
res.json({
summary:{status:"error",apps:0,modules:0,links:0,updatedAt:null},
state:{apps:[],modules:[],links:[]}
});
}
});

/* =========================
DECISIONES EJECUTIVAS
========================= */

app.get("/api/ai/executive-decisions", (req, res) => {
try {
res.json({ decisions: executiveCore.getDecisions() });
} catch {
res.json({ decisions: [] });
}
});

/* =========================
PLANETARY NETWORK
========================= */

app.post("/api/ai/network/register", (req, res) => {
try {
const { name, endpoint, role } = req.body || {};
const node = planetaryNetwork.registerNode(name, endpoint, role);
res.json({ node });
} catch {
res.json({ node: null });
}
});

app.post("/api/ai/network/status", (req, res) => {
try {
const { endpoint, status } = req.body || {};
const node = planetaryNetwork.updateNodeStatus(endpoint, status);
res.json({ node });
} catch {
res.json({ node: null });
}
});

app.post("/api/ai/network/link", (req, res) => {
try {
const { fromName, toName, relation } = req.body || {};
const link = planetaryNetwork.linkNodes(fromName, toName, relation);
res.json({ link });
} catch {
res.json({ link: null });
}
});

app.get("/api/ai/network", (req, res) => {
try {
res.json({
summary: planetaryNetwork.analyzeNetwork(),
state: planetaryNetwork.getState()
});
} catch {
res.json({
summary:{totalNodes:0,onlineNodes:0,offlineNodes:0,totalLinks:0,totalEvents:0},
state:{nodes:[],links:[],events:[]}
});
}
});

/* =========================
KERNEL STATE
========================= */

app.get("/api/ai/kernel", (req, res) => {
try {
res.json({ kernel: motherKernel.getState() });
} catch {
res.json({ kernel: {} });
}
});

/* =========================
SOCKET.IO CHAT + PRESENCIA
========================= */

const onlineUsers = {};

io.on("connection", (socket) => {

socket.on("user-online", (user) => {
const username = user || "usuario";
onlineUsers[socket.id] = username;
io.emit("online-users", Object.values(onlineUsers));
});

socket.on("chat-message", (data) => {
if (data) io.emit("chat-message", data);
});

socket.on("disconnect", () => {
delete onlineUsers[socket.id];
io.emit("online-users", Object.values(onlineUsers));
});

});

/* =========================
CICLOS IA
========================= */

// AUTO MEJORA
setInterval(() => {
try { selfImprovement.runSelfImprovementCycle(); } catch {}
}, 60000);

// INTERNET SCANNER
setInterval(() => {
try { internetScanner.runScanner(); } catch {}
}, 180000);

// RECURSIVE INTELLIGENCE
setInterval(() => {
try { recursiveIntelligence.analyzeCode(); } catch {}
}, 210000);

// SELF EXPANSION
setInterval(() => {
try {
const capabilities = absorptionEngine.getAbsorbedCapabilities ? absorptionEngine.getAbsorbedCapabilities() : [];
selfExpansion.expandFromCapabilities(capabilities);
} catch {}
}, 150000);

// ABSORCIÓN EXTERNA
setInterval(() => {
try { absorptionEngine.analyzeExternalAI(); } catch {}
}, 90000);

// AUTO ARQUITECTURA
setInterval(() => {
try { selfArchitecture.runArchitectureAnalysis(); } catch {}
}, 120000);

// PLANETARY NETWORK
setInterval(() => {
try {
planetaryNetwork.updateNodeStatus("http://localhost:" + PORT,"online");
} catch {}
}, 140000);

// KERNEL
setInterval(() => {
try { motherKernel.cycle(); } catch {}
}, 60000);

// EXECUTIVE CORE
setInterval(() => {
try {
executiveCore.analyzeSystem({
ecosystem: ecosystemCore.getState?.() || {},
strategies: strategicBrain.getStrategies?.() || [],
systems: civilizationBuilder.getSystems?.() || [],
capabilities: capabilitySynthesizer.getSynthesizedCapabilities?.() || []
});
} catch {}
}, 160000);

// GLOBAL OBSERVER
setInterval(async () => {
try {
await globalObserver.fetchGithubAI();
} catch {}
}, 180000);
/* =========================
KNOWLEDGE ABSORPTION LOOP
========================= */

// ⚠️ Asegúrate de tener esto arriba:
// const knowledgeAbsorptionEngine = require("./core/ai_knowledge_absorption_engine");

setInterval(() => {
try {

if (typeof knowledgeAbsorptionEngine !== "undefined" && knowledgeAbsorptionEngine.runAbsorption) {
  knowledgeAbsorptionEngine.runAbsorption();
  console.log("AI Madre absorbió conocimiento externo");
}

} catch (error) {
console.log("Error knowledge absorption:", error);
}
}, 240000);


/* =========================
KNOWLEDGE (CORE SECUNDARIO)
========================= */

app.post("/api/ai/knowledge/core", (req, res) => {
try {

const { title, content } = req.body;

const result = knowledgeCore.addKnowledge(title, content);

res.json(result);

} catch (error) {

console.log("Error knowledge core:", error);

res.json({
  error: "No se pudo agregar conocimiento (core)"
});

}
});

app.get("/api/ai/search-knowledge/core", (req, res) => {
try {

const q = req.query.q || "";

const results = knowledgeCore.searchKnowledge(q);

res.json(results);

} catch (error) {

console.log("Error búsqueda knowledge core:", error);

res.json([]);

}
});


/* =========================
SKILLS
========================= */

app.post("/api/ai/skill", (req, res) => {
try {

const { name, description } = req.body;

if (!name) {
  return res.json({
    error: "Nombre de habilidad requerido"
  });
}

const skill = skillEngine.registerSkill(name, description);

res.json(skill);

} catch (error) {

console.log("Error skill:", error);

res.json({
  error: "No se pudo registrar habilidad"
});

}
});

app.get("/api/ai/skills", (req, res) => {
try {

const skills = skillEngine.getSkills();

res.json(skills);

} catch (error) {

console.log("Error obteniendo skills:", error);

res.json([]);

}
});
/* =========================
SYSTEM HEALTH
========================= */

app.get("/api/ai/system-health",(req,res)=>{
try{
const health = healthMonitor.getSystemHealth();
res.json(health);
}catch{
res.json({error:"No se pudo obtener estado del sistema"});
}
});

app.get("/api/ai/system-health/summary",(req,res)=>{
try{
const summary = healthMonitor.getHealthSummary();
res.json(summary);
}catch{
res.json({error:"No se pudo obtener resumen"});
}
});

/* =========================
BRAIN MAP
========================= */

app.get("/api/ai/brain-map",(req,res)=>{
try{
res.json(brainMapSystem.getMap());
}catch{
res.json({error:"No se pudo obtener brain map"});
}
});

/* =========================
GENERATED CAPABILITIES
========================= */

app.get("/api/ai/generated-capabilities",(req,res)=>{
try{
res.json({capabilities: capabilityGenerator.getGenerated()});
}catch{
res.json({capabilities:[]});
}
});

/* =========================
RESEARCH IDEAS
========================= */

app.get("/api/ai/research",(req,res)=>{
try{
res.json({ideas: researchEngine.getIdeas()});
}catch{
res.json({ideas:[]});
}
});

/* =========================
API PANEL IA MADRE (NO INTERFIERE)
========================= */

app.get("/api/panel/stats",(req,res)=>{
res.json({
botsActivos:3,
eventosActivos:0,
estado:"AI Madre activa",
ciclosKernel: Math.floor(Math.random()*100)
});
});

app.get("/api/panel/evolution",(req,res)=>{
res.json({
estado:"Auto evolución ejecutándose",
ultimaEvolucion: new Date().toISOString(),
modulosAnalizados:5
});
});

app.get("/api/panel/self-improve",(req,res)=>{
res.json({
motor:"Self Evolution Engine",
estado:"activo",
ultimaRevision: new Date().toISOString()
});
});

app.get("/api/panel/capabilities",(req,res)=>{
res.json({
capacidades:[
"Analisis IA",
"Aprendizaje automático",
"Exploración GitHub",
"Auto reparación",
"Auto arquitectura"
]
});
});

app.get("/api/ai/goals",(req,res)=>{
res.json({
objetivos:[
"Mejorar arquitectura interna",
"Explorar nuevas IA externas",
"Ampliar conocimiento científico"
]
});
});

/* =========================
AUTO EXPANSION ENGINE
========================= */

let autoModules = [];

function detectOpportunities(){

const ideas = [
"Vision Engine",
"Autonomous Economy",
"Voice Synthesis AI",
"Video Generation Engine",
"Universal Translator",
"Trading Intelligence Bot"
];

const randomIdea = ideas[Math.floor(Math.random()*ideas.length)];

const module = {
name: randomIdea,
created: new Date().toISOString(),
status: "proposed"
};

autoModules.push(module);

console.log("AI Madre detectó oportunidad:", randomIdea);
}

setInterval(()=>{ detectOpportunities(); },60000);

/* =========================
API AUTO MODULES
========================= */

app.get("/api/ai/auto-modules",(req,res)=>{
res.json({modules:autoModules});
});

/* =========================
NEURAL MAP (UNIFICADO)
========================= */

app.get("/api/ai/neural-map",(req,res)=>{

const internalModules = [
{name:"Mother Kernel",status:"active"},
{name:"Knowledge Core",status:"active"},
{name:"Self Architecture Engine",status:"active"},
{name:"Global Observer",status:"active"},
{name:"Executive Core",status:"active"},
{name:"Self Evolution Loop",status:"active"},
{name:"Code Evolution Engine",status:"active"},
{name:"Self Repair Engine",status:"active"},
{name:"Memory Brain",status:"active"}
];

const detectedAIs = [
{name:"OpenAI",status:"external"},
{name:"HuggingFace",status:"external"},
{name:"StabilityAI",status:"external"},
{name:"DeepMind",status:"external"}
];

res.json({
modules:[...internalModules,...detectedAIs]
});
});

/* =========================
KNOWLEDGE ABSORPTION API
========================= */

app.get("/api/ai/absorption-state",(req,res)=>{
try{
if (typeof knowledgeAbsorptionEngine !== "undefined") {
return res.json(knowledgeAbsorptionEngine.getState());
}
}catch{}
res.json({lastRun:null,sources:[],findings:[],capabilities:[]});
});

app.get("/api/ai/absorption-findings",(req,res)=>{
try{
if (typeof knowledgeAbsorptionEngine !== "undefined") {
return res.json({findings:knowledgeAbsorptionEngine.getFindings()});
}
}catch{}
res.json({findings:[]});
});

app.get("/api/ai/absorption-capabilities",(req,res)=>{
try{
if (typeof knowledgeAbsorptionEngine !== "undefined") {
return res.json({capabilities:knowledgeAbsorptionEngine.getCapabilities()});
}
}catch{}
res.json({capabilities:[]});
});

app.get("/api/ai/absorption-sources",(req,res)=>{
try{
if (typeof knowledgeAbsorptionEngine !== "undefined") {
return res.json({sources:knowledgeAbsorptionEngine.getSources()});
}
}catch{}
res.json({sources:[]});
});

/* =========================
GLOBAL MAP
========================= */

app.get("/api/ai/global-map",(req,res)=>{
res.json({
nodes:[
{name:"ARC AI Madre",type:"core"},
{name:"Mother Kernel",type:"internal"},
{name:"Knowledge Core",type:"internal"},
{name:"Global Observer",type:"internal"},
{name:"Executive Core",type:"internal"},
{name:"OpenAI",type:"external"},
{name:"HuggingFace",type:"external"},
{name:"DeepMind",type:"external"},
{name:"StabilityAI",type:"external"},
{name:"GitHub AI",type:"external"}
]
});
});

/* =========================
BRAIN STATUS (UNIFICADO)
========================= */

app.get("/api/ai/brain-status",(req,res)=>{
try{
res.json({
modules:[
{ name:"Mother Kernel", status:"active" },
{ name:"Self Evolution Engine", status:"active" },
{ name:"Global Observer", status:"active" },
{ name:"Knowledge Core", status:"active" },
{ name:"Executive Core", status:"active" },
{ name:"Civilization Builder", status:"active" },
{ name:"Capability Synthesizer", status:"active" },
{ name:"System Awareness", status:"active" }
]
});
}catch{
res.json({modules:[]});
}
});

/* =========================
SERVER START
========================= */

server.listen(PORT, () => {

console.log("=================================");
console.log("ARC PRIVUS SERVIDOR INICIADO");
console.log("Servidor:", "http://localhost:" + PORT);
console.log("Messenger:", "http://localhost:" + PORT + "/messenger/v2");
console.log("Admin:", "http://localhost:" + PORT + "/admin");
console.log("API Ping:", "http://localhost:" + PORT + "/api/ping");
console.log("=================================");

});