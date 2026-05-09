const fs = require("fs");
const path = require("path");

function profileFolder(){
return path.join(__dirname,"..","memory","profiles");
}

function ensureFolder(){

const folder = profileFolder();

if(!fs.existsSync(folder)){
fs.mkdirSync(folder,{recursive:true});
}

return folder;

}

function profilePath(user){

const safe = String(user || "usuario").replace(/[^\w\-]/g,"_");

return path.join(ensureFolder(),safe+".json");

}

function loadProfile(user){

try{

const file = profilePath(user);

if(!fs.existsSync(file)){

return{
name:user,
interests:[],
notes:[],
created:new Date().toISOString()
};

}

return JSON.parse(fs.readFileSync(file,"utf8"));

}catch{

return{
name:user,
interests:[],
notes:[]
};

}

}

function saveProfile(user,data){

const file = profilePath(user);

fs.writeFileSync(file,JSON.stringify(data,null,2));

}

module.exports = {
loadProfile,
saveProfile
};