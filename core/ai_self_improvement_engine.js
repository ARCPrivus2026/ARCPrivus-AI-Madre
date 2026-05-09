const capabilityManager = require("./ai_capability_manager");
const moduleCreator = require("./ai_module_creator");
const codeImprover = require("./ai_code_improver");
const evolutionEngine = require("./ai_evolution_engine");

function runSelfImprovementCycle(){

  try{

    console.log("AI Madre ejecutando ciclo de auto mejora...");

    const newCapabilities = capabilityManager.detectNewCapabilities();

    if(!newCapabilities || newCapabilities.length === 0){

      console.log("No se detectaron nuevas capacidades.");

      return;

    }

    newCapabilities.forEach(capability => {

      try{

        console.log("Nueva capacidad detectada:", capability);

        moduleCreator.createModule(capability);

        evolutionEngine.registerCapability(capability);

      }catch(error){

        console.log("Error creando módulo:", capability, error);

      }

    });

    codeImprover.improveSystem();

    console.log("Ciclo de mejora completado.");

  }catch(error){

    console.log("Error en auto mejora:", error);

  }

}

module.exports = {
  runSelfImprovementCycle
};