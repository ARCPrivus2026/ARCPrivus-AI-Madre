import express from "express";
import OpenAI from "openai";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
    const userMessage = req.body.message || req.body.mensaje;

    if (!userMessage) {
      return res.json({ respuesta: "Mensaje vacío" });
    }

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: `Eres ARC Privus AI Madre, una inteligencia artificial avanzada, profesional, clara y amable. Responde al usuario: ${userMessage}`
    });

    res.json({
      respuesta: response.output_text || "No pude generar respuesta en este momento."
    });
  } catch (error) {
    console.error("Error en chat:", error);
    res.status(500).json({
      respuesta: "Error interno en ARC Privus AI Madre."
    });
  }
});

export default router;