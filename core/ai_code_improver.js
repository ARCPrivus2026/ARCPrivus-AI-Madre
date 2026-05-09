const fs = require("fs");
const path = require("path");

function suggestionsFolder(){
const folder = path.join(__dirname,"..","memory","code_suggestions");

if(!fs.existsSync(folder)){
fs.mkdirSync(folder,{recursive:true});
}

return folder;
}

function saveSuggestion(title,description){

const file = path.join(suggestionsFolder(),"suggestions.json");

let data=[];

if(fs.existsSync(file)){
data = JSON.parse(fs.readFileSync(file,"utf8"));
}

data.push({
title,
description,
date:new Date().toISOString()
});

fs.writeFileSync(file,JSON.stringify(data,null,2));

}

module.exports = {
saveSuggestion
};