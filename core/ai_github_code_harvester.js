const https = require("https");
const fs = require("fs");
const path = require("path");

const moduleCreator = require("./ai_module_creator");
const absorptionEngine = require("./ai_absorption_engine");

const DB = path.join(__dirname, "..", "memory", "github_harvest.json");

function loadDB(){
  if(!fs.existsSync(DB)){
    fs.writeFileSync(DB, JSON.stringify({ repos: [], findings: [] }, null, 2), "utf8");
  }

  try{
    return JSON.parse(fs.readFileSync(DB, "utf8"));
  }catch{
    return { repos: [], findings: [] };
  }
}

function saveDB(data){
  fs.writeFileSync(DB, JSON.stringify(data, null, 2), "utf8");
}

function fetchJSON(url){
  return new Promise((resolve, reject)=>{
    https.get(url, {
      headers: {
        "User-Agent": "ARC-Privus-AI-Madre"
      }
    }, (res)=>{
      let data = "";

      res.on("data", chunk => data += chunk);
      res.on("end", ()=>{
        try{
          resolve(JSON.parse(data));
        }catch(error){
          reject(error);
        }
      });
    }).on("error", reject);
  });
}

function fetchText(url){
  return new Promise((resolve, reject)=>{
    https.get(url, {
      headers: {
        "User-Agent": "ARC-Privus-AI-Madre"
      }
    }, (res)=>{
      let data = "";

      res.on("data", chunk => data += chunk);
      res.on("end", ()=> resolve(data));
    }).on("error", reject);
  });
}

function safeModuleName(name){
  return String(name || "generated_module")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function summarizeRepo(repo, readmeText, contents){
  const findings = [];

  const name = repo?.name || "repo";
  const description = repo?.description || "";
  const topics = Array.isArray(repo?.topics) ? repo.topics : [];
  const files = Array.isArray(contents) ? contents.map(x => x.name) : [];

  if(description){
    findings.push(`Repositorio ${name}: ${description}`);
  }

  if(topics.length){
    findings.push(`Temas detectados: ${topics.join(", ")}`);
  }

  if(files.length){
    findings.push(`Archivos relevantes: ${files.slice(0, 20).join(", ")}`);
  }

  if(readmeText){
    const compact = readmeText
      .replace(/[#>*`_\-\[\]\(\)]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1200);

    findings.push(`README resumido: ${compact}`);
  }

  return findings;
}

function inferCapabilities(repo, readmeText, contents){
  const text = [
    repo?.name || "",
    repo?.description || "",
    readmeText || "",
    ...(Array.isArray(contents) ? contents.map(x => x.name) : [])
  ].join(" ").toLowerCase();

  const caps = [];

  if(text.includes("voice") || text.includes("audio") || text.includes("tts")){
    caps.push({
      key: "voice_tools",
      description: "Herramientas de voz, audio o síntesis"
    });
  }

  if(text.includes("video") || text.includes("ffmpeg") || text.includes("movie")){
    caps.push({
      key: "video_tools",
      description: "Herramientas de video o procesamiento multimedia"
    });
  }

  if(text.includes("translate") || text.includes("translation") || text.includes("language")){
    caps.push({
      key: "translation_tools",
      description: "Herramientas de traducción o lenguaje"
    });
  }

  if(text.includes("trading") || text.includes("market") || text.includes("finance")){
    caps.push({
      key: "trading_tools",
      description: "Herramientas de trading, mercado o finanzas"
    });
  }

  if(text.includes("image") || text.includes("vision") || text.includes("diffusion")){
    caps.push({
      key: "image_tools",
      description: "Herramientas de imagen o visión"
    });
  }

  return caps;
}

async function inspectRepo(owner, repoName){
  const apiBase = `https://api.github.com/repos/${owner}/${repoName}`;
  const repo = await fetchJSON(apiBase);
  const contents = await fetchJSON(`${apiBase}/contents`).catch(() => []);
  const readme = await fetchText(`${apiBase}/readme`).catch(() => "");

  const findings = summarizeRepo(repo, readme, contents);
  const capabilities = inferCapabilities(repo, readme, contents);

  const db = loadDB();

  db.repos.unshift({
    owner,
    repo: repoName,
    inspectedAt: new Date().toISOString(),
    description: repo?.description || "",
    stars: repo?.stargazers_count || 0
  });

  findings.forEach(item=>{
    db.findings.unshift({
      source: `${owner}/${repoName}`,
      content: item,
      date: new Date().toISOString()
    });

    absorptionEngine.absorbKnowledge(`github:${owner}/${repoName}`, item);
  });

  capabilities.forEach(cap=>{
    moduleCreator.createModule(safeModuleName(cap.key));
  });

  db.repos = db.repos.slice(0, 50);
  db.findings = db.findings.slice(0, 200);

  saveDB(db);

  return {
    repo: `${owner}/${repoName}`,
    findings,
    capabilities
  };
}

async function runHarvester(){
  const targets = [
    { owner: "openai", repo: "openai-cookbook" },
    { owner: "huggingface", repo: "transformers" },
    { owner: "langchain-ai", repo: "langchain" }
  ];

  const results = [];

  for(const target of targets){
    try{
      const result = await inspectRepo(target.owner, target.repo);
      results.push(result);
    }catch(error){
      results.push({
        repo: `${target.owner}/${target.repo}`,
        error: String(error.message || error)
      });
    }
  }

  return results;
}

function getHarvestState(){
  return loadDB();
}

module.exports = {
  inspectRepo,
  runHarvester,
  getHarvestState
};