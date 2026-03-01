const chatWindow = document.getElementById("chatWindow");
const messageInput = document.getElementById("messageInput");
const btnSend = document.getElementById("btnSend");

const toggleTranslate = document.getElementById("toggleTranslate");
const targetLang = document.getElementById("targetLang");

const btnMenu = document.getElementById("btnMenu");
const menu = document.getElementById("menu");

const viewChat = document.getElementById("viewChat");
const viewStatus = document.getElementById("viewStatus");
const viewSettings = document.getElementById("viewSettings");

const btnPromo = document.getElementById("btnPromo");

// Cámara
const btnCamera = document.getElementById("btnCamera");
const cameraModal = document.getElementById("cameraModal");
const btnCloseCamera = document.getElementById("btnCloseCamera");
const btnStartCam = document.getElementById("btnStartCam");
const btnStopCam = document.getElementById("btnStopCam");
const btnSnap = document.getElementById("btnSnap");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const photo = document.getElementById("photo");
const camMsg = document.getElementById("camMsg");

let camStream = null;

// Llamadas (MVP)
const btnCalls = document.getElementById("btnCalls");
const callsModal = document.getElementById("callsModal");
const btnCloseCalls = document.getElementById("btnCloseCalls");
const btnPrepareCall = document.getElementById("btnPrepareCall");
const callMsg = document.getElementById("callMsg");

// Estados (MVP local)
const statusFile = document.getElementById("statusFile");
const statusDuration = document.getElementById("statusDuration");
const btnPublishStatus = document.getElementById("btnPublishStatus");
const statusResult = document.getElementById("statusResult");
const statusList = document.getElementById("statusList");

const statuses = [];

function bubble(text, who = "bot", extraSmall = null) {
  const div = document.createElement("div");
  div.className = `bubble ${who}`;
  div.textContent = text;
  if (extraSmall) {
    const small = document.createElement("div");
    small.className = "small";
    small.textContent = extraSmall;
    div.appendChild(small);
  }
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

bubble("¡Hola! Soy ARC Privus Messenger (MVP). Escribe y te respondo. Activa traducción si la necesitas.", "bot");

// Enviar mensaje al backend
async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

  bubble(message, "me");
  messageInput.value = "";

  const payload = {
    message,
    translate: toggleTranslate.checked,
    targetLang: targetLang.value
  };

  try {
    const r = await fetch("/api/server", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await r.json();

    if (!r.ok) {
      bubble(`Error: ${data?.error || "fallo"}`, "bot");
      return;
    }

    bubble(data.reply || "Sin respuesta.", "bot");

    if (data.translatedReply) {
      bubble(data.translatedReply, "bot", "Traducción");
    }

  } catch (e) {
    bubble("Error de conexión con el servidor.", "bot");
  }
}

btnSend.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

// Menú
btnMenu.addEventListener("click", () => {
  menu.classList.toggle("show");
});
document.addEventListener("click", (e) => {
  if (!btnMenu.contains(e.target) && !menu.contains(e.target)) {
    menu.classList.remove("show");
  }
});

menu.querySelectorAll(".menu-item[data-view]").forEach(btn => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.view;
    viewChat.classList.add("hidden");
    viewStatus.classList.add("hidden");
    viewSettings.classList.add("hidden");

    if (view === "chat") viewChat.classList.remove("hidden");
    if (view === "status") viewStatus.classList.remove("hidden");
    if (view === "settings") viewSettings.classList.remove("hidden");

    menu.classList.remove("show");
  });
});

// Autopublicidad (MVP)
btnPromo.addEventListener("click", () => {
  menu.classList.remove("show");
  bubble("✅ Autopublicidad: fase 1 será una página de invitación + registro + botón de compartir. Luego se convierte en plataforma de anuncios pagados.", "bot");
});

// Cámara
btnCamera.addEventListener("click", () => {
  cameraModal.classList.remove("hidden");
});

btnCloseCamera.addEventListener("click", async () => {
  await stopCamera();
  cameraModal.classList.add("hidden");
});

btnStartCam.addEventListener("click", async () => {
  camMsg.textContent = "";
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = camStream;
    photo.classList.add("hidden");
    camMsg.textContent = "Cámara activa ✅";
  } catch (e) {
    camMsg.textContent = "No se pudo acceder a la cámara. Revisa permisos del navegador.";
  }
});

async function stopCamera() {
  if (camStream) {
    camStream.getTracks().forEach(t => t.stop());
    camStream = null;
    video.srcObject = null;
    camMsg.textContent = "Cámara detenida.";
  }
}

btnStopCam.addEventListener("click", stopCamera);

btnSnap.addEventListener("click", () => {
  if (!camStream) {
    camMsg.textContent = "Primero activa la cámara.";
    return;
  }
  const w = video.videoWidth;
  const h = video.videoHeight;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, w, h);
  const dataUrl = canvas.toDataURL("image/png");
  photo.src = dataUrl;
  photo.classList.remove("hidden");
  camMsg.textContent = "Foto tomada ✅ (MVP local)";
});

// Videollamadas (MVP)
btnCalls.addEventListener("click", () => callsModal.classList.remove("hidden"));
btnCloseCalls.addEventListener("click", () => callsModal.classList.add("hidden"));

btnPrepareCall.addEventListener("click", async () => {
  callMsg.textContent = "";
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    // no hacemos conexión aún; solo comprobamos cámara/mic
    s.getTracks().forEach(t => t.stop());
    callMsg.textContent = "Cámara y micrófono listos ✅ (Para llamada real hacemos fase 2 con señalización).";
  } catch (e) {
    callMsg.textContent = "No se pudo acceder a cámara/mic. Revisa permisos.";
  }
});

// Estados (MVP local)
btnPublishStatus.addEventListener("click", () => {
  const file = statusFile.files[0];
  if (!file) {
    statusResult.textContent = "Selecciona un archivo primero.";
    return;
  }

  const isVideo = file.type.startsWith("video/");
  if (isVideo) {
    // límite 5 minutos: aquí solo dejamos regla; validación real se hace con metadata (fase 2)
    // MVP: aceptamos y guardamos local
  }

  const item = {
    name: file.name,
    type: file.type,
    duration: statusDuration.value,
    date: new Date().toLocaleString()
  };
  statuses.unshift(item);
  statusResult.textContent = "Estado publicado (MVP local) ✅";
  renderStatuses();
});

function renderStatuses() {
  statusList.innerHTML = "";
  statuses.forEach(s => {
    const div = document.createElement("div");
    div.className = "status-item";
    div.innerHTML = `
      <div><b>${s.name}</b></div>
      <div class="muted">${s.type || "archivo"}</div>
      <div class="muted">Duración: ${s.duration === "24h" ? "24 horas" : "8 días"} • ${s.date}</div>
    `;
    statusList.appendChild(div);
  });
}