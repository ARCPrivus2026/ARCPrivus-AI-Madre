const fs = require("fs");
const path = require("path");

function capabilityFile(){
return path.join(__dirname,"..","memory","capabilities","capabilities.json");
}

function loadCapabilitiesSafe(){

const file = capabilityFile();

if(!fs.existsSync(file)){
return [];
}

try{
return JSON.parse(fs.readFileSync(file,"utf8"));
}catch{
return [];
}

}

module.exports = {
loadCapabilitiesSafe
};