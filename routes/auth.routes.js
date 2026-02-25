import express from "express";
import bcrypt from "bcrypt";
import db from "../db.js";

const router = express.Router();

// Registro
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Faltan datos." });
  }

  const existing = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email);

  if (existing) {
    return res.status(400).json({ error: "Correo ya registrado." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  db.prepare(`
    INSERT INTO users (name, email, password, created_at)
    VALUES (?, ?, ?, ?)
  `).run(name, email, hashedPassword, new Date().toISOString());

  res.json({ success: true });
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email);

  if (!user) {
    return res.status(400).json({ error: "Usuario no encontrado." });
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return res.status(400).json({ error: "Contraseña incorrecta." });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan
    }
  });
});

export default router;