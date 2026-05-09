const fs = require("fs");
const path = require("path");

const DB = path.join(__dirname,"../memory/ai_goals.json");

/* =========================
   CARGAR OBJETIVOS
========================= */

function loadGoals(){

  if(!fs.existsSync(DB)){
    fs.writeFileSync(DB,JSON.stringify({goals:[]},null,2));
  }

  return JSON.parse(fs.readFileSync(DB));

}

/* =========================
   GUARDAR OBJETIVOS
========================= */

function saveGoals(data){

  fs.writeFileSync(DB,JSON.stringify(data,null,2));

}

/* =========================
   CREAR OBJETIVO
========================= */

function createGoal(name,description){

  const data = loadGoals();

  const exists = data.goals.find(g=>g.name===name);

  if(exists){
    return;
  }

  const goal = {

    name,
    description,
    createdAt:new Date().toISOString(),
    status:"pending"

  };

  data.goals.push(goal);

  saveGoals(data);

  console.log("AI Madre creó objetivo:",name);

}

/* =========================
   DETECTAR OBJETIVOS
========================= */

function detectGoals(message){

  const text = String(message).toLowerCase();

  if(text.includes("traducción")){
    createGoal(
      "translation_system",
      "Crear sistema de traducción automática"
    );
  }

  if(text.includes("video")){
    createGoal(
      "video_generation",
      "Integrar motor de generación de video"
    );
  }

  if(text.includes("voz")){
    createGoal(
      "voice_generation",
      "Integrar generación de voz"
    );
  }

}

/* =========================
   OBTENER OBJETIVOS
========================= */

function getGoals(){

  const data = loadGoals();

  return data.goals;

}

module.exports = {
  detectGoals,
  getGoals
};