// ================= IMPORTS =================
import { apiChat } from "./transport.js";
import { addMessage, setStatus, setBrandSub, markLastUserSeen, clearChat } from "./ui.js";
import { speak, createRecognizer, stopSpeak } from "./voice.js";
import { runFeature, processCommand } from "./features.js";

// ================= UI =================

const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("input");

const btnSend = document.getElementById("btnSend");
const btnMic = document.getElementById("btnMic");
const btnSpeaker = document.getElementById("btnSpeaker");
const btnMenu = document.getElementById("btnMenu");
const btnCam = document.getElementById("btnCam");
const btnQuick = document.getElementById("btnQuick");

const menu = document.getElementById("menu");
const brand = document.getElementById("brand");

const aiOrb = document.getElementById("aiOrb");
const orbPanel = document.getElementById("orbPanel");
const orbMic = document.getElementById("orbMic");
const orbSpeak = document.getElementById("orbSpeak");
const orbCam = document.getElementById("orbCam");
const orbClear = document.getElementById("orbClear");

// ================= CÁMARA =================

const camOverlay = document.getElementById("camOverlay");
const camVideo = document.getElementById("camVideo");
const camCanvas = document.getElementById("camCanvas");
const camClose = document.getElementById("camClose");
const camCapture = document.getElementById("camCapture");
const camStop = document.getElementById("camStop");

let camStream = null;

// ================= STATE =================

let speakerOn = true;
let micOn = false;

setStatus("En línea");
setBrandSub("En línea");

// ================= VOZ =================

const recognizer = createRecognizer({
  lang: "es-ES",
  onStart: () => {
    micOn = true;
    btnMic.classList.add("listening");
    setStatus("Escuchando…");
    setBrandSub("Escuchando…");
  },
  onEnd: () => {
    micOn = false;
    btnMic.classList.remove("listening");
    setStatus("En línea");
    setBrandSub("En línea");
  },
  onText: (txt) => {
    inputEl.value = txt;
    send();
  }
});

// ================= EVENTOS =================

btnSend.onclick = send;

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") send();
});

brand.addEventListener("click", () => {
  brand.classList.toggle("zoom");
});

btnSpeaker.onclick = () => {
  speakerOn = !speakerOn;
  btnSpeaker.classList.toggle("on", speakerOn);
  if (!speakerOn) stopSpeak();
};

btnMic.onclick = () => {
  if (!recognizer) return;
  if (!micOn) recognizer.start();
  else recognizer.stop();
};

btnMenu.onclick = () => {
  menu.classList.toggle("open");
};

btnCam.onclick = openCamera;

aiOrb.onclick = () => orbPanel.classList.toggle("open");
aiOrb.ondblclick = () => {
  if (!recognizer) return;
  if (!micOn) recognizer.start();
  else recognizer.stop();
};

orbCam.onclick = openCamera;
orbClear.onclick = () => clearChat(chatEl);

btnQuick.onclick = () => orbPanel.classList.toggle("open");

// ================= CÁMARA =================

async function openCamera() {
  try {
    camOverlay.classList.add("open");

    camStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });

    camVideo.srcObject = camStream;

  } catch (e) {
    addMessage(chatEl, "ai", "No se pudo acceder a la cámara.");
    closeCamera();
  }
}

function closeCamera() {
  camOverlay.classList.remove("open");

  if (camStream) {
    camStream.getTracks().forEach(track => track.stop());
    camStream = null;
  }

  camVideo.srcObject = null;
}

camClose.onclick = closeCamera;
camStop.onclick = closeCamera;

camCapture.onclick = () => {
  if (!camStream) return;

  const w = camVideo.videoWidth || 640;
  const h = camVideo.videoHeight || 480;

  camCanvas.width = w;
  camCanvas.height = h;

  const ctx = camCanvas.getContext("2d");
  ctx.drawImage(camVideo, 0, 0, w, h);

  const image = camCanvas.toDataURL("image/png");

  addMessage(chatEl, "user", "📷 Foto capturada", { image });
  markLastUserSeen(chatEl, false);

  closeCamera();
};

// ================= ENVÍO IA =================

async function send() {
  const text = inputEl.value.trim();
  if (!text) return;

  addMessage(chatEl, "user", text, { ticks: "✓" });
  inputEl.value = "";

  setStatus("Escribiendo…");
  setBrandSub("Escribiendo…");

  const loading = addMessage(chatEl, "ai", "Procesando…");

  try {
    const reply = await apiChat(text);
    loading.remove();

    addMessage(chatEl, "ai", reply);
    markLastUserSeen(chatEl, true);

    setStatus("En línea");
    setBrandSub("En línea");

    if (speakerOn) await speak(reply, "es-ES");

  } catch (e) {
    loading.remove();
    addMessage(chatEl, "ai