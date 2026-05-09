const fs = require("fs");
const path = require("path");

const source = path.join(__dirname);
const destination = path.join(__dirname, "backup", "backup-" + Date.now());

function copyFolder(src, dest) {

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src);

  files.forEach(file => {

    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);

    if (file === "backup") return;

    if (fs.lstatSync(srcPath).isDirectory()) {

      copyFolder(srcPath, destPath);

    } else {

      fs.copyFileSync(srcPath, destPath);

    }

  });

}

copyFolder(source, destination);

console.log("Backup creado en:", destination);