// src/routes/teamRoutes.js
const express = require('express');
const router = express.Router();

const {
  createTeamHandler,
  updateTeamHandler,
  deleteTeamHandler,
  listTeamsHandler,
  getEventTeamsWithMembersHandler,
  listTeamMembersHandler,
  addTeamMemberHandler,
  updateTeamMemberRoleHandler,
  removeTeamMemberHandler,
} = require('../controllers/teamController');

const { requireAuth } = require('../middleware/authMiddleware');

// Public-ish (no auth): just list teams names per event
router.get('/events/:eventId/teams', listTeamsHandler);

// Admin routes - require auth
router.get(
  '/events/:eventId/teams-with-members',
  requireAuth,
  getEventTeamsWithMembersHandler
);

router.get(
  '/events/:eventId/teams/:teamId/members',
  requireAuth,
  listTeamMembersHandler
);

router.post(
  '/events/:eventId/teams',
  requireAuth,
  createTeamHandler
);

router.put(
  '/events/:eventId/teams/:teamId',
  requireAuth,
  updateTeamHandler
);

router.delete(
  '/events/:eventId/teams/:teamId',
  requireAuth,
  deleteTeamHandler
);

router.post(
  '/events/:eventId/teams/:teamId/members',
  requireAuth,
  addTeamMemberHandler
);

router.put(
  '/events/:eventId/teams/:teamId/members/:teamMemberId',
  requireAuth,
  updateTeamMemberRoleHandler
);

router.delete(
  '/events/:eventId/teams/:teamId/members/:teamMemberId',
  requireAuth,
  removeTeamMemberHandler
);

module.exports = router;
