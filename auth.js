// middleware/auth.js
const jwt = require('jsonwebtoken');

function checkAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Token no proporcionado' });

  const token = authHeader.split(' ')[1]; // formato: "Bearer <token>"
  if (!token) return res.status(401).json({ error: 'Token inválido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // añade datos del usuario al request
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token no válido o expirado' });
  }
}

module.exports = { checkAuth };
