"use strict";

const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "data");

const globalFile = path.join(dataDir, "memory_global.json");
const usersFile = path.join(dataDir, "memory_users.json");

// Crear carpeta si no existe
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

// Crear archivos si no existen
if (!fs.existsSync(globalFile)) fs.writeFileSync(globalFile, "[]");
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, "{}");

function read(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function write(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// =====================
// Guardar mensajes
// =====================

function addUserMessage(userId, role, text) {
  const users = read(usersFile);

  if (!users[userId]) users[userId] = [];

  users[userId].push({
    role,
    text,
    time: new Date().toISOString()
  });

  write(usersFile, users);

  const global = read(globalFile);
  global.push({ userId, role, text, time: new Date().toISOString() });
  write(globalFile, global);
}

// =====================
// Construir contexto IA
// =====================

function buildMessages(userId, newMessage, limit = 10) {
  const users = read(usersFile);

  const history = users[userId] || [];

  const last = history.slice(-limit).map(m => ({
    role: m.role,
    content: m.text
  }));

  return [
    { role: "system", content: "Eres ARC Privus AI Madre, una inteligencia avanzada, clara y amable." },
    ...last,
    { role: "user", content: newMessage }
  ];
}

// =====================
// Estadísticas
// =====================

function getStats() {
  const global = read(globalFile);
  const users = read(usersFile);

  return {
    usuarios: Object.keys(users).length,
    mensajes: global.length
  };
}

module.exports = {
  addUserMessage,
  buildMessages,
  getStats
};