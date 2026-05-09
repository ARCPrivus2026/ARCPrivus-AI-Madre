const fs = require("fs");
const path = require("path");

const modulesFolder = path.join(__dirname);

let createdModules = [];

function createModule(capability){

try{

if(!capability) return null;

const safeName = capability.replace(/[^\w]/g,"_");

const fileName = "ai_module_" + safeName + ".js";

const filePath = path.join(modulesFolder,fileName);

if(fs.existsSync(filePath)){
return null;
}

const code = `

function run(input){

console.log("AI Madre ejecutando módulo:", "${safeName}");

return {
status:"ok",
capability:"${safeName}",
result:"procesado"
};

}

module.exports={
run
};

`;

fs.writeFileSync(filePath,code,"utf8");

createdModules.push({
name:fileName,
created:new Date().toISOString()
});

console.log("AI Madre creó nuevo módulo:",fileName);

return fileName;

}catch(error){

console.log("Error creando módulo IA:",error);

return null;

}

}

function expandFromCapabilities(capabilities){

if(!Array.isArray(capabilities)) return [];

let newModules = [];

capabilities.forEach(cap=>{

const created = createModule(cap);

if(created){
newModules.push(created);
}

});

return newModules;

}

function getCreatedModules(){
return createdModules;
}

module.exports={
expandFromCapabilities,
getCreatedModules
};