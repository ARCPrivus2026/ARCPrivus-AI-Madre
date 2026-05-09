const cluster = require("cluster");
const os = require("os");

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {

  console.log(`Servidor maestro iniciado`);
  console.log(`Usando ${numCPUs} núcleos`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker) => {

    console.log(`Worker ${worker.process.pid} murió. Reiniciando...`);
    cluster.fork();

  });

} else {

  require("./server");

}