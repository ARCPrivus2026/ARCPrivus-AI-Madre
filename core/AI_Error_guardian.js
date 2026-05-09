const fs = require("fs");
const path = require("path");

/* ===============================
   CARPETA DE ERRORES
================================ */

function errorFolder(){

const folder = path.join(__dirname,"..","memory","errors");

if(!fs.existsSync(folder)){
fs.mkdirSync(folder,{recursive:true});
}

return folder;

}

/* ===============================
   ARCHIVO DE ERRORES
================================ */

function errorFile(){
return path.join(errorFolder(),"errors.json");
}

/* ===============================
   CARGAR ERRORES
================================ */

function loadErrors(){

const file = errorFile();

if(!fs.existsSync(file)){
return [];
}

try{
return JSON.parse(fs.readFileSync(file,"utf8"));
}catch{
return [];
}

}

/* ===============================
   GUARDAR ERRORES
================================ */

function saveErrors(errors){

const file = errorFile();

fs.writeFileSync(
file,
JSON.stringify(errors,null,2),
"utf8"
);

}

/* ===============================
   REGISTRAR ERROR
================================ */

function registerError(error,context="system"){

try{

const errors = loadErrors();

const record = {

time:new Date().toISOString(),
context,
message:String(error.message || error),
stack:String(error.stack || "")

};

errors.push(record);

if(errors.length > 200){
errors.shift();
}

saveErrors(errors);

console.log("AI Error Guardian registró error:",record.message);

}catch(e){

console.log("Error guardando registro de error");

}

}

/* ===============================
   OBTENER ERRORES
================================ */

function getErrors(){

return loadErrors();

}

module.exports = {

registerError,
getErrors

};