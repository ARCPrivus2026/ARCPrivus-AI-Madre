require("dotenv").config();
const policy = require("./policy");

async function callOpenAI(messages) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (!apiKey) return null;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages
    })
  });

  if (!r.ok) {
    const errText = await r.text();
    throw new Error("Error OpenAI: " + errText);
  }

  const data = await r.json();
  return data?.choices?.[0]?.message?.content?.trim() || null;
}

function buildSystemPrompt() {
  return `
Eres ARC Privus IA Madre.
Responde en español.
Sé profesional, claro y directo.
Ayuda con arquitectura, diseño funcional y desarrollo.
`;
}

function fallbackReply(userText, history) {
  return `ARC Privus IA Madre: Recibí tu mensaje "${userText}". Estoy funcionando en modo núcleo local.`;
}

async function generateReply({ userId, userText, history }) {
  const system = buildSystemPrompt();

  const messages = [
    { role: "system", content: system },
    ...history.slice(-20).map(h => ({
      role: h.role === "user" ? "user" : "assistant",
      content: h.content
    })),
    { role: "user", content: userText }
  ];

  try {
    const out = await callOpenAI(messages);
    if (out) return out;
  } catch (e) {}

  return fallbackReply(userText, history);
}

module.exports = { generateReply };