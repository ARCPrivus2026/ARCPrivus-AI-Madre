const capabilityManager = require("./ai_capability_manager");
const evolutionEngine = require("./ai_evolution_engine");
const decisionEngine = require("./ai_decision_engine");
const strategicBrain = require("./ai_strategic_brain");
const ecosystemCore = require("./ai_ecosystem_core");

class AISelfEvolutionLoop {

  constructor(){
    console.log("AI Self Evolution Loop iniciado");
    this.cycles = 0;
    this.lastEvolution = null;
  }

  runCycle(){

    try{

      this.cycles++;

      console.log("=================================");
      console.log("AI Self Evolution Cycle:", this.cycles);
      console.log("=================================");

      /* obtener estado del ecosistema */

      const ecosystem = ecosystemCore.getState
        ? ecosystemCore.getState()
        : {};

      /* obtener capacidades actuales */

      const capabilities = capabilityManager.getCapabilities
        ? capabilityManager.getCapabilities()
        : [];

      /* evaluar evolución */

      const evolutionReport = evolutionEngine.evaluateCapabilities
        ? evolutionEngine.evaluateCapabilities(capabilities)
        : {};

      /* analizar estrategias */

      const strategies = strategicBrain.getStrategies
        ? strategicBrain.getStrategies()
        : [];

      /* tomar decisiones */

      const decisions = decisionEngine.makeDecisions
        ? decisionEngine.makeDecisions({
            ecosystem,
            capabilities,
            strategies,
            evolutionReport
          })
        : [];

      this.lastEvolution = {
        time: new Date().toISOString(),
        ecosystem,
        capabilities,
        evolutionReport,
        decisions
      };

      console.log("AI Evolution decisions:", decisions.length);

      return this.lastEvolution;

    }catch(error){

      console.log("Error en Self Evolution Loop:", error);

      return null;

    }

  }

  getState(){

    return {
      cycles: this.cycles,
      lastEvolution: this.lastEvolution
    };

  }

}

module.exports = new AISelfEvolutionLoop();