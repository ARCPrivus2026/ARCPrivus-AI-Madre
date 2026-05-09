const connectors = {};

/* =========================
   REGISTRAR IA
========================= */

function registerAI(name, handler){

  connectors[name] = handler;

  console.log("IA conectada:",name);

}

/* =========================
   EJECUTAR IA
========================= */

async function runAI(name,input){

  if(!connectors[name]){

    console.log("IA no encontrada:",name);

    return null;

  }

  try{

    return await connectors[name](input);

  }catch(error){

    console.log("Error ejecutando IA:",name,error);

    return null;

  }

}

/* =========================
   LISTAR IA DISPONIBLES
========================= */

function listAI(){

  return Object.keys(connectors);

}

module.exports = {
  registerAI,
  runAI,
  listAI
};