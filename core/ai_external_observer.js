const fs = require("fs");
const path = require("path");

/* ===============================
   CARPETA DE OBSERVACIÓN
================================ */

function observerFolder() {

  const folder = path.join(__dirname, "..", "memory", "external_ai");

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  return folder;

}

/* ===============================
   ARCHIVO DE OBSERVACIONES
================================ */

function observerFile() {

  return path.join(observerFolder(), "observed_capabilities.json");

}

/* ===============================
   CARGAR OBSERVACIONES
================================ */

function loadObserved() {

  const file = observerFile();

  if (!fs.existsSync(file)) {
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return [];
  }

}

/* ===============================
   GUARDAR OBSERVACIÓN
================================ */

function saveObserved(data) {

  const file = observerFile();

  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");

}

/* ===============================
   REGISTRAR CAPACIDAD EXTERNA
================================ */

function observeCapability(name, description, source) {

  if (!name) return;

  const data = loadObserved();

  const exists = data.find(c => c.name === name);

  if (exists) return;

  data.push({
    name,
    description: description || "",
    source: source || "externo",
    detectedAt: new Date().toISOString()
  });

  saveObserved(data);

  console.log("AI Madre observó capacidad externa:", name);

}

/* ===============================
   DETECTAR EN MENSAJES
================================ */

function detectExternalIdeas(message) {

  const text = String(message || "").toLowerCase();

  if (text.includes("sora")) {
    observeCapability(
      "OpenAI Sora",
      "Generación avanzada de video",
      "OpenAI"
    );
  }

  if (text.includes("runway")) {
    observeCapability(
      "Runway AI",
      "Edición y generación de video IA",
      "Runway"
    );
  }

  if (text.includes("elevenlabs")) {
    observeCapability(
      "ElevenLabs Voice",
      "Clonación de voz avanzada",
      "ElevenLabs"
    );
  }

  if (text.includes("midjourney")) {
    observeCapability(
      "Midjourney",
      "Generación avanzada de imágenes",
      "Midjourney"
    );
  }

}

module.exports = {
  detectExternalIdeas
};