// services/memoryStore.js
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(process.cwd(), "data");
const USERS_FILE = path.join(ROOT, "users.json");
const USERS_DIR = path.join(ROOT, "users");

function id(prefix = "") {
  return prefix + crypto.randomBytes(10).toString("hex");
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function ensureFile(file, defaultJson) {
  try {
    await fsp.access(file, fs.constants.F_OK);
  } catch {
    await ensureDir(path.dirname(file));
    await fsp.writeFile(file, JSON.stringify(defaultJson, null, 2), "utf-8");
  }
}

async function readJson(file, fallback) {
  try {
    const s = await fsp.readFile(file, "utf-8");
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

async function writeJson(file, data) {
  await ensureDir(path.dirname(file));
  await fsp.writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}

async function initStore() {
  await ensureDir(ROOT);
  await ensureDir(USERS_DIR);
  await ensureFile(USERS_FILE, { users: [] });
}

function userFolder(userId) {
  return path.join(USERS_DIR, userId);
}
function userProfileFile(userId) {
  return path.join(userFolder(userId), "profile.json");
}
function userChatsIndexFile(userId) {
  return path.join(userFolder(userId), "chats.json");
}
function chatFile(userId, chatId) {
  return path.join(userFolder(userId), "chats", `${chatId}.json`);
}

async function createUser({ name, email, consent }) {
  await initStore();

  const usersDb = await readJson(USERS_FILE, { users: [] });

  // Si el correo ya existe, devolvemos el usuario (no duplicamos)
  const existing = usersDb.users.find(u => (u.email || "").toLowerCase() === (email || "").toLowerCase());
  if (existing) {
    return existing;
  }

  const userId = id("u_");
  const sessionToken = id("s_");

  const user = {
    userId,
    sessionToken,
    name: name || "Usuario",
    email: email || "",
    consent: !!consent,
    createdAt: new Date().toISOString()
  };

  usersDb.users.unshift(user);
  await writeJson(USERS_FILE, usersDb);

  // Crear carpeta + perfil + chats index
  await ensureDir(userFolder(userId));
  await writeJson(userProfileFile(userId), user);
  await writeJson(userChatsIndexFile(userId), {
    chats: [
      {
        chatId: "c_ia",
        title: "Asistente (IA)",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  });

  // Crear chat inicial
  await ensureDir(path.dirname(chatFile(userId, "c_ia")));
  await writeJson(chatFile(userId, "c_ia"), {
    chatId: "c_ia",
    title: "Asistente (IA)",
    messages: [
      {
        id: id("m_"),
        from: "them",
        text: "¡Hola! Soy ARC Privus Messenger. Tu historial quedará guardado en el servidor.",
        ts: new Date().toISOString()
      }
    ]
  });

  return user;
}

async function getUser(userId) {
  await initStore();
  const profile = await readJson(userProfileFile(userId), null);
  return profile;
}

async function validateSession(userId, sessionToken) {
  const user = await getUser(userId);
  if (!user) return null;
  if (user.sessionToken !== sessionToken) return null;
  return user;
}

async function listChats(userId) {
  await initStore();
  const idx = await readJson(userChatsIndexFile(userId), { chats: [] });
  return idx.chats || [];
}

async function createChat(userId, title) {
  await initStore();
  const idx = await readJson(userChatsIndexFile(userId), { chats: [] });

  const chatId = id("c_");
  const now = new Date().toISOString();

  const chatMeta = { chatId, title: title || "Nuevo chat", createdAt: now, updatedAt: now };
  idx.chats.unshift(chatMeta);
  await writeJson(userChatsIndexFile(userId), idx);

  await ensureDir(path.dirname(chatFile(userId, chatId)));
  await writeJson(chatFile(userId, chatId), { chatId, title: chatMeta.title, messages: [] });

  return chatMeta;
}

async function getChat(userId, chatId) {
  await initStore();
  return await readJson(chatFile(userId, chatId), null);
}

async function addMessage(userId, chatId, { from, text }) {
  await initStore();

  const chat = await getChat(userId, chatId);
  if (!chat) return null;

  chat.messages = chat.messages || [];
  chat.messages.push({
    id: id("m_"),
    from: from === "me" ? "me" : "them",
    text: String(text || ""),
    ts: new Date().toISOString()
  });

  await writeJson(chatFile(userId, chatId), chat);

  // actualizar updatedAt
  const idx = await readJson(userChatsIndexFile(userId), { chats: [] });
  const meta = (idx.chats || []).find(c => c.chatId === chatId);
  if (meta) meta.updatedAt = new Date().toISOString();
  await writeJson(userChatsIndexFile(userId), idx);

  return chat;
}

module.exports = {
  createUser,
  getUser,
  validateSession,
  listChats,
  createChat,
  getChat,
  addMessage
};