import mongoose from "mongoose";
import OpenAI from "openai";

/* 🔥 Control de conexión para evitar múltiples conexiones en serverless */
let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log("MongoDB conectado");
  } catch (error) {
    console.error("Error MongoDB:", error);
  }
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  await connectDB();

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
      input: message,
    });

    const reply = response.output_text || "Sin respuesta.";

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Error IA:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}