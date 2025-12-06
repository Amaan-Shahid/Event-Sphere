// src/routes/eventRoutes.js
const express = require('express');
const router = express.Router();
const {
  getEvents,
  getEvent,
  createEventHandler,
  updateEventHandler,
  deleteEventHandler,
  getSocietyEventsForAdmin,
} = require('../controllers/eventController');
const { requireAuth } = require('../middleware/authMiddleware');

// Public
router.get('/', getEvents);          // GET /api/events
router.get('/:id', getEvent);        // GET /api/events/:id

// Admin (society core or super_admin)
router.get('/society/:societyId/admin', requireAuth, getSocietyEventsForAdmin);
router.post('/', requireAuth, createEventHandler);
router.put('/:id', requireAuth, updateEventHandler);
router.delete('/:id', requireAuth, deleteEventHandler);

module.exports = router;
