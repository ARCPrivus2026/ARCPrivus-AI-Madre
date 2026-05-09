const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./arc.db");

db.serialize(() => {

  db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    avatar TEXT,
    status TEXT
  )
  `, (err) => {
    if (err) {
      console.log("Error creando tabla:", err.message);
    } else {
      console.log("Tabla users lista con avatar y status");
    }
  });

});

db.close();