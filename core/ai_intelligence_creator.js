const fs = require("fs");
const path = require("path");

function createNewIntelligence(name, description){

try{

const safeName = name.toLowerCase().replace(/\s+/g,"_");

const filePath = path.join(__dirname,`ai_${safeName}.js`);

if(fs.existsSync(filePath)){
console.log("La inteligencia ya existe:",safeName);
return;
}

const template = `

/* =====================================
AI MODULE: ${name}
DESCRIPCIÓN: ${description}
GENERADO AUTOMÁTICAMENTE POR AI MADRE
===================================== */

function run(input){

console.log("AI Module ${name} ejecutándose");

return {
status:"active",
result:null
};

}

module.exports = {
run
};

`;

fs.writeFileSync(filePath,template);

console.log("Nueva inteligencia creada:",safeName);

}catch(error){

console.log("Error creando inteligencia:",error);

}

}

module.exports = {
createNewIntelligence
};