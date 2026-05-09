const fs = require("fs");
const path = require("path");

const PROFILE_FOLDER = path.join(__dirname, "..", "memory", "profiles");

/* ==============================
   ASEGURAR CARPETA
================================ */

function ensureFolder() {
  try {
    if (!fs.existsSync(PROFILE_FOLDER)) {
      fs.mkdirSync(PROFILE_FOLDER, { recursive: true });
    }
  } catch (e) {
    console.log("Error creando carpeta perfiles:", e);
  }
}

/* ==============================
   NOMBRE SEGURO
================================ */

function safeName(user) {
  return String(user || "usuario")
    .replace(/[^\w\-]/g, "_")
    .toLowerCase();
}

/* ==============================
   OBTENER PERFIL
================================ */

function getProfile(user) {
  try {
    ensureFolder();

    const file = path.join(PROFILE_FOLDER, safeName(user) + ".json");

    if (!fs.existsSync(file)) {
      return {};
    }

    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.log("Error leyendo perfil:", e);
    return {};
  }
}

/* ==============================
   GUARDAR PERFIL
================================ */

function saveProfile(user, data) {
  try {
    ensureFolder();

    const file = path.join(PROFILE_FOLDER, safeName(user) + ".json");

    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.log("Error guardando perfil:", e);
  }
}

/* ==============================
   APRENDER DEL MENSAJE
================================ */

function learnFromMessage(user, message) {
  try {
    const profile = getProfile(user);
    const raw = String(message || "").trim();
    const text = raw.toLowerCase();

    if (!raw) return;

    /* aprender nombre */
    if (text.includes("me llamo ")) {
      const parts = raw.split(/me llamo/i);
      if (parts[1]) {
        profile.name = parts[1].trim();
      }
    }

    /* aprender ciudad */
    if (text.includes("soy de ")) {
      const parts = raw.split(/soy de/i);
      if (parts[1]) {
        profile.city = parts[1].trim();
      }
    }

    /* aprender idioma */
    if (text.includes("hablo ")) {
      const parts = raw.split(/hablo/i);
      if (parts[1]) {
        profile.language = parts[1].trim();
      }
    }

    /* aprender correo */
    if (text.includes("mi correo es ")) {
      const parts = raw.split(/mi correo es/i);
      if (parts[1]) {
        profile.email = parts[1].trim();
      }
    }

    saveProfile(user, profile);
  } catch (e) {
    console.log("Error aprendiendo perfil:", e);
  }
}

module.exports = {
  getProfile,
  saveProfile,
  learnFromMessage
};