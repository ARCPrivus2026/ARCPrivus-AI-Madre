const fs = require("fs");
const path = require("path");

const memoryFolder = path.join(__dirname, "..", "memory");
const learningFile = path.join(memoryFolder, "learning.json");

if (!fs.existsSync(memoryFolder)) {
  fs.mkdirSync(memoryFolder, { recursive: true });
}

function loadLearning() {

  if (!fs.existsSync(learningFile)) {
    fs.writeFileSync(learningFile, JSON.stringify({ topics: {} }, null, 2));
  }

  return JSON.parse(fs.readFileSync(learningFile, "utf8"));

}

function saveLearning(data) {

  fs.writeFileSync(learningFile, JSON.stringify(data, null, 2));

}

function analyzeMessage(message) {

  const data = loadLearning();

  const stopWords = [
    "hola","que","para","porque","quiero","tengo","tengas",
    "eres","soy","sobre","esto","este","esta","unas","unos",
    "como","donde","cuando","tambien"
  ];

  const words = String(message)
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word));

  words.forEach(word => {

    if (!data.topics[word]) {
      data.topics[word] = 1;
    } else {
      data.topics[word]++;
    }

  });

  saveLearning(data);

}

function getTopTopics(limit = 5) {

  const data = loadLearning();

  const sorted = Object.entries(data.topics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  return sorted.map(t => t[0]);

}

module.exports = {
  analyzeMessage,
  getTopTopics
};