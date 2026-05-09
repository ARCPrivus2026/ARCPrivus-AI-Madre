const https = require("https");

let integratedAIs = [];
let detectedCapabilities = [];

function integrateAI(name, url){

const ai = {
name,
url,
connected:false,
time:new Date().toISOString()
};

integratedAIs.push(ai);

console.log("AI Madre detectó nueva IA externa:", name);

}

function testConnections(){

integratedAIs.forEach(ai=>{

try{

https.get(ai.url,(res)=>{

ai.connected = true;

console.log("AI externa conectada:", ai.name);

}).on("error",()=>{

ai.connected = false;

});

}catch(error){

ai.connected = false;

}

});

}

function registerCapability(aiName, capability){

detectedCapabilities.push({
ai:aiName,
capability,
time:new Date().toISOString()
});

console.log("AI Madre detectó capacidad externa:", capability);

}

function getIntegratedAIs(){
return integratedAIs;
}

function getCapabilities(){
return detectedCapabilities;
}

module.exports={
integrateAI,
testConnections,
registerCapability,
getIntegratedAIs,
getCapabilities
};