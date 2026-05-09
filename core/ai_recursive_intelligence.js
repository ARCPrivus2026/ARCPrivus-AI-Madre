const fs = require("fs");
const path = require("path");

const coreFolder = __dirname;

let suggestions = [];

function analyzeCode(){

try{

const files = fs.readdirSync(coreFolder);

files.forEach(file=>{

if(!file.endsWith(".js")) return;

const filePath = path.join(coreFolder,file);

const code = fs.readFileSync(filePath,"utf8");

if(code.length < 200){

suggestions.push({
type:"improvement",
file:file,
suggestion:"Archivo muy pequeño, puede necesitar ampliación funcional",
time:new Date().toISOString()
});

}

if(!code.includes("try")){

suggestions.push({
type:"stability",
file:file,
suggestion:"Agregar manejo de errores try/catch",
time:new Date().toISOString()
});

}

if(!code.includes("module.exports")){

suggestions.push({
type:"structure",
file:file,
suggestion:"Verificar exportación del módulo",
time:new Date().toISOString()
});

}

});

}catch(error){

console.log("Error recursive intelligence:",error);

}

}

function getSuggestions(){
return suggestions;
}

module.exports={
analyzeCode,
getSuggestions
};