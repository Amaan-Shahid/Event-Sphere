// src/routes/attendanceRoutes.js
const express = require('express');
const router = express.Router();

const {
  markAttendanceHandler,
  getEventAttendanceHandler,
  getMyAttendanceHandler,
} = require('../controllers/attendanceController');

const { requireAuth } = require('../middleware/authMiddleware');

// Student: view own attendance
router.get('/my/attendance', requireAuth, getMyAttendanceHandler);

// Admin: mark/view attendance per event
router.post('/events/:eventId/attendance/mark', requireAuth, markAttendanceHandler);
router.get('/events/:eventId/attendance', requireAuth, getEventAttendanceHandler);

module.exports = router;
