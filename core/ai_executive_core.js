const fs = require("fs");
const path = require("path");

const DB = path.join(__dirname,"..","memory","ai_executive_decisions.json");

function loadDB(){

if(!fs.existsSync(DB)){
fs.writeFileSync(DB,JSON.stringify({decisions:[]},null,2),"utf8");
}

try{
return JSON.parse(fs.readFileSync(DB,"utf8"));
}catch{
return {decisions:[]};
}

}

function saveDB(data){
fs.writeFileSync(DB,JSON.stringify(data,null,2),"utf8");
}

function analyzeSystem(input){

try{

const {
ecosystem={},
strategies=[],
systems=[],
capabilities=[]
} = input;

let decisions=[];

if(ecosystem.apps && ecosystem.apps.length < 5){

decisions.push({
type:"ecosystem_growth",
decision:"Expandir ecosistema con nuevas apps",
priority:"alta",
time:new Date().toISOString()
});

}

if(capabilities.length > 5){

decisions.push({
type:"capability_activation",
decision:"Activar nuevas capacidades sintetizadas",
priority:"media",
time:new Date().toISOString()
});

}

if(systems.length > 2){

decisions.push({
type:"system_integration",
decision:"Integrar sistemas creados en el núcleo",
priority:"alta",
time:new Date().toISOString()
});

}

if(strategies.length){

decisions.push({
type:"strategy_execution",
decision:"Ejecutar estrategias propuestas por AI Strategic Brain",
priority:"alta",
time:new Date().toISOString()
});

}

const db = loadDB();

decisions.forEach(d=>{

const exists = db.decisions.find(x=>x.decision===d.decision);

if(!exists){

db.decisions.push(d);

console.log("AI Executive Core tomó decisión:",d.decision);

}

});

saveDB(db);

return db.decisions;

}catch(error){

console.log("Error executive core:",error);

return [];

}

}

function getDecisions(){

return loadDB().decisions;

}

module.exports={
analyzeSystem,
getDecisions
};