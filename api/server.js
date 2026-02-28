import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Falta mensaje." });
    }

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: message,
    });

    return res.status(200).json({
      reply: response.output_text || "Sin respuesta.",
    });

  } catch (error) {
    console.error("Error IA:", error);
    return res.status(500).json({ error: "Error con la IA" });
  }
}