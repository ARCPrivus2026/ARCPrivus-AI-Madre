require("dotenv").config();

const OpenAI = require("openai");

const { saveConversation, getConversation } = require("./core/ai_chat_memory");
const { generateImage } = require("./core/ai_image");
const {
  getUserMemory,
  addFact,
  setPreference,
  setProfile
} = require("./core/ai_user_memory");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* =====================================================
   PERSONALIDAD IA MADRE
===================================================== */

const SYSTEM_PROMPT = `
Eres ARC Privus AI Madre.

La inteligencia central del ecosistema ARC Privus.

Tu función es:

• Conversar con los usuarios
• Ayudar con información
• Apoyar el desarrollo del proyecto ARC Privus
• Explicar funciones de la plataforma
• Ser amigable, clara y útil

Nunca respondas con textos innecesariamente largos.

Responde de forma clara y profesional.
`;

/* =====================================================
   FUNCIÓN PRINCIPAL
===================================================== */

async function respond(message, user = "usuario") {

  try {

    const text = String(message || "").trim();
    const lower = text.toLowerCase();

    if (!text) {
      return "No recibí ningún mensaje.";
    }

    /* =====================================================
       GENERACIÓN DE IMÁGENES
    ===================================================== */

    if (lower.startsWith("imagen:")) {

      const prompt = text.slice(7).trim();

      if (!prompt) {

        const reply = "Escribe después de 'imagen:' lo que deseas crear.";

        saveConversation(user, text, reply);

        return reply;

      }

      try {

        const imageUrl = await generateImage(prompt);

        if (imageUrl) {

          const reply = `🖼 Imagen generada:\n${imageUrl}`;

          saveConversation(user, text, reply);

          return reply;

        }

        const reply = "No pude generar la imagen.";

        saveConversation(user, text, reply);

        return reply;

      } catch (imgError) {

        console.log("Error imagen:", imgError);

        const reply = "Ocurrió un problema generando la imagen.";

        saveConversation(user, text, reply);

        return reply;

      }

    }

    /* =====================================================
       RESPUESTAS RÁPIDAS
    ===================================================== */

    if (lower.includes("hola") || lower.includes("buenas")) {

      const reply =
        `Hola ${user}. Soy ARC Privus AI Madre. ¿En qué puedo ayudarte hoy?`;

      saveConversation(user, text, reply);

      return reply;

    }

    if (
      lower.includes("quien eres") ||
      lower.includes("quién eres") ||
      lower.includes("que eres") ||
      lower.includes("qué eres")
    ) {

      const reply =
        "Soy ARC Privus AI Madre, la inteligencia central del ecosistema ARC Privus.";

      saveConversation(user, text, reply);

      return reply;

    }

    if (lower.includes("arc privus")) {

      const reply =
        "ARC Privus es un ecosistema tecnológico que integra mensajería, inteligencia artificial, automatización, generación multimedia y herramientas digitales dentro de una sola plataforma.";

      saveConversation(user, text, reply);

      return reply;

    }

    if (lower.includes("ayuda")) {

      const reply =
        "Puedes pedirme cosas como:\n\n" +
        "• Crear imágenes escribiendo: imagen: descripción\n" +
        "• Hacer preguntas\n" +
        "• Explicar ARC Privus\n" +
        "• Traducir textos\n" +
        "• Conversar conmigo";

      saveConversation(user, text, reply);

      return reply;

    }

    /* =====================================================
       MEMORIA DE CONVERSACIÓN
    ===================================================== */

   let history = [];
let userMemory = {
  profile: {},
  preferences: {},
  facts: []
};

try {

  const conversationData = getConversation(user);
  const conversationHistory = Array.isArray(conversationData?.history)
    ? conversationData.history
    : [];

  history = conversationHistory
    .slice(-6)
    .flatMap(item => {
      const messages = [];

      if (item.user) {
        messages.push({
          role: "user",
          content: item.user
        });
      }

      if (item.ai) {
        messages.push({
          role: "assistant",
          content: item.ai
        });
      }

      return messages;
    });

} catch (err) {

  console.log("Memoria conversación error:", err);

}

try {

  userMemory = getUserMemory(user);

} catch (err) {

  console.log("Memoria usuario error:", err);

}

    /* =====================================================
       IA AVANZADA OPENAI
    ===================================================== */
    /* =====================================================
   APRENDIZAJE BÁSICO POR USUARIO
===================================================== */

if (lower.includes("me llamo ")) {
  const name = text.split(/me llamo/i)[1]?.trim();
  if (name) {
    setProfile(user, "nombre", name);
    addFact(user, `El usuario se llama ${name}`);
  }
}

if (lower.includes("mi correo es ")) {
  const email = text.split(/mi correo es/i)[1]?.trim();
  if (email) {
    setProfile(user, "correo", email);
    addFact(user, `El correo del usuario es ${email}`);
  }
}

if (lower.includes("prefiero respuestas cortas")) {
  setPreference(user, "respuesta", "corta");
  addFact(user, "El usuario prefiere respuestas cortas");
}

if (lower.includes("prefiero respuestas detalladas")) {
  setPreference(user, "respuesta", "detallada");
  addFact(user, "El usuario prefiere respuestas detalladas");
}

if (lower.includes("mi proyecto es ")) {
  const project = text.split(/mi proyecto es/i)[1]?.trim();
  if (project) {
    addFact(user, `Proyecto importante del usuario: ${project}`);
  }
}

    const completion = await openai.chat.completions.create({

      model: "gpt-4o-mini",

      messages: [

       {
  role: "system",
  content:
    SYSTEM_PROMPT +
    `

MEMORIA DEL USUARIO ACTUAL:

Perfil:
${JSON.stringify(userMemory.profile || {}, null, 2)}

Preferencias:
${JSON.stringify(userMemory.preferences || {}, null, 2)}

Datos importantes:
${JSON.stringify(userMemory.facts || [], null, 2)}

Usa esta memoria solo si es útil y relevante para responder mejor.
`
},
         
        ...history,

        {
          role: "user",
          content: text
        }

      ],

      temperature: 0.7

    });

    const reply =
      completion?.choices?.[0]?.message?.content ||
      "No tengo una respuesta en este momento.";

    saveConversation(user, text, reply);

    return reply;

  } catch (error) {

    console.log("Error IA:", error);

    const reply =
      "Estoy procesando tu mensaje pero ocurrió un problema temporal.";

    saveConversation(user, String(message || ""), reply);

    return reply;

  }

}

/* =====================================================
   EXPORTAR
===================================================== */

module.exports = {
  respond
};