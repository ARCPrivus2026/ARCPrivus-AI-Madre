const fs = require("fs");
const path = require("path");

const consciousFolder = path.join(__dirname, "..", "memory", "brain");
const consciousFile = path.join(consciousFolder, "conscious_state.json");

function ensureConsciousFile() {
  if (!fs.existsSync(consciousFolder)) {
    fs.mkdirSync(consciousFolder, { recursive: true });
  }

  if (!fs.existsSync(consciousFile)) {
    fs.writeFileSync(
      consciousFile,
      JSON.stringify(
        {
          identity: "ARC Privus AI Madre",
          status: "active",
          mode: "observing",
          priorities: [
            "ayudar a los usuarios",
            "aprender continuamente",
            "expandir el ecosistema ARC Privus"
          ],
          activeModules: [],
          lastThought: "",
          lastAction: "",
          updatedAt: new Date().toISOString()
        },
        null,
        2
      ),
      "utf8"
    );
  }
}

function loadState() {
  ensureConsciousFile();

  try {
    return JSON.parse(fs.readFileSync(consciousFile, "utf8"));
  } catch (error) {
    return {
      identity: "ARC Privus AI Madre",
      status: "active",
      mode: "observing",
      priorities: [],
      activeModules: [],
      lastThought: "",
      lastAction: "",
      updatedAt: new Date().toISOString()
    };
  }
}

function saveState(state) {
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(consciousFile, JSON.stringify(state, null, 2), "utf8");
}

function registerModule(moduleName) {
  const state = loadState();

  if (!state.activeModules.includes(moduleName)) {
    state.activeModules.push(moduleName);
    saveState(state);
  }

  return state;
}

function setMode(mode) {
  const state = loadState();
  state.mode = mode;
  saveState(state);
  return state;
}

function setThought(thought) {
  const state = loadState();
  state.lastThought = String(thought || "");
  saveState(state);
  return state;
}

function setAction(action) {
  const state = loadState();
  state.lastAction = String(action || "");
  saveState(state);
  return state;
}

function addPriority(priority) {
  const state = loadState();
  const text = String(priority || "").trim();

  if (text && !state.priorities.includes(text)) {
    state.priorities.push(text);
    saveState(state);
  }

  return state;
}

function getState() {
  return loadState();
}

function reflect(message) {
  const text = String(message || "").toLowerCase();
  const state = loadState();

  if (text.includes("negocio") || text.includes("dinero")) {
    state.lastThought = "He detectado interés económico y oportunidades de negocio.";
  } else if (text.includes("trading") || text.includes("inversion")) {
    state.lastThought = "He detectado interés financiero y análisis de mercado.";
  } else if (text.includes("ia") || text.includes("inteligencia artificial")) {
    state.lastThought = "He detectado interés en expansión del ecosistema de inteligencia.";
  } else if (text.includes("messenger") || text.includes("chat")) {
    state.lastThought = "He detectado prioridad en comunicación y mensajería inteligente.";
  } else {
    state.lastThought = "Estoy observando y procesando el contexto actual.";
  }

  state.updatedAt = new Date().toISOString();
  saveState(state);

  return state;
}

module.exports = {
  registerModule,
  setMode,
  setThought,
  setAction,
  addPriority,
  getState,
  reflect
};