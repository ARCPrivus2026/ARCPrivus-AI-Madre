// ai-learning.js

class AILearning {

constructor(){
this.memory = [];
console.log("AI Learning iniciado");
}

learn(message,user){

this.memory.push({
message,
user,
time: new Date()
});

if(this.memory.length > 500){
this.memory.shift();
}

}

getMemory(){
return this.memory.slice(-20);
}

}

module.exports = new AILearning();