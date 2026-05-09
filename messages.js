// routes/messages.js
const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middleware/auth');
const db = require('../config/db'); // conexión MySQL

// Enviar un mensaje
router.post('/send', checkAuth, async (req, res) => {
  const { recipientId, content } = req.body;
  try {
    await db.query(
      'INSERT INTO messages (sender_id, recipient_id, content, sent_at) VALUES (?, ?, ?, NOW())',
      [req.user.id, recipientId, content]
    );
    res.json({ message: 'Mensaje enviado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
});

// Obtener mensajes entre el usuario autenticado y otro usuario
router.get('/:recipientId', checkAuth, async (req, res) => {
  const { recipientId } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT m.id, m.sender_id, m.recipient_id, m.content, m.sent_at, u.name AS sender_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id = ? AND m.recipient_id = ?)
          OR (m.sender_id = ? AND m.recipient_id = ?)
       ORDER BY m.sent_at ASC`,
      [req.user.id, recipientId, recipientId, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
});

// Eliminar un mensaje propio
router.delete('/:id', checkAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query(
      'DELETE FROM messages WHERE id = ? AND sender_id = ?',
      [id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Mensaje no encontrado o no autorizado' });
    }
    res.json({ message: 'Mensaje eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar mensaje' });
  }
});
// routes/messages.js (ejemplo de integración)
const { translateText } = require('../services/translation');

router.post('/translate', checkAuth, async (req, res) => {
  const { text, targetLang } = req.body;
  try {
    const translated = await translateText(text, targetLang);
    res.json({ original: text, translated });
  } catch (err) {
    res.status(500).json({ error: 'Error al traducir mensaje' });
  }
});


module.exports = router;
