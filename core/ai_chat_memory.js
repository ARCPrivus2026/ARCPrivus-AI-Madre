const fs = require("fs");
const path = require("path");

/* ==========================================
CARPETA DE MEMORIA
========================================== */

const MEMORY_FOLDER = path.join(__dirname, "..", "memory", "conversations");

function ensureFolder() {

try {

if (!fs.existsSync(MEMORY_FOLDER)) {
  fs.mkdirSync(MEMORY_FOLDER, { recursive: true });
}

} catch (err) {
console.log("Error creando carpeta memoria:", err);
}

}

/* ==========================================
NOMBRE SEGURO
========================================== */

function safeName(user) {

return String(user || "usuario")
.replace(/[^\w-]/g, "_")
.toLowerCase();

}

/* ==========================================
GUARDAR CONVERSACIÓN
========================================== */

function saveConversation(user, message, reply) {

try {

ensureFolder();

const file = path.join(MEMORY_FOLDER, safeName(user) + ".json");

let data = { history: [] };

if (fs.existsSync(file)) {

  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    data = { history: [] };
  }

}

data.history.push({

  user: message,
  ai: reply,
  date: new Date().toISOString()

});

/* limitar memoria */

if (data.history.length > 200) {
  data.history = data.history.slice(-200);
}

fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");

} catch (error) {

console.log("Error guardando conversación:", error);

}

}

/* ==========================================
OBTENER CONVERSACIÓN
========================================== */

function getConversation(user) {

try {

ensureFolder();

const file = path.join(MEMORY_FOLDER, safeName(user) + ".json");

if (!fs.existsSync(file)) {
  return { history: [] };
}

try {

  const data = JSON.parse(fs.readFileSync(file, "utf8"));

  return data;

} catch {

  return { history: [] };

}

} catch (error) {

console.log("Error leyendo conversación:", error);

return { history: [] };

}

}

/* ==========================================
BORRAR CONVERSACIÓN
========================================== */

function clearConversation(user) {

try {

const file = path.join(MEMORY_FOLDER, safeName(user) + ".json");

if (fs.existsSync(file)) {
  fs.unlinkSync(file);
}

} catch (error) {

console.log("Error borrando conversación:", error);

}

}

module.exports = {

saveConversation,
getConversation,
clearConversation

};