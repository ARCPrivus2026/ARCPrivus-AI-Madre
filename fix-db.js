const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./arc.db");

db.serialize(() => {

  db.run("ALTER TABLE users ADD COLUMN avatar TEXT", err => {
    if (err) console.log("avatar ya existe o error:", err.message);
    else console.log("Columna avatar creada");
  });

  db.run("ALTER TABLE users ADD COLUMN status TEXT", err => {
    if (err) console.log("status ya existe o error:", err.message);
    else console.log("Columna status creada");
  });

});

db.close();