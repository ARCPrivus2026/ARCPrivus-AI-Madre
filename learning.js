const fs = require("fs")

const DB_FILE = "./ai_memory.json"

function loadMemory(){
  if(!fs.existsSync(DB_FILE)){
    fs.writeFileSync(DB_FILE, JSON.stringify({messages:[], commands:[], stats:{}}))
  }

  return JSON.parse(fs.readFileSync(DB_FILE))
}

function saveMemory(data){
  fs.writeFileSync(DB_FILE, JSON.stringify(data,null,2))
}

function learnFromMessage(msg){

  const memory = loadMemory()

  memory.messages.push({
    text: msg,
    time: Date.now()
  })

  if(!memory.stats.totalMessages){
    memory.stats.totalMessages = 0
  }

  memory.stats.totalMessages++

  saveMemory(memory)
}

function detectCapabilities(){

  const memory = loadMemory()

  const capabilities = []

  if(memory.stats.totalMessages > 50){
    capabilities.push("conversación avanzada")
  }

  if(memory.stats.totalMessages > 200){
    capabilities.push("predicción de respuestas")
  }

  return capabilities
}

module.exports = {
  learnFromMessage,
  detectCapabilities
}