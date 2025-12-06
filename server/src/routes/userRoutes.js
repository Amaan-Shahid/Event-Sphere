// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { getMe } = require('../controllers/userController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/me', requireAuth, getMe);

module.exports = router;
