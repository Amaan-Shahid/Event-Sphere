// src/routes/superAdminRoutes.js
const express = require('express');
const router = express.Router();

const {
  createUserHandler,
  listUsersHandler,
  updateUserHandler,
  deleteUserHandler,
  createSocietyHandler,
  updateSocietyHandler,
  listSocietiesHandler,
  addCoreMemberHandler,
  listCoreMembersHandler,
  updateCoreMemberHandler,
  deleteCoreMemberHandler,
  deleteSocietyHandler,
  globalEventsHandler,
  globalCertificatesHandler,
  overviewStatsHandler,
} = require('../controllers/superAdminController');

const { getLogsHandler } = require('../controllers/logController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Everything here is super_admin only
router.use(requireAuth, requireRole('super_admin'));

// ===== Users =====
router.post('/users', createUserHandler);
router.get('/users', listUsersHandler);
router.put('/users/:userId', updateUserHandler);
router.delete('/users/:userId', deleteUserHandler);

// ===== Societies =====
router.post('/societies', createSocietyHandler);
router.get('/societies', listSocietiesHandler);
router.put('/societies/:societyId', updateSocietyHandler);

// delete core member membership
router.delete(
  '/societies/:societyId/core-members/:membershipId',
  deleteCoreMemberHandler
);

// hard delete society
router.delete('/societies/:societyId', deleteSocietyHandler);

// ===== Core members =====
router.post('/societies/:societyId/core-members', addCoreMemberHandler);
router.get('/societies/:societyId/core-members', listCoreMembersHandler);
router.put('/societies/:societyId/core-members/:membershipId', updateCoreMemberHandler);

// ===== Global views =====
router.get('/events', globalEventsHandler);
router.get('/certificates', globalCertificatesHandler);

// ===== Logs + Overview =====
router.get('/logs', getLogsHandler);
router.get('/overview', overviewStatsHandler);

module.exports = router;
