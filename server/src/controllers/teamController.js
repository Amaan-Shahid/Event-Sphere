// src/controllers/teamController.js
const {
  createTeam,
  getTeamById,
  listTeamsForEvent,
  updateTeam,
  deleteTeam,
  listTeamMembers,
  addMemberToTeam,
  getTeamMemberById,
  updateTeamMemberRole,
  removeMemberFromTeam,
  isUserInTeam,
  getEventTeamsWithMembers,
} = require('../models/teamModel');

const { getEventById } = require('../models/eventModel');
const { isUserCoreMemberOfSociety } = require('../models/userModel');
const { isUserApprovedVolunteerForEvent } = require('../models/volunteerModel');

// Helper: can user manage this event's teams?
async function canManageEventTeams(user, event) {
  if (!event) return false;
  if (user.role === 'super_admin') return true;
  return isUserCoreMemberOfSociety(user.user_id, event.society_id);
}

/**
 * Admin: create team for event
 * POST /api/events/:eventId/teams
 */
async function createTeamHandler(req, res, next) {
  try {
    const user = req.user;
    const eventId = Number(req.params.eventId);
    const { name, description } = req.body;

    if (!eventId || !name) {
      return res.status(400).json({
        success: false,
        message: 'eventId and team name are required',
      });
    }

    const event = await getEventById(eventId);
    if (!event || !event.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const allowed = await canManageEventTeams(user, event);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to create teams for this event',
      });
    }

    const team = await createTeam({
      event_id: eventId,
      name,
      description,
      created_by: user.user_id,
    });

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: team,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: update team (name/description)
 * PUT /api/events/:eventId/teams/:teamId
 */
async function updateTeamHandler(req, res, next) {
  try {
    const user = req.user;
    const eventId = Number(req.params.eventId);
    const teamId = Number(req.params.teamId);

    if (!eventId || !teamId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event or team id',
      });
    }

    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const team = await getTeamById(teamId);
    if (!team || team.event_id !== eventId) {
      return res.status(404).json({
        success: false,
        message: 'Team not found for this event',
      });
    }

    const allowed = await canManageEventTeams(user, event);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to update teams for this event',
      });
    }

    const updated = await updateTeam(teamId, req.body);

    res.json({
      success: true,
      message: 'Team updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: delete team
 * DELETE /api/events/:eventId/teams/:teamId
 */
async function deleteTeamHandler(req, res, next) {
  try {
    const user = req.user;
    const eventId = Number(req.params.eventId);
    const teamId = Number(req.params.teamId);

    if (!eventId || !teamId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event or team id',
      });
    }

    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const team = await getTeamById(teamId);
    if (!team || team.event_id !== eventId) {
      return res.status(404).json({
        success: false,
        message: 'Team not found for this event',
      });
    }

    const allowed = await canManageEventTeams(user, event);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to delete teams for this event',
      });
    }

    await deleteTeam(teamId);

    res.json({
      success: true,
      message: 'Team deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: list teams for event
 * GET /api/events/:eventId/teams
 */
async function listTeamsHandler(req, res, next) {
  try {
    const eventId = Number(req.params.eventId);
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event id',
      });
    }

    const teams = await listTeamsForEvent(eventId);

    res.json({
      success: true,
      data: teams,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: get teams + members for event
 * GET /api/events/:eventId/teams-with-members
 */
async function getEventTeamsWithMembersHandler(req, res, next) {
  try {
    const user = req.user;
    const eventId = Number(req.params.eventId);

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event id',
      });
    }

    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const allowed = await canManageEventTeams(user, event);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to view teams for this event',
      });
    }

    const result = await getEventTeamsWithMembers(eventId);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: list members of a single team
 * GET /api/events/:eventId/teams/:teamId/members
 */
async function listTeamMembersHandler(req, res, next) {
  try {
    const user = req.user;
    const eventId = Number(req.params.eventId);
    const teamId = Number(req.params.teamId);

    if (!eventId || !teamId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event or team id',
      });
    }

    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const team = await getTeamById(teamId);
    if (!team || team.event_id !== eventId) {
      return res.status(404).json({
        success: false,
        message: 'Team not found for this event',
      });
    }

    const allowed = await canManageEventTeams(user, event);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to view this team',
      });
    }

    const members = await listTeamMembers(teamId);

    res.json({
      success: true,
      data: members,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: add member to team
 * POST /api/events/:eventId/teams/:teamId/members
 * body: { user_id, role }
 */
async function addTeamMemberHandler(req, res, next) {
  try {
    const user = req.user;
    const eventId = Number(req.params.eventId);
    const teamId = Number(req.params.teamId);
    const { user_id, role } = req.body;

    if (!eventId || !teamId || !user_id) {
      return res.status(400).json({
        success: false,
        message: 'eventId, teamId, and user_id are required',
      });
    }

    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const team = await getTeamById(teamId);
    if (!team || team.event_id !== eventId) {
      return res.status(404).json({
        success: false,
        message: 'Team not found for this event',
      });
    }

    const allowed = await canManageEventTeams(user, event);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to manage teams for this event',
      });
    }

    // Ensure that user_id is an approved volunteer for this event
    const approvedVolunteer = await isUserApprovedVolunteerForEvent(
      eventId,
      user_id
    );
    if (!approvedVolunteer) {
      return res.status(400).json({
        success: false,
        message: 'User must be an approved volunteer for this event to be in a team',
      });
    }

    const alreadyInTeam = await isUserInTeam(teamId, user_id);
    if (alreadyInTeam) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this team',
      });
    }

    const newMember = await addMemberToTeam({
      team_id: teamId,
      user_id,
      role: role || 'Member',
      assigned_by: user.user_id,
    });

    res.status(201).json({
      success: true,
      message: 'Team member added successfully',
      data: newMember,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: update member role (e.g., promote to Team Head)
 * PUT /api/events/:eventId/teams/:teamId/members/:teamMemberId
 * body: { role }
 */
async function updateTeamMemberRoleHandler(req, res, next) {
  try {
    const user = req.user;
    const eventId = Number(req.params.eventId);
    const teamId = Number(req.params.teamId);
    const teamMemberId = Number(req.params.teamMemberId);
    const { role } = req.body;

    if (!eventId || !teamId || !teamMemberId || !role) {
      return res.status(400).json({
        success: false,
        message: 'eventId, teamId, teamMemberId, and new role are required',
      });
    }

    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const team = await getTeamById(teamId);
    if (!team || team.event_id !== eventId) {
      return res.status(404).json({
        success: false,
        message: 'Team not found for this event',
      });
    }

    const allowed = await canManageEventTeams(user, event);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to update team members for this event',
      });
    }

    const member = await getTeamMemberById(teamMemberId);
    if (!member || member.team_id !== teamId) {
      return res.status(404).json({
        success: false,
        message: 'Team member record not found',
      });
    }

    const updated = await updateTeamMemberRole(teamMemberId, role);

    res.json({
      success: true,
      message: 'Team member role updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: remove member from team
 * DELETE /api/events/:eventId/teams/:teamId/members/:teamMemberId
 */
async function removeTeamMemberHandler(req, res, next) {
  try {
    const user = req.user;
    const eventId = Number(req.params.eventId);
    const teamId = Number(req.params.teamId);
    const teamMemberId = Number(req.params.teamMemberId);

    if (!eventId || !teamId || !teamMemberId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ids',
      });
    }

    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const team = await getTeamById(teamId);
    if (!team || team.event_id !== eventId) {
      return res.status(404).json({
        success: false,
        message: 'Team not found for this event',
      });
    }

    const allowed = await canManageEventTeams(user, event);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to remove team members for this event',
      });
    }

    const member = await getTeamMemberById(teamMemberId);
    if (!member || member.team_id !== teamId) {
      return res.status(404).json({
        success: false,
        message: 'Team member record not found',
      });
    }

    await removeMemberFromTeam(teamMemberId);

    res.json({
      success: true,
      message: 'Team member removed successfully',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTeamHandler,
  updateTeamHandler,
  deleteTeamHandler,
  listTeamsHandler,
  getEventTeamsWithMembersHandler,
  listTeamMembersHandler,
  addTeamMemberHandler,
  updateTeamMemberRoleHandler,
  removeTeamMemberHandler,
};
