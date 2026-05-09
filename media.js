// services/media.js
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Configuración de almacenamiento local (puedes cambiar a S3, Cloudinary, etc.)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // carpeta donde se guardan los archivos
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// Función para obtener URL pública del archivo
function getFileUrl(filename) {
  return `/uploads/${filename}`; // en producción usar CDN o bucket
}

// Middleware para subir archivos
const uploadMedia = upload.single('media');

// Procesar archivo subido
async function processMedia(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });

    const fileUrl = getFileUrl(req.file.filename);
    res.json({ message: 'Archivo subido correctamente', url: fileUrl });
  } catch (err) {
    res.status(500).json({ error: 'Error al procesar archivo' });
  }
}

module.exports = { uploadMedia, processMedia };
