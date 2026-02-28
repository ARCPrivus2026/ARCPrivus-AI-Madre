import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
     console.log("API KEY EXISTE:", !!
     process.env.OPENAI_API_KEY);

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Falta mensaje." });
    }

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: message,
    });

    const reply =
      response.output_text ||
      response.output?.[0]?.content?.[0]?.text ||
      "Sin respuesta.";

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Error IA:", error);
    return res.status(500).json({ error: "Error con la IA" });
  }
}