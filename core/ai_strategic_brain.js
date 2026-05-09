const fs = require("fs");
const path = require("path");

const MEMORY_FOLDER = path.join(__dirname, "..", "memory");
const DB = path.join(MEMORY_FOLDER, "ai_strategies.json");

/* ===============================
   ASEGURAR CARPETA
================================ */

function ensureFolder() {

  if (!fs.existsSync(MEMORY_FOLDER)) {
    fs.mkdirSync(MEMORY_FOLDER, { recursive: true });
  }

}

/* ===============================
   CARGAR BASE DE DATOS
================================ */

function loadDB() {

  ensureFolder();

  if (!fs.existsSync(DB)) {
    fs.writeFileSync(DB, JSON.stringify({ strategies: [] }, null, 2), "utf8");
  }

  try {
    return JSON.parse(fs.readFileSync(DB, "utf8"));
  } catch {
    return { strategies: [] };
  }

}

/* ===============================
   GUARDAR BASE DE DATOS
================================ */

function saveDB(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2), "utf8");
}

/* ===============================
   CREAR ESTRATEGIAS
================================ */

function buildStrategies(input = {}) {

  const {
    capabilities = [],
    goals = [],
    systems = [],
    knowledge = []
  } = input;

  const db = loadDB();
  const newStrategies = [];

  function addStrategy(name, description) {

    const exists = db.strategies.find(s => s.name === name);

    if (!exists) {

      const strategy = {
        name,
        description,
        createdAt: new Date().toISOString()
      };

      db.strategies.push(strategy);
      newStrategies.push(strategy);

      console.log("Nueva estrategia IA:", name);

    }

  }

  if (capabilities.length >= 2) {
    addStrategy(
      "expand_capabilities",
      "Combinar capacidades existentes para crear nuevos servicios ARC"
    );
  }

  if (goals.length > 0 && capabilities.length > 0) {
    addStrategy(
      "goal_alignment",
      "Alinear capacidades con objetivos estratégicos del sistema"
    );
  }

  if (systems.length > 1) {
    addStrategy(
      "system_integration",
      "Integrar múltiples sistemas para mejorar eficiencia"
    );
  }

  if (knowledge.length > 0) {
    addStrategy(
      "knowledge_expansion",
      "Usar conocimiento acumulado para mejorar decisiones estratégicas"
    );
  }

  saveDB(db);

  return newStrategies;
}

module.exports = {
  buildStrategies
};