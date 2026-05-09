require("dotenv").config();

const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* =========================================
   GENERAR IMAGEN
========================================= */

async function generateImage(prompt) {

  try {

    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt: prompt,
      size: "1024x1024"
    });

    const imageUrl = result?.data?.[0]?.url;

    return imageUrl || null;

  } catch (error) {

    console.log("Error generando imagen:", error);

    return null;

  }

}

module.exports = { generateImage };