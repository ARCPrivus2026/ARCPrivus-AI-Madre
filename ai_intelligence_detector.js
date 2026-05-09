/* =========================
   AI INTELLIGENCE DETECTOR
   ARC PRIVUS AI MADRE
========================= */

function detectIntelligence(message) {

  try {

    if (!message) return null;

    const text = String(message).toLowerCase();

    const intelligenceKeywords = [
      "idea",
      "estrategia",
      "negocio",
      "tecnologia",
      "algoritmo",
      "inteligencia",
      "sistema",
      "innovacion",
      "modelo",
      "ia",
      "robot",
      "automatizacion",
      "mercado",
      "inversion",
      "proyecto"
    ];

    let detected = [];

    intelligenceKeywords.forEach(keyword => {

      if (text.includes(keyword)) {
        detected.push(keyword);
      }

    });

    if (detected.length === 0) {

      return {
        intelligent: false,
        topics: []
      };

    }

    return {
      intelligent: true,
      topics: detected
    };

  } catch (error) {

    console.log("Error intelligence detector:", error);

    return {
      intelligent: false,
      topics: []
    };

  }

}

/* =========================
   ANALYZE MESSAGE
========================= */

function analyzeMessage(message) {

  const result = detectIntelligence(message);

  if (result.intelligent) {

    console.log(
      "AI Madre detectó inteligencia en mensaje:",
      result.topics
    );

  }

  return result;

}

/* =========================
   EXPORT MODULE
========================= */

module.exports = {
  detectIntelligence,
  analyzeMessage
};