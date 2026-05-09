const fs = require("fs");
const path = require("path");

const DB = path.join(__dirname, "..", "memory", "ai_planetary_network.json");

function loadDB(){
  if(!fs.existsSync(DB)){
    fs.writeFileSync(DB, JSON.stringify({
      nodes: [],
      links: [],
      events: []
    }, null, 2), "utf8");
  }

  try{
    return JSON.parse(fs.readFileSync(DB, "utf8"));
  }catch{
    return {
      nodes: [],
      links: [],
      events: []
    };
  }
}

function saveDB(data){
  fs.writeFileSync(DB, JSON.stringify(data, null, 2), "utf8");
}

function logEvent(type, description){
  const db = loadDB();

  db.events.unshift({
    type,
    description,
    time: new Date().toISOString()
  });

  db.events = db.events.slice(0, 200);

  saveDB(db);

  console.log("AI Planetary Event:", type, "-", description);
}

function registerNode(name, endpoint, role = "general"){

  if(!name || !endpoint) return null;

  const db = loadDB();

  const exists = db.nodes.find(
    n => n.name === name || n.endpoint === endpoint
  );

  if(exists){
    return exists;
  }

  const node = {
    id: "node_" + Date.now(),
    name,
    endpoint,
    role,
    status: "registered",
    createdAt: new Date().toISOString(),
    lastSeenAt: null
  };

  db.nodes.push(node);
  saveDB(db);

  logEvent("node_registered", `Nodo registrado: ${name}`);

  return node;
}

function updateNodeStatus(endpoint, status = "online"){

  const db = loadDB();

  const node = db.nodes.find(n => n.endpoint === endpoint);

  if(!node) return null;

  node.status = status;
  node.lastSeenAt = new Date().toISOString();

  saveDB(db);

  logEvent("node_status", `${node.name} cambió a ${status}`);

  return node;
}

function linkNodes(fromName, toName, relation = "connected_to"){

  if(!fromName || !toName) return null;

  const db = loadDB();

  const exists = db.links.find(
    l => l.from === fromName && l.to === toName && l.relation === relation
  );

  if(exists){
    return exists;
  }

  const link = {
    from: fromName,
    to: toName,
    relation,
    createdAt: new Date().toISOString()
  };

  db.links.push(link);
  saveDB(db);

  logEvent("node_link", `${fromName} → ${toName}`);

  return link;
}

function analyzeNetwork(){

  const db = loadDB();

  return {
    totalNodes: db.nodes.length,
    onlineNodes: db.nodes.filter(n => n.status === "online").length,
    offlineNodes: db.nodes.filter(n => n.status === "offline").length,
    totalLinks: db.links.length,
    totalEvents: db.events.length
  };
}

function getState(){
  return loadDB();
}

module.exports = {
  registerNode,
  updateNodeStatus,
  linkNodes,
  analyzeNetwork,
  getState
};