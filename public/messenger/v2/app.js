let currentUser = null;
let currentChat = null;

const socket = io();

// =====================
// AUTH
// =====================

async function register() {
  const user = document.getElementById("user").value;
  const pass = document.getElementById("pass").value;

  const res = await fetch("/api/register", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ user, pass })
  });

  const data = await res.json();

  if (data.error) return alert(data.error);

  alert("Cuenta creada. Ahora inicia sesión.");
}

async function login() {
  const user = document.getElementById("user").value;
  const pass = document.getElementById("pass").value;

  const res = await fetch("/api/login", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ user, pass })
  });

  const data = await res.json();

  if (data.error) return alert(data.error);

  currentUser = data.user;

  document.getElementById("login").style.display = "none";
  document.getElementById("app").style.display = "flex";

  loadPlan();
  loadChats();
}

// =====================
// PLAN
// =====================

async function loadPlan() {
  const res = await fetch(`/api/plan?userId=${currentUser}`);
  const data = await res.json();

  document.getElementById("planText").innerText = "Plan: " + data.plan;
}

// =====================
// CHATS
// =====================

async function loadChats() {
  const res = await fetch(`/api/chats?userId=${currentUser}`);
  const data = await res.json();

  const list = document.getElementById("chatList");
  list.innerHTML = "";

  data.chats.forEach(chat => {
    const div = document.createElement("div");
    div.innerText = chat.name;

    div.onclick = () => openChat(chat._id, chat.name);

    list.appendChild(div);
  });

  if (data.chats.length > 0) {
    openChat(data.chats[0]._id, data.chats[0].name);
  }
}

async function newChat() {
  const name = prompt("Nombre del chat:");
  if (!name) return;

  const res = await fetch("/api/chats", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ userId: currentUser, name })
  });

  const data = await res.json();

  loadChats();
}

// =====================
// CHAT
// =====================

async function openChat(chatId, name) {
  currentChat = chatId;

  document.getElementById("chatName").innerText = name;

  socket.emit("join", chatId);

  const res = await fetch(`/api/chat/history?userId=${currentUser}&chatId=${chatId}`);
  const data = await res.json();

  const box = document.getElementById("messages");
  box.innerHTML = "";

  data.history.forEach(m => {
    addMessage(m.role === "user" ? "user" : "ai", m.content);
  });
}

// =====================
// SEND
// =====================

async function send() {
  const input = document.getElementById("input");
  const text = input.value.trim();

  if (!text) return;

  // ⚠️ VALIDACIÓN CLAVE
  if (!currentChat) {
    alert("Primero selecciona o crea un chat");
    return;
  }

  addMessage("user", text);
  input.value = "";

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      message: text,
      userId: currentUser,
      chatId: currentChat
    })
  });

  const data = await res.json();

  addMessage("ai", data.reply);
}

// =====================
// QUICK ASK
// =====================

function quickAsk(text) {
  document.getElementById("input").value = text;
  send();
}

// =====================
// UI
// =====================

function addMessage(type, text) {
  const box = document.getElementById("messages");

  const div = document.createElement("div");
  div.className = "msg " + type;

  div.innerText = text;

  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// =====================
// LOGOUT
// =====================

function logout() {
  location.reload();
}

// =====================
// SOCKET (opcional)
// =====================

socket.on("message", (data) => {
  // puedes usar esto para mensajes en tiempo real
});