import express from "express";
import db from "../database/db.js";

const router = express.Router();


// =============================
// REGISTRO DE USUARIO
// =============================

router.post("/register", (req, res) => {

  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.json({
      ok: false,
      message: "Faltan datos"
    });
  }

  db.run(
    "INSERT INTO users (name,email,password) VALUES (?,?,?)",
    [name, email, password],
    function (err) {

      if (err) {
        return res.json({
          ok: false,
          message: "Usuario ya existe"
        });
      }

      res.json({
        ok: true,
        message: "Usuario registrado"
      });

    }
  );

});


// =============================
// LOGIN
// =============================

router.post("/login", (req, res) => {

  const { email, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE email=? AND password=?",
    [email, password],
    (err, row) => {

      if (!row) {
        return res.json({
          ok: false,
          message: "Credenciales incorrectas"
        });
      }

      res.json({
        ok: true,
        user: row
      });

    }
  );

});

export default router;