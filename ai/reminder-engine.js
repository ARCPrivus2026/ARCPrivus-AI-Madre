const fs = require("fs");
const path = require("path");

function getUserMemory(user){

  try{

    const file = path.join(__dirname,"../memory/conversations",user + ".json");

    if(!fs.existsSync(file)){
      return [];
    }

    const raw = fs.readFileSync(file,"utf8");

    const data = JSON.parse(raw);

    if(!data.history){
      return [];
    }

    return data.history.slice(-5);

  }catch(error){

    console.log("Error leyendo memoria:",error);

    return [];

  }

}

module.exports = {
  getUserMemory
};