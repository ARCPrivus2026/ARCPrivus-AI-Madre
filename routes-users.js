import express from "express";

export default function userRoutes(db) {
  const router = express.Router();

  // Crear usuario
  router.post("/", async (req, res) => {
    const { username, email, password } = req.body;
    await db.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, password]
    );
    res.json({ message: "Usuario creado con éxito" });
  });

  return router;
}
// routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { checkAuth } = require('../middleware/auth');

// Registro
router.post('/register', async (req, res) => {
  // ...
});

// Login
router.post('/login', async (req, res) => {
  // ...
});

// Perfil del usuario autenticado
router.get('/profile', checkAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, email FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

module.exports = router;
