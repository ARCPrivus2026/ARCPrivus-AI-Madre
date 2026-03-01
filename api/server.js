import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método no permitido" });
    }

    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Falta mensaje" });
    }

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: message
    });

    const reply = response.output_text || "Sin respuesta.";

    res.status(200).json({ reply });

  } catch (error) {
    console.error("Error IA:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}