// routes/media.js
const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middleware/auth');
const { uploadMedia, processMedia } = require('../services/media');

router.post('/upload', checkAuth, uploadMedia, processMedia);

module.exports = router;
