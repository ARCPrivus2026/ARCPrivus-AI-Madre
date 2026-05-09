const fs = require("fs");
const path = require("path");

const capabilityManager = require("./ai_capability_manager");
const moduleCreator = require("./ai_module_creator");

const DB = path.join(__dirname,"../memory/ai_absorbed_capabilities.json");

function loadDB(){

  if(!fs.existsSync(DB)){
    fs.writeFileSync(DB,JSON.stringify({capabilities:[]},null,2));
  }

  return JSON.parse(fs.readFileSync(DB));

}

function saveDB(data){

  fs.writeFileSync(DB,JSON.stringify(data,null,2));

}

/* =========================
   ANALIZAR IA EXTERNAS
========================= */

function analyzeExternalAI(){

  const detected = capabilityManager.detectNewCapabilities();

  const db = loadDB();

  detected.forEach(cap=>{

    const exists = db.capabilities.find(c=>c.name === cap);

    if(!exists){

      console.log("AI Madre detectó nueva capacidad externa:",cap);

      db.capabilities.push({
        name:cap,
        detectedAt:new Date().toISOString()
      });

      moduleCreator.createModule(cap);

    }

  });

  saveDB(db);

}

/* =========================
   OBTENER CAPACIDADES
========================= */

function getAbsorbedCapabilities(){

  const db = loadDB();

  return db.capabilities;

}

function absorbKnowledge(data = {}){

  console.log("AI Absorption Engine absorbiendo conocimiento...");

  return {
    absorbed: true
  };

}

module.exports = {
  analyzeExternalAI,
  getAbsorbedCapabilities,
  absorbKnowledge
};