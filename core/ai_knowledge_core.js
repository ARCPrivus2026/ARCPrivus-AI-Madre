class AIKnowledgeCore {

constructor(){

this.knowledgeBase = {};
this.sources = [];

console.log("AI Knowledge Core iniciado");

}

/* =========================
   GUARDAR CONOCIMIENTO
========================= */

storeKnowledge(topic,data){

if(!this.knowledgeBase[topic]){
this.knowledgeBase[topic] = [];
}

this.knowledgeBase[topic].push({
data,
time:new Date().toISOString()
});

}

/* =========================
   OBTENER CONOCIMIENTO
========================= */

getKnowledge(topic){

return this.knowledgeBase[topic] || [];

}

/* =========================
   BUSCAR CONOCIMIENTO
========================= */

searchKnowledge(keyword){

const results = [];

for(const topic in this.knowledgeBase){

this.knowledgeBase[topic].forEach(entry=>{

if(JSON.stringify(entry).toLowerCase().includes(keyword.toLowerCase())){
results.push({topic,entry});
}

});

}

return results;

}

/* =========================
   REGISTRAR FUENTES
========================= */

registerSource(source){

if(!this.sources.includes(source)){
this.sources.push(source);
}

}

/* =========================
   OBTENER FUENTES
========================= */

getSources(){

return this.sources;

}

/* =========================
   ESTADO DEL SISTEMA
========================= */

getStats(){

return {
topics:Object.keys(this.knowledgeBase).length,
sources:this.sources.length
};

}

}

module.exports = new AIKnowledgeCore();