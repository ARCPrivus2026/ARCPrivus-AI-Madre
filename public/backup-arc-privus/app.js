const socket = io();
const currentUser = "arnaldo";

const chatWindow = document.getElementById("chatWindow");
const messageInput = document.getElementById("messageInput");
const btnSend = document.getElementById("sendBtn");

const micBtn = document.getElementById("micBtn");
const speakerBtn = document.getElementById("speakerBtn");

let lastBotMessage = "";

// =========================
// BURBUJAS
// =========================

function bubble(text, who = "bot") {

  const div = document.createElement("div");
  div.className = `message ${who}`;
  div.textContent = text;

  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  if (who === "bot") {
    lastBotMessage = text;
  }

}

// =========================
// MENSAJE INICIAL
// =========================

bubble(
  "Hola Arnaldo. Soy ARC Privus AI Madre. Escribe o usa el micrófono.",
  "bot"
);

// =========================
// SOCKET
// =========================

socket.on("connect", () => {
  console.log("WebSocket conectado:", socket.id);
});

socket.on("chat-message", (data) => {

  const user = data.user || "usuario";
  const message = data.message || "";

  const who = user === currentUser ? "me" : "them";

  bubble(`${user}: ${message}`, who);

});

// =========================
// ENVIAR MENSAJE
// =========================

async function sendMessage(textOverride = null) {

  const message = (textOverride || messageInput.value).trim();

  if (!message) return;

  messageInput.value = "";

  socket.emit("chat-message", {
    user: currentUser,
    message
  });

  try {

    const r = await fetch("/api/chat", {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        userId: currentUser,
        message
      })

    });

    const data = await r.json();

    const reply = data.reply || "Sin respuesta.";

    bubble(`ARC Privus AI Madre: ${reply}`, "bot");

    speak(reply);

  } catch (e) {

    bubble("Error conectando con la IA.", "bot");

  }

}

// =========================
// BOTÓN ENVIAR
// =========================

btnSend.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", (e) => {

  if (e.key === "Enter") {
    sendMessage();
  }

});

// =========================
// PARLANTE
// =========================

function speak(text) {

  if (!("speechSynthesis" in window)) return;

  const utter = new SpeechSynthesisUtterance(text);

  utter.lang = "es-ES";

  speechSynthesis.cancel();
  speechSynthesis.speak(utter);

}

speakerBtn.addEventListener("click", () => {

  if (!lastBotMessage) return;

  speak(lastBotMessage);

});

// =========================
// MICRÓFONO
// =========================

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {

  const recognition = new SpeechRecognition();

  recognition.lang = "es-ES";

  recognition.onresult = (event) => {

    const text = event.results[0][0].transcript;

    sendMessage(text);

  };

  micBtn.addEventListener("click", () => {

    recognition.start();

  });

}