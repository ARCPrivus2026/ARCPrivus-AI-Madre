// services/translation.js
const OpenAI = require('openai');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Traduce un texto a un idioma destino usando OpenAI
 * @param {string} text - Texto original
 * @param {string} targetLang - Idioma destino (ej: 'es', 'en', 'fr', 'zh')
 * @returns {Promise<string>} Texto traducido
 */
async function translateText(text, targetLang) {
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `Traduce el siguiente texto al idioma ${targetLang}.` },
        { role: 'user', content: text }
      ]
    });

    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error('Error en traducción:', err);
    throw new Error('No se pudo traducir el texto');
  }
}

module.exports = { translateText };
