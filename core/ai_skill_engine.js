const fs = require("fs");
const path = require("path");

const MEMORY_FOLDER = path.join(__dirname,"..","memory");
const SKILLS_DB = path.join(MEMORY_FOLDER,"ai_skills.json");

/* =========================
   ASEGURAR BASE DE DATOS
========================= */

function ensureDB(){

if(!fs.existsSync(MEMORY_FOLDER)){
fs.mkdirSync(MEMORY_FOLDER,{recursive:true});
}

if(!fs.existsSync(SKILLS_DB)){
fs.writeFileSync(SKILLS_DB,JSON.stringify({skills:[]},null,2));
}

}

/* =========================
   CARGAR HABILIDADES
========================= */

function loadSkills(){

ensureDB();

try{

return JSON.parse(fs.readFileSync(SKILLS_DB,"utf8"));

}catch{

return {skills:[]};

}

}

/* =========================
   GUARDAR HABILIDADES
========================= */

function saveSkills(data){

fs.writeFileSync(SKILLS_DB,JSON.stringify(data,null,2));

}

/* =========================
   REGISTRAR HABILIDAD
========================= */

function registerSkill(name,description){

const db = loadSkills();

const exists = db.skills.find(s=>s.name===name);

if(exists){
return exists;
}

const skill = {
name,
description,
created:new Date().toISOString()
};

db.skills.push(skill);

saveSkills(db);

console.log("Nueva habilidad registrada:",name);

return skill;

}

/* =========================
   OBTENER HABILIDADES
========================= */

function getSkills(){

return loadSkills().skills;

}

/* =========================
   BUSCAR HABILIDAD
========================= */

function findSkill(name){

const db = loadSkills();

return db.skills.find(s=>s.name===name);

}

module.exports = {
registerSkill,
getSkills,
findSkill
};