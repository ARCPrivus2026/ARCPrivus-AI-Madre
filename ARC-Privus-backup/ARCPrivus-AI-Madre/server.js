const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const aiMadre = require("./core/ai_madre");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

/* =========================
   ARCHIVOS ESTÁTICOS
========================= */

app.use(express.static(path.join(__dirname, "public")));

/* =========================
   BASE DE DATOS SIMPLE
========================= */

const dbFolder = path.join(__dirname, "database");
const dbPath = path.join(dbFolder, "messages.json");

if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder, { recursive: true });
}

function loadMessages() {
  try {
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify([]));
      return [];
    }

    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
  } catch {
    return [];
  }
}

function saveMessages(messages) {
  fs.writeFileSync(dbPath, JSON.stringify(messages, null, 2));
}

/* =========================
   CHAT IA
========================= */

app.post("/api/chat", async (req, res) => {
  try {

    const { message } = req.body;

    if (!message) {
      return res.json({
        reply: "No recibí ningún mensaje."
      });
    }

    const reply = await aiMadre.processMessage(message, "usuario");

    const history = loadMessages();

    history.push({
      user: message,
      ai: reply,
      date: new Date().toISOString()
    });

    saveMessages(history);

    res.json({ reply });

  } catch (error) {

    console.log("Error IA:", error.message);

    res.json({
      reply: "Error procesando el mensaje."
    });

  }
});

/* =========================
   HISTORIAL
========================= */

app.get("/api/history", (req, res) => {
  res.json(loadMessages());
});

/* =========================
   SERVIDOR
========================= */

app.listen(PORT, () => {
  console.log("================================");
  console.log("ARC PRIVUS AI MADRE INICIADA");
  console.log("Servidor en: http://localhost:" + PORT);
  console.log("================================");
});