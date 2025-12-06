// src/routes/volunteerRoutes.js
const express = require('express');
const router = express.Router();

const {
  applyAsVolunteer,
  cancelVolunteerHandler,
  getMyVolunteering,
  getEventVolunteers,
  updateVolunteerStatusHandler,
} = require('../controllers/volunteerController');

const { requireAuth } = require('../middleware/authMiddleware');

// Student routes
router.post('/events/:eventId/volunteers/apply', requireAuth, applyAsVolunteer);
router.post('/events/:eventId/volunteers/cancel', requireAuth, cancelVolunteerHandler);
router.get('/my/volunteers', requireAuth, getMyVolunteering);

// Admin routes (super_admin or society core)
router.get('/events/:eventId/volunteers', requireAuth, getEventVolunteers);
router.put('/events/:eventId/volunteers/:volunteerId/status', requireAuth, updateVolunteerStatusHandler);

module.exports = router;
