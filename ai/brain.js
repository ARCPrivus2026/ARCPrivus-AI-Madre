const memory = require("./memory-engine");
const reminders = require("./reminder-engine");

class ARCBrain {
  detectIntent(message = "") {
    const msg = String(message).toLowerCase().trim();

    if (
      msg.includes("recuérdame") ||
      msg.includes("recuerdame") ||
      msg.includes("recordatorio")
    ) {
      return "reminder";
    }

    if (
      msg.includes("que recuerdas") ||
      msg.includes("qué recuerdas")
    ) {
      return "memory";
    }

    if (
      msg.includes("quien soy") ||
      msg.includes("quién soy")
    ) {
      return "identity";
    }

    if (
      msg.includes("hola") ||
      msg.includes("buenas")
    ) {
      return "greeting";
    }

    return "companion";
  }

  async respond(message, user = "usuario") {
    const intent = this.detectIntent(message);

    if (intent === "reminder") {
      return reminders.processReminder(message, user);
    }

    if (intent === "memory") {
      const recuerdos = memory.getUserMemory(user);

      if (!recuerdos.length) {
        return "Todavía no tengo recuerdos guardados contigo.";
      }

      return "Recuerdo esto: " + recuerdos.map(r => r.user).join(" | ");
    }

    if (intent === "identity") {
      return "Eres " + user + ", el creador de ARC Privus.";
    }

    if (intent === "greeting") {
      return "Hola " + user + ". Soy ARC Privus AI Madre.";
    }

    return this.companion(message, user);
  }

  companion(message, user) {
    const msg = String(message).toLowerCase().trim();

    if (msg.includes("arc privus")) {
      return "ARC Privus es una plataforma de mensajería con inteligencia artificial avanzada.";
    }

    if (msg.includes("ayuda")) {
      return "Estoy aquí para ayudarte dentro del sistema ARC Privus.";
    }

    if (msg.includes("gracias")) {
      return "Siempre es un placer ayudarte.";
    }

    return "He analizado tu mensaje y sigo aprendiendo contigo.";
  }
}

module.exports = new ARCBrain();