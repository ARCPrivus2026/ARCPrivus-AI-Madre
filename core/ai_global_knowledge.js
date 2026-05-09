const fs = require("fs");
const path = require("path");

const brainMap = require("./ai_brain_map");

const DB = path.join(__dirname,"../memory/ai_knowledge.json");

/* =========================
   CARGAR BASE DE CONOCIMIENTO
========================= */

function loadKnowledge(){

  if(!fs.existsSync(DB)){
    fs.writeFileSync(DB,JSON.stringify({knowledge:[]},null,2));
  }

  return JSON.parse(fs.readFileSync(DB));

}

/* =========================
   GUARDAR CONOCIMIENTO
========================= */

function saveKnowledge(data){

  fs.writeFileSync(DB,JSON.stringify(data,null,2));

}

/* =========================
   AGREGAR CONOCIMIENTO
========================= */

function addKnowledge(title,content){

  const data = loadKnowledge();

  const exists = data.knowledge.find(k=>k.title===title);

  if(exists){
    return;
  }

  const item = {

    title,
    content,
    addedAt:new Date().toISOString()

  };

  data.knowledge.push(item);

  saveKnowledge(data);

  /* alimentar cerebro */

  brainMap.analyzeMessage(content);

  console.log("AI Madre aprendió nuevo conocimiento:",title);

}

/* =========================
   BUSCAR CONOCIMIENTO
========================= */

function searchKnowledge(word){

  const data = loadKnowledge();

  const results = data.knowledge.filter(k=>
    k.title.toLowerCase().includes(word.toLowerCase()) ||
    k.content.toLowerCase().includes(word.toLowerCase())
  );

  return results.slice(0,5);

}

module.exports = {
  addKnowledge,
  searchKnowledge
};