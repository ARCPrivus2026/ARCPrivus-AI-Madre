const fs = require("fs");
const path = require("path");

class AIAutonomousModuleCreator {

  constructor(){
    console.log("AI Autonomous Module Creator iniciado");
  }

  /* =========================
     CREAR MÓDULO
  ========================= */

  createModule(moduleName){

    try{

      const filePath = path.join(__dirname, moduleName + ".js");

      if(fs.existsSync(filePath)){
        console.log("Módulo ya existe:", moduleName);
        return false;
      }

      const template = `
class ${this.formatClassName(moduleName)} {

  constructor(){
    console.log("${moduleName} inicializado");
  }

  run(){

    try{

      console.log("${moduleName} ejecutando tarea");

    }catch(error){

      console.log("Error en ${moduleName}:", error);

    }

  }

}

module.exports = new ${this.formatClassName(moduleName)}();
`;

      fs.writeFileSync(filePath, template.trim());

      console.log("AI creó nuevo módulo:", moduleName);

      return true;

    }catch(error){

      console.log("Error creando módulo:", error);
      return false;

    }

  }

  /* =========================
     FORMATEAR NOMBRE CLASE
  ========================= */

  formatClassName(name){

    return name
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");

  }

}

module.exports = new AIAutonomousModuleCreator();