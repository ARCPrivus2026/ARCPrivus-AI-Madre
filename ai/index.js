const brain = require("./brain");

class AIEngine {
  async respond(message, user = "usuario") {
    return await brain.respond(message, user);
  }
}

module.exports = new AIEngine();