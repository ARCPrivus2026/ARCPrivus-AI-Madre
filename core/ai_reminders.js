const fs = require("fs");
const path = require("path");

function folder() {
  const f = path.join(__dirname, "..", "memory", "conversations");
  if (!fs.existsSync(f)) {
    fs.mkdirSync(f, { recursive: true });
  }
  return f;
}

function safeName(user) {
  return String(user || "usuario").replace(/[^\w\-]/g, "_");
}

function saveConversation(user, message, reply) {
  const file = path.join(folder(), safeName(user) + ".json");

  let data = { history: [] };

  if (fs.existsSync(file)) {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  }

  data.history.push({
    user: message,
    ai: reply,
    date: new Date().toISOString()
  });

  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function getConversation(user) {
  const file = path.join(folder(), safeName(user) + ".json");

  if (!fs.existsSync(file)) {
    return { history: [] };
  }

  return JSON.parse(fs.readFileSync(file, "utf8"));
}

module.exports = { saveConversation, getConversation };