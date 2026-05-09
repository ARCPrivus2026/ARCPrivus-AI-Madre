const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./arc.db");

db.serialize(() => {

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender TEXT,
      receiver TEXT,
      message TEXT,
      time INTEGER,
      status TEXT
    )
  `, (err) => {

    if (err) {
      console.log("Error creando tabla:", err.message);
    } else {
      console.log("Tabla messages lista");
    }

  });

});

db.close();