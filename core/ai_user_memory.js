const fs = require("fs");
const path = require("path");

function getMemoryFolder() {

  const folder = path.join(__dirname, "..", "memory", "user_memory");

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  return folder;
}

function safeUser(user) {

  return String(user || "usuario")
    .replace(/[^\w\-]/g, "_")
    .toLowerCase();

}

function getMemoryFile(user) {

  return path.join(getMemoryFolder(), `${safeUser(user)}.json`);

}

function getUserMemory(user) {

  const file = getMemoryFile(user);

  if (!fs.existsSync(file)) {
    return {
      profile: {},
      preferences: {},
      facts: [],
      updatedAt: null
    };
  }

  try {

    return JSON.parse(fs.readFileSync(file, "utf8"));

  } catch (error) {

    return {
      profile: {},
      preferences: {},
      facts: [],
      updatedAt: null
    };

  }

}

function saveUserMemory(user, memory) {

  const file = getMemoryFile(user);

  const cleanMemory = {

    profile: memory.profile || {},

    preferences: memory.preferences || {},

    facts: Array.isArray(memory.facts)
      ? memory.facts.slice(0, 50)
      : [],

    updatedAt: new Date().toISOString()

  };

  fs.writeFileSync(file, JSON.stringify(cleanMemory, null, 2), "utf8");

}

function addFact(user, fact) {

  if (!fact || !String(fact).trim()) return;

  const memory = getUserMemory(user);

  const cleanFact = String(fact).trim().slice(0,200);

  if (!memory.facts.includes(cleanFact)) {

    memory.facts.unshift(cleanFact);

  }

  memory.facts = memory.facts.slice(0, 50);

  saveUserMemory(user, memory);

}

function setPreference(user, key, value) {

  if (!key) return;

  const memory = getUserMemory(user);

  memory.preferences[key] = value;

  saveUserMemory(user, memory);

}

function setProfile(user, key, value) {

  if (!key) return;

  const memory = getUserMemory(user);

  memory.profile[key] = value;

  saveUserMemory(user, memory);

}

module.exports = {

  getUserMemory,
  saveUserMemory,
  addFact,
  setPreference,
  setProfile

};