class AIMemoryBrain {

constructor(){

this.memories = [];
this.index = {};

console.log("AI Memory Brain iniciado");

}

/* =========================
   GUARDAR MEMORIA
========================= */

storeMemory(type,data){

const memory = {
type,
data,
time:new Date().toISOString()
};

this.memories.push(memory);

if(!this.index[type]){
this.index[type] = [];
}

this.index[type].push(memory);

}

/* =========================
   OBTENER MEMORIAS
========================= */

getMemories(type){

if(!type){
return this.memories;
}

return this.index[type] || [];

}

/* =========================
   BUSCAR MEMORIA
========================= */

searchMemory(keyword){

const results = [];

this.memories.forEach(memory=>{

if(JSON.stringify(memory).toLowerCase().includes(keyword.toLowerCase())){
results.push(memory);
}

});

return results;

}

/* =========================
   APRENDER DE MENSAJE
========================= */

learn(message){

this.storeMemory("conversation",message);

}

/* =========================
   ESTADÍSTICAS
========================= */

getStats(){

return {
totalMemories:this.memories.length,
memoryTypes:Object.keys(this.index).length
};

}

}

module.exports = new AIMemoryBrain();