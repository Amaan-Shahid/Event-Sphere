// src/routes/healthRoutes.js
const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    message: 'EventSphere backend is running 🚀',
    time: new Date().toISOString(),
  });
});

module.exports = router;
