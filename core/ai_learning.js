const fs = require("fs");
const path = require("path");

/* ===============================
   CARPETA DE APRENDIZAJE
================================ */

function learningFolder(){
  return path.join(__dirname,"..","memory","learning");
}

function ensureFolder(){

  const folder = learningFolder();

  if(!fs.existsSync(folder)){
    fs.mkdirSync(folder,{recursive:true});
  }

  return folder;
}

function learningFile(){
  return path.join(ensureFolder(),"topics.json");
}

/* ===============================
   PALABRAS IRRELEVANTES
================================ */

const stopWords = [
"hola","como","estas","bien","para","con","que",
"este","esta","eso","pero","porque","cuando",
"donde","solo","una","unos","unas","los","las"
];

/* ===============================
   CARGAR DATOS
================================ */

function loadLearning(){

  try{

    const file = learningFile();

    if(!fs.existsSync(file)){
      return { topics:{} };
    }

    return JSON.parse(fs.readFileSync(file,"utf8"));

  }catch{

    return { topics:{} };

  }

}

/* ===============================
   GUARDAR DATOS
================================ */

function saveLearning(data){

  const file = learningFile();

  fs.writeFileSync(file,JSON.stringify(data,null,2));

}

/* ===============================
   ANALIZAR MENSAJE
================================ */

function analyze(message){

  const data = loadLearning();

  const words = String(message || "")
  .toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .replace(/[^a-z0-9\s]/g,"")
  .split(/\s+/)
  .filter(w=>w.length>2 && !stopWords.includes(w));

  const uniqueWords = [...new Set(words)];

  uniqueWords.forEach(word=>{

    if(!data.topics[word]){
      data.topics[word]=1;
    }else{
      data.topics[word]++;
    }

  });

  saveLearning(data);

}

/* ===============================
   APRENDER DE CONVERSACIÓN
================================ */

function learnFromConversation(user,message,reply){

  try{

    analyze(message);
    analyze(reply);

  }catch(e){

    console.log("Error aprendizaje:",e);

  }

}

/* ===============================
   TEMAS MÁS FRECUENTES
================================ */

function getTopTopics(limit=5){

  const data = loadLearning();

  const sorted = Object.entries(data.topics)
  .sort((a,b)=>b[1]-a[1])
  .slice(0,limit);

  return sorted.map(t=>t[0]);

}

/* ===============================
   EXPORTAR FUNCIONES
================================ */

module.exports = {
  analyze,
  getTopTopics,
  learnFromConversation
};