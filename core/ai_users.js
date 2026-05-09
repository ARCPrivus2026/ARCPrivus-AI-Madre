const fs = require("fs");
const path = require("path");

function folder() {
  const f = path.join(__dirname, "..", "memory", "users");
  if (!fs.existsSync(f)) {
    fs.mkdirSync(f, { recursive: true });
  }
  return f;
}

function safeName(user) {
  return String(user || "usuario").replace(/[^\w\-]/g, "_");
}

function saveUser(user, data) {
  const file = path.join(folder(), safeName(user) + ".json");

  const payload = {
    name: data.name,
    email: data.email,
    assistantName: data.assistantName || "AI Madre",
    created: new Date().toISOString()
  };

  fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");

  return payload;
}

function getUser(user) {
  const file = path.join(folder(), safeName(user) + ".json");

  if (!fs.existsSync(file)) return null;

  return JSON.parse(fs.readFileSync(file, "utf8"));
}

module.exports = { saveUser, getUser };