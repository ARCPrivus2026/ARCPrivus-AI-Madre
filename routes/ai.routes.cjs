import express from "express";
import OpenAI from "openai";

const router = express.Router();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// POST /api/chat  { message }
router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ ok: false, error: "Falta message." });

    const response = await client.responses.create({
      model: MODEL,
      input: message
    });

    res.json({ ok: true, reply: response.output_text || "Sin respuesta." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Error con la IA" });
  }
});

// POST /api/translate { text, toLang }
router.post("/translate", async (req, res) => {
  try {
    const { text, toLang } = req.body || {};
    if (!text || !toLang) return res.status(400).json({ ok: false, error: "Falta text o toLang." });

    const prompt = `Traduce esto al idioma "${toLang}". Devuelve SOLO la traducción:\n\n${text}`;

    const response = await client.responses.create({
      model: MODEL,
      input: prompt
    });

    res.json({ ok: true, translated: response.output_text || "" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Error traduciendo" });
  }
});

// POST /api/travel { text }  (guía conversacional)
router.post("/travel", async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ ok: false, error: "Falta text." });

    const prompt =
`Eres un copiloto de viajes conversacional.
Responde de forma breve, humana y útil.
Si detectas cansancio o riesgo, advierte con tacto.
Texto del usuario: ${text}`;

    const response = await client.responses.create({
      model: MODEL,
      input: prompt
    });

    res.json({ ok: true, reply: response.output_text || "" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Error en travel" });
  }
});

export default router;