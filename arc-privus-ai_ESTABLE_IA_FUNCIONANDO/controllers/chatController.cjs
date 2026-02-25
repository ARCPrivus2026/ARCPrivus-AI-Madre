'use strict';

const express = require('express');
const router = express.Router();
const { chatWithOpenAI } = require('../services/ai.service.cjs');

router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ reply: 'Mensaje vacío' });
    }

    const reply = await chatWithOpenAI(message);
    res.json({ reply });

  } catch (error) {
    console.error('❌ Error en /api/chat:', error.message);
    res.status(500).json({ reply: 'Error interno del servidor' });
  }
});

module.exports = router;