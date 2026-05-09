const learning = require("./ai_learning");

/* =========================
   DETECTAR NUEVAS CAPACIDADES
========================= */

function detectNewCapabilities(){

  const topics = learning.getTopTopics(10) || [];

  const detected = [];

  topics.forEach(topic => {

    const t = String(topic).toLowerCase();

    if(t.includes("video")){
      detected.push("video_generator");
    }

    if(t.includes("voz")){
      detected.push("voice_clone");
    }

    if(t.includes("traduccion") || t.includes("translate")){
      detected.push("live_translation");
    }

  });

  /* eliminar duplicados */
  const unique = [...new Set(detected)];

  return unique;

}

module.exports = {
  detectNewCapabilities
};
function detectNewCapabilities(){

console.log("AI analizando nuevas capacidades");

return [];

}

module.exports.detectNewCapabilities = detectNewCapabilities;