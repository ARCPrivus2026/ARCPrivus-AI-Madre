const fs = require("fs");
const path = require("path");

const DB = path.join(__dirname, "..", "memory", "ai_ecosystem_core.json");

function loadDB(){

  if(!fs.existsSync(DB)){
    fs.writeFileSync(DB, JSON.stringify({
      modules: [],
      apps: [],
      links: [],
      status: "active",
      updatedAt: null
    }, null, 2), "utf8");
  }

  try{
    return JSON.parse(fs.readFileSync(DB, "utf8"));
  }catch{
    return {
      modules: [],
      apps: [],
      links: [],
      status: "active",
      updatedAt: null
    };
  }

}

function saveDB(data){
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(DB, JSON.stringify(data, null, 2), "utf8");
}

function registerApp(name, type){

  if(!name) return;

  const db = loadDB();

  const exists = db.apps.find(x => x.name === name);

  if(exists) return;

  db.apps.push({
    name,
    type: type || "general",
    createdAt: new Date().toISOString()
  });

  saveDB(db);

  console.log("AI Madre registró app del ecosistema:", name);
}

function registerModule(name, role){

  if(!name) return;

  const db = loadDB();

  const exists = db.modules.find(x => x.name === name);

  if(exists) return;

  db.modules.push({
    name,
    role: role || "support",
    createdAt: new Date().toISOString()
  });

  saveDB(db);

  console.log("AI Madre registró módulo del ecosistema:", name);
}

function linkElements(from, to, relation){

  if(!from || !to) return;

  const db = loadDB();

  const exists = db.links.find(
    x => x.from === from && x.to === to && x.relation === relation
  );

  if(exists) return;

  db.links.push({
    from,
    to,
    relation: relation || "connected_to",
    createdAt: new Date().toISOString()
  });

  saveDB(db);

  console.log("AI Madre enlazó elementos:", from, "→", to);
}

function analyzeEcosystem(){

  const db = loadDB();

  const summary = {
    status: db.status,
    apps: db.apps.length,
    modules: db.modules.length,
    links: db.links.length,
    updatedAt: db.updatedAt
  };

  return summary;
}

function getState(){
  return loadDB();
}

module.exports = {
  registerApp,
  registerModule,
  linkElements,
  analyzeEcosystem,
  getState
};