// routes/plans.js
const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middleware/auth');
const db = require('../config/db'); // conexión MySQL

// Obtener todos los planes
router.get('/', async (req, res) => {
  try {
    const [plans] = await db.query('SELECT * FROM plans');
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener planes' });
  }
});

// Crear un nuevo plan (solo admin)
router.post('/', checkAuth, async (req, res) => {
  const { name, price, duration } = req.body;
  try {
    await db.query(
      'INSERT INTO plans (name, price, duration) VALUES (?, ?, ?)',
      [name, price, duration]
    );
    res.json({ message: 'Plan creado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear plan' });
  }
});

// Activar plan manualmente para un usuario
router.post('/activate', checkAuth, async (req, res) => {
  const { userId, planId } = req.body;
  try {
    await db.query(
      'INSERT INTO user_plans (user_id, plan_id, activated_at) VALUES (?, ?, NOW())',
      [userId, planId]
    );
    res.json({ message: 'Plan activado para el usuario' });
  } catch (err) {
    res.status(500).json({ error: 'Error al activar plan' });
  }
});

module.exports = router;
