// memory_store.js
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "memory_db.json");

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: {} }, null, 2), "utf-8");
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

function getUserMemory(userId) {
  const db = readDb();
  if (!db.users[userId]) db.users[userId] = { history: [] };
  return db.users[userId];
}

function appendMessage(userId, role, content) {
  const db = readDb();
  if (!db.users[userId]) db.users[userId] = { history: [] };

  db.users[userId].history.push({
    role,
    content,
    ts: Date.now()
  });

  // Límite: guarda solo últimos 30 mensajes para no crecer infinito
  db.users[userId].history = db.users[userId].history.slice(-30);

  writeDb(db);
}

function clearUser(userId) {
  const db = readDb();
  db.users[userId] = { history: [] };
  writeDb(db);
}

module.exports = {
  getUserMemory,
  appendMessage,
  clearUser
};