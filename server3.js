require("dotenv").config();

const PORT = process.env.PORT || 3000;

const absorptionEngine = require("./core/ai_absorption_engine");
const aiLearning = require("./ai-learning")
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const brainMap = require("./core/ai_brain_map");
const goalsEngine = require("./core/ai_goals_engine");
const knowledgeEngine = require("./core/ai_global_knowledge");
const selfArchitecture = require("./core/ai_self_architecture_engine");
const intelligenceDetector = require("./ai_intelligence_detector");
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


planetaryNetwork.registerNode(
  "ARC Privus AI Madre Principal",
  "http://localhost:" + PORT,
  "core_ai"
);
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

/* NUEVOS SISTEMAS IA */

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

const io = new Server(server,{
  cors:{
    origin:"*",
    methods:["GET","POST"]
  }
});


/* =========================
   MIDDLEWARE
========================= */

app.use(express.json({limit:"10mb"}));
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,"public")));

/* =========================
   PING SERVIDOR
========================= */

app.get("/api/ping",(req,res)=>{
  res.json({
    status:"online",
    project:"ARC PRIVUS AI MADRE",
    time:new Date().toISOString()
  })
})

/* =========================
   RUTA PRINCIPAL
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
   PANEL ADMIN
========================= */

app.get("/admin",(req,res)=>{
  res.sendFile(
    path.join(__dirname,"public","admin","panel.html")
  )
})

/* =========================
   CENTRO CONTROL IA
========================= */

app.get("/admin/control",(req,res)=>{
  res.sendFile(
    path.join(__dirname,"public","admin","ai_control_center.html")
  )
})

/* =========================
   REGISTRO USUARIO
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

    console.log("Nuevo registro:",name)

    res.json({
      ok:true,
      user
    })

  }catch(error){

    console.log("Error registro:",error)

    res.status(500).json({
      error:"Error interno del servidor"
    })

  }

})

/* =========================
   OBTENER USUARIO
========================= */

app.get("/api/user/:name",(req,res)=>{

  try{

    const user = getUser(req.params.name)

    if(!user){
      return res.status(404).json({
        error:"Usuario no encontrado"
      })
    }

    res.json(user)

  }catch(error){

    console.log("Error obtener usuario:",error)

    res.status(500).json({
      error:"Error interno"
    })

  }

})

/* =========================
   HISTORIAL CHAT
========================= */

app.get("/api/conversation/:name",(req,res)=>{

  try{

    const data = getConversation(req.params.name)

    res.json(data)

  }catch(error){

    console.log("Error conversación:",error)

    res.status(500).json({
      error:"Error interno"
    })

  }

})

/* =========================
   RECORDATORIOS
========================= */

app.get("/api/reminders/:name",(req,res)=>{

  try{

    const data = getReminders(req.params.name)

    res.json(data)

  }catch(error){

    console.log("Error recordatorios:",error)

    res.status(500).json({
      error:"Error interno"
    })

  }

})

/* =========================
   CHAT IA + MEMORIA INTELIGENTE
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

    /* =========================
       EVENTO KERNEL
    ========================= */

    if (motherKernel && motherKernel.processEvent) {
      motherKernel.processEvent("chat_message", {
        user,
        message
      });
    }

    /* =========================
       APRENDIZAJE IA MADRE
    ========================= */

    if (aiLearning?.learnFromMessage) {
      aiLearning.learnFromMessage(message);
    }

    if (brainMap?.analyzeMessage) {
      brainMap.analyzeMessage(message);
    }

    if (goalsEngine?.detectGoals) {
      goalsEngine.detectGoals(message);
    }

    /* =========================
       PERFIL USUARIO
    ========================= */

    learnFromMessage(user, message);

    /* =========================
       OBSERVADOR EXTERNO
    ========================= */

    if (externalObserver?.detectExternalIdeas) {
      externalObserver.detectExternalIdeas(message);
    }

    /* =========================
       MEMORIA CONVERSACIÓN
    ========================= */

    const conversation = getConversation(user) || { history: [] };

    const profile = getProfile(user);

    /* =========================
       RESPUESTA IA
    ========================= */

    const reply = await ORCHESTRATOR.orchestrate(
      message,
      user,
      history || conversation.history || [],
      profile
    );

    /* =========================
       GUARDAR CONVERSACIÓN
    ========================= */

    saveConversation(user, message, reply);

    /* =========================
       EVENTO KERNEL RESPUESTA
    ========================= */

    if (motherKernel && motherKernel.processEvent) {
      motherKernel.processEvent("chat_reply", {
        user,
        reply
      });
    }

    /* =========================
       REGISTRO CONSCIENCIA IA
    ========================= */

    if (consciousMonitor?.logEvent) {
      consciousMonitor.logEvent(
        "chat",
        "AI Madre procesó mensaje del usuario " + user
      );
    }

    /* =========================
       RESPUESTA
    ========================= */

    res.json({ reply });

  } catch (error) {

    console.log("Error IA:", error);

    if (motherKernel?.processEvent) {
      motherKernel.processEvent("chat_error", {
        error: String(error.message || error)
      });
    }

    res.json({
      reply: "Error procesando el mensaje."
    });

  }

});

/* =========================
   GENERAR IMAGEN IA
========================= */

app.post("/api/generate-image",async(req,res)=>{

  try{

    const prompt =
      req.body.prompt ||
      "Pantera futurista de inteligencia artificial azul"

    const imageUrl = await generateImage(prompt)

    res.json({
      url:imageUrl
    })

  }catch(error){

    console.log("Error generando imagen:",error)

    res.json({
      url:null
    })

  }

})

/* =========================
   GENERAR VIDEO IA
========================= */

app.post("/api/generate-video",(req,res)=>{

  try{

    const prompt =
      req.body.prompt ||
      "video futurista de inteligencia artificial"

    console.log("Solicitud video:",prompt)

    res.json({
      url:null
    })

  }catch(error){

    console.log("Error generando video:",error)

    res.json({
      url:null
    })

  }

})

/* =========================
   ESTADÍSTICAS IA
========================= */

app.get("/api/stats",(req,res)=>{

  try{

    res.json(ARC_CORE.getStats())

  }catch(error){

    res.json({
      users:0,
      bots:0,
      messages:0
    })

  }

})

/* =========================
   EVOLUCIÓN IA MADRE
========================= */

app.get("/api/evolution",(req,res)=>{

  try{

    const evolution = evolutionEngine.evaluateCapabilities()

    res.json(evolution)

  }catch(error){

    console.log("Error evolución IA:",error)

    res.json({
      error:"No se pudo obtener evolución"
    })

  }

})
consciousMonitor.logEvent(
"evolution",
"AI Madre evaluó capacidades del sistema"
);
/* =========================
   IDEAS EXTERNAS IA
========================= */

app.get("/api/ai/external-ideas",(req,res)=>{

  try{

    const ideas = externalObserver.getExternalIdeas()

    res.json({
      ideas
    })

  }catch(error){

    console.log("Error ideas externas:",error)

    res.json({
      ideas:[]
    })

  }

})

/* =========================
   SOCKET.IO CHAT + PRESENCIA
========================= */

const onlineUsers = {}

io.on("connection",(socket)=>{

  console.log("Usuario conectado:",socket.id)

  socket.on("user-online",(user)=>{

    const username = user || "usuario"

    onlineUsers[socket.id] = username

    io.emit("online-users",Object.values(onlineUsers))

  })

  socket.on("chat-message",(data)=>{

    try{

      if(!data) return

      io.emit("chat-message",data)

    }catch(error){

      console.log("Error socket:",error)

    }

  })

  socket.on("disconnect",()=>{

    delete onlineUsers[socket.id]

    io.emit("online-users",Object.values(onlineUsers))

    console.log("Usuario desconectado:",socket.id)

  })

  
})

/* ===============================
   AUTO MEJORA IA MADRE
================================ */

// ciclo de auto mejora cada 60 segundos
setInterval(() => {

  try {

    selfImprovement.runSelfImprovementCycle();

    console.log("AI Madre ejecutó ciclo de auto mejora");

  } catch (error) {

    console.log("Error auto mejora:", error);

  }

}, 60000);


// escaneo de internet cada 3 minutos
setInterval(() => {

  try {

    internetScanner.runScanner();

    console.log("AI Madre escaneó internet");

  } catch (error) {

    console.log("Error scanner:", error);

  }

}, 180000);

/* =========================
   RECURSIVE INTELLIGENCE
========================= */

setInterval(()=>{

try{

recursiveIntelligence.analyzeCode();

console.log("AI Madre analizó su propio código");

}catch(error){

console.log("Error recursive intelligence:",error);

}

},210000);
/* =========================
   SELF EXPANSION ENGINE
========================= */

setInterval(()=>{

try{

const capabilities =
absorptionEngine.getAbsorbedCapabilities
? absorptionEngine.getAbsorbedCapabilities()
: [];

const newModules =
selfExpansion.expandFromCapabilities(capabilities);

if(newModules.length){

console.log(
"AI Madre creó nuevos módulos:",
newModules
);

}

}catch(error){

console.log("Error auto expansión IA:",error);

}

},150000);
/* =========================
   ABSORCIÓN DE IA EXTERNAS
========================= */

setInterval(()=>{

  try{

    absorptionEngine.analyzeExternalAI();

    console.log("AI Madre analizó capacidades externas");

  }catch(error){

    console.log("Error absorción IA:",error);

  }

},90000);


/* =========================
   CICLO AUTO ARQUITECTURA
========================= */

setInterval(()=>{

  try{

    selfArchitecture.runArchitectureAnalysis();

    console.log("AI Madre analizó su arquitectura");

  }catch(error){

    console.log("Error ciclo arquitectura:",error);

  }
/* =========================
   PLANETARY NETWORK HEARTBEAT
========================= */

setInterval(()=>{

  try{

    planetaryNetwork.updateNodeStatus(
      "http://localhost:" + PORT,
      "online"
    );

    console.log("AI Planetary Network heartbeat activo");

  }catch(error){

    console.log("Error planetary network:", error);

  }

}, 140000);
/* =========================
   AI MOTHER KERNEL CYCLE
========================= */

setInterval(()=>{

try{

motherKernel.cycle();

}catch(error){

console.log("Kernel cycle error:",error);

}

},60000);
/* =========================
   INICIAR SERVIDOR
========================= */
},120000);


/* =========================
   GITHUB HARVESTER
========================= */

app.post("/api/ai/github-harvest", async (req,res)=>{

  try{

    const { owner, repo } = req.body || {};

    if(owner && repo){
      const result = await githubHarvester.inspectRepo(owner, repo);
      return res.json(result);
    }

    const result = await githubHarvester.runHarvester();

    res.json({
      status:"ok",
      result
    });

  }catch(error){

    console.log("Error github harvester:", error);

    res.json({
      error:"No se pudo analizar GitHub"
    });

  }

});

app.get("/api/ai/github-harvest/state",(req,res)=>{

  try{

    const state = githubHarvester.getHarvestState();

    res.json(state);

  }catch(error){

    console.log("Error estado github harvester:", error);

    res.json({
      repos:[],
      findings:[]
    });

  }

});
/* =========================
   EXECUTIVE CORE
========================= */

setInterval(()=>{

try{

const ecosystem = ecosystemCore.getState
? ecosystemCore.getState()
: {};

const strategies = strategicBrain.getStrategies
? strategicBrain.getStrategies()
: [];

const systems = civilizationBuilder.getSystems
? civilizationBuilder.getSystems()
: [];

const capabilities = capabilitySynthesizer.getSynthesizedCapabilities
? capabilitySynthesizer.getSynthesizedCapabilities()
: [];

executiveCore.analyzeSystem({
ecosystem,
strategies,
systems,
capabilities
});

console.log("AI Executive Core evaluó el ecosistema");

}catch(error){

console.log("Error executive core:",error);

}

},160000);
server.listen(PORT,()=>{

  console.log("================================")
  console.log("ARC PRIVUS SERVIDOR INICIADO")
  console.log("Servidor:", "http://localhost:"+PORT)
  console.log("Messenger:", "http://localhost:"+PORT+"/messenger/v2")
  console.log("Admin:", "http://localhost:"+PORT+"/admin")
  console.log("API Ping:", "http://localhost:"+PORT+"/api/ping")
  console.log("================================")

})
app.get("/api/ai/absorbed-capabilities",(req,res)=>{

  try{

    const caps = absorptionEngine.getAbsorbedCapabilities();

    res.json({
      capabilities:caps
    });

  }catch(error){

    console.log("Error capacidades absorbidas:",error);

    res.json({
      capabilities:[]
    });

  }

});
app.post("/api/ai/knowledge",(req,res)=>{

  try{

    const {title,content} = req.body;

    knowledgeEngine.addKnowledge(title,content);

    res.json({
      status:"knowledge added"
    });

  }catch(error){

    console.log("Error conocimiento:",error);

    res.json({
      error:"No se pudo agregar conocimiento"
    });

  }

});
app.get("/api/ai/search-knowledge",(req,res)=>{

  try{

    const q = req.query.q || "";

    const results = knowledgeEngine.searchKnowledge(q);

    res.json({
      results
    });

  }catch(error){

    console.log("Error búsqueda conocimiento:",error);

    res.json({
      results:[]
    });

  }

});
/* =========================
   AUTO ARQUITECTURA IA
========================= */

app.get("/api/ai/architecture",(req,res)=>{

  try{

    const result = selfArchitecture.runArchitectureAnalysis();

    res.json(result);

  }catch(error){

    console.log("Error arquitectura IA:",error);

    res.json({
      scan:{ present:[], missing:[] },
      proposals:[]
    });

  }

});

app.get("/api/ai/architecture/state",(req,res)=>{

  try{

    const state = selfArchitecture.getArchitectureState();

    res.json(state);

  }catch(error){

    console.log("Error estado arquitectura IA:",error);

    res.json({
      scans:[],
      proposals:[]
    });

  }

});
/* =========================
   CICLO AUTO ARQUITECTURA
========================= */

setInterval(()=>{

  try{

    selfArchitecture.runArchitectureAnalysis();

    console.log("AI Madre analizó su arquitectura");

  }catch(error){

    console.log("Error ciclo arquitectura:",error);

  }

},120000);
/* =========================
   GITHUB HARVESTER
========================= */

app.post("/api/ai/github-harvest", async (req,res)=>{

  try{

    const { owner, repo } = req.body || {};

    if(owner && repo){
      const result = await githubHarvester.inspectRepo(owner, repo);
      return res.json(result);
    }

    const result = await githubHarvester.runHarvester();

    res.json({
      status:"ok",
      result
    });

  }catch(error){

    console.log("Error github harvester:", error);

    res.json({
      error:"No se pudo analizar GitHub"
    });

  }

});

app.get("/api/ai/github-harvest/state",(req,res)=>{

  try{

    const state = githubHarvester.getHarvestState();

    res.json(state);

  }catch(error){

    console.log("Error estado github harvester:", error);

    res.json({
      repos:[],
      findings:[]
    });

  }

});
/* =========================
   SINTESIS DE CAPACIDADES
========================= */

setInterval(()=>{

try{

const newCaps = capabilitySynthesizer.synthesizeCapabilities();

if(newCaps.length){

console.log("AI Madre creó nuevas capacidades:",newCaps.length);

}

}catch(error){

console.log("Error síntesis capacidades:",error);

}

},70000);
app.get("/api/ai/synthesized-capabilities",(req,res)=>{

try{

const caps = capabilitySynthesizer.getSynthesizedCapabilities();

res.json({
capabilities:caps
});

}catch(error){

res.json({
capabilities:[]
});

}

});
/* =========================
   CIVILIZATION BUILDER
========================= */

setInterval(()=>{

try{

const caps = absorptionEngine.getAbsorbedCapabilities
? absorptionEngine.getAbsorbedCapabilities()
: [];

const proposals = civilizationBuilder.analyzeCapabilities(caps);

if(proposals.length){

console.log("AI Madre diseñó nuevos sistemas:",proposals.length);

}

}catch(error){

console.log("Error civilization builder:",error);

}

},110000);
app.get("/api/ai/systems",(req,res)=>{

try{

const systems = civilizationBuilder.getSystems();

res.json({
systems
});

}catch(error){

res.json({
systems:[]
});

}

});
app.get("/api/ai/events",(req,res)=>{

try{

const events = consciousMonitor.getEvents();

res.json({
events
});

}catch(error){

res.json({
events:[]
});

}

});
/* =========================
   GLOBAL OBSERVER
========================= */

setInterval(async()=>{

try{

const repos = await globalObserver.fetchGithubAI();

if(repos.length){

console.log("AI Madre observó proyectos globales:",repos.length);

}

}catch(error){

console.log("Error global observer:",error);

}

},180000);

app.get("/api/ai/global-discoveries",(req,res)=>{

try{

const discoveries = globalObserver.getDiscoveries();

res.json({
discoveries
});

}catch(error){

res.json({
discoveries:[]
});

}

});
app.get("/api/ai/created-modules",(req,res)=>{

try{

const modules = selfExpansion.getCreatedModules();

res.json({
modules
});

}catch(error){

res.json({
modules:[]
});

}

});
app.get("/api/ai/code-suggestions",(req,res)=>{

try{

const suggestions = recursiveIntelligence.getSuggestions();

res.json({
suggestions
});

}catch(error){

res.json({
suggestions:[]
});

}

});
universalIntegrator.integrateAI(
"OpenAI",
"https://api.openai.com"
);

universalIntegrator.integrateAI(
"HuggingFace",
"https://huggingface.co"
);

universalIntegrator.integrateAI(
"StabilityAI",
"https://api.stability.ai"
);
/* =========================
   UNIVERSAL INTEGRATOR
========================= */

setInterval(()=>{

try{

universalIntegrator.testConnections();

console.log("AI Madre verificó inteligencias externas");

}catch(error){

console.log("Error universal integrator:",error);

}

},200000);
app.get("/api/ai/integrations",(req,res)=>{

try{

res.json({
ais:universalIntegrator.getIntegratedAIs(),
capabilities:universalIntegrator.getCapabilities()
});

}catch(error){

res.json({
ais:[],
capabilities:[]
});

}

});
app.get("/api/ai/ecosystem",(req,res)=>{

  try{

    res.json({
      summary: ecosystemCore.analyzeEcosystem(),
      state: ecosystemCore.getState()
    });

  }catch(error){

    res.json({
      summary: {
        status: "error",
        apps: 0,
        modules: 0,
        links: 0,
        updatedAt: null
      },
      state: {
        apps: [],
        modules: [],
        links: []
      }
    });

  }

});
app.get("/api/ai/executive-decisions",(req,res)=>{

try{

res.json({
decisions:executiveCore.getDecisions()
});

}catch(error){

res.json({
decisions:[]
});

}

});
/* =========================
   PLANETARY NETWORK
========================= */

app.post("/api/ai/network/register",(req,res)=>{

  try{

    const { name, endpoint, role } = req.body || {};

    const node = planetaryNetwork.registerNode(name, endpoint, role);

    res.json({
      node
    });

  }catch(error){

    res.json({
      node: null
    });

  }

});

app.post("/api/ai/network/status",(req,res)=>{

  try{

    const { endpoint, status } = req.body || {};

    const node = planetaryNetwork.updateNodeStatus(endpoint, status);

    res.json({
      node
    });

  }catch(error){

    res.json({
      node: null
    });

  }

});

app.post("/api/ai/network/link",(req,res)=>{

  try{

    const { fromName, toName, relation } = req.body || {};

    const link = planetaryNetwork.linkNodes(fromName, toName, relation);

    res.json({
      link
    });

  }catch(error){

    res.json({
      link: null
    });

  }

});

app.get("/api/ai/network",(req,res)=>{

  try{

    res.json({
      summary: planetaryNetwork.analyzeNetwork(),
      state: planetaryNetwork.getState()
    });

  }catch(error){

    res.json({
      summary: {
        totalNodes: 0,
        onlineNodes: 0,
        offlineNodes: 0,
        totalLinks: 0,
        totalEvents: 0
      },
      state: {
        nodes: [],
        links: [],
        events: []
      }
    });

  }

});
app.get("/api/ai/kernel",(req,res)=>{

try{

res.json({
kernel: motherKernel.getState()
});

}catch(error){

res.json({
kernel:{}
});

}

});