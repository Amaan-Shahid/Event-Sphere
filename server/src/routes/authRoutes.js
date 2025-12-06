// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { login, changePassword } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/login', login);
router.put('/change-password', requireAuth, changePassword);

module.exports = router;
