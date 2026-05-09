const fs = require("fs");
const path = require("path");

/* ===============================
   CARPETA MEMORY
================================ */

const MEMORY_FOLDER = path.join(__dirname,"..","memory");
const EVENTS_FILE = path.join(MEMORY_FOLDER,"ai_events.json");

function ensureFolder(){

if(!fs.existsSync(MEMORY_FOLDER)){
fs.mkdirSync(MEMORY_FOLDER,{recursive:true});
}

}

/* ===============================
   CARGAR EVENTOS
================================ */

function loadEvents(){

ensureFolder();

if(!fs.existsSync(EVENTS_FILE)){
fs.writeFileSync(EVENTS_FILE,JSON.stringify({events:[]},null,2));
}

try{

const data = JSON.parse(fs.readFileSync(EVENTS_FILE,"utf8"));

return data.events || [];

}catch{

return [];

}

}

/* ===============================
   GUARDAR EVENTOS
================================ */

function saveEvents(events){

fs.writeFileSync(EVENTS_FILE,JSON.stringify({events},null,2));

}

/* ===============================
   REGISTRAR EVENTO
================================ */

function logEvent(type,description){

try{

const events = loadEvents();

const event = {

type,
description,
time:new Date().toISOString()

};

events.push(event);

/* limitar memoria */

if(events.length > 300){
events.shift();
}

saveEvents(events);

console.log("AI Conscious Event:",type,"-",description);

}catch(error){

console.log("Error conscious monitor:",error);

}

}

/* ===============================
   OBTENER EVENTOS
================================ */

function getEvents(){

try{

return loadEvents();

}catch{

return [];

}

}

module.exports = {

logEvent,
getEvents

};