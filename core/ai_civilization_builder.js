let systems = [];

function analyzeCapabilities(capabilities){

try{

if(!capabilities || capabilities.length < 2){
return [];
}

let proposals = [];

for(let i=0;i<capabilities.length;i++){

for(let j=i+1;j<capabilities.length;j++){

const a = capabilities[i];
const b = capabilities[j];

const systemName = a + "_" + b + "_system";

if(!systems.includes(systemName)){

const proposal = {
name: systemName,
components:[a,b],
created:Date.now()
};

systems.push(systemName);
proposals.push(proposal);

console.log("AI Madre propone nuevo sistema:",systemName);

}

}

}

return proposals;

}catch(error){

console.log("Error civilization builder:",error);
return [];

}

}

function getSystems(){
return systems;
}

module.exports={
analyzeCapabilities,
getSystems
};