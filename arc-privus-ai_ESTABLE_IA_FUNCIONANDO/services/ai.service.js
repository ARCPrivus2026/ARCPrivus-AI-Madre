"use strict";

const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function chatWithOpenAI(message) {
  try {

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "Eres ARC Privus AI Madre, una inteligencia avanzada y amable." },
        { role: "user", content: message }
      ],
      temperature: 0.7
    });

    return completion.choices[0].message.content;

  } catch (error) {

    console.error("ERROR OPENAI REAL:", error);
    throw error;

  }
}

module.exports = { chatWithOpenAI };