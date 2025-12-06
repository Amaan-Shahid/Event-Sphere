// src/models/teamModel.js
const { pool } = require('../config/db');

/**
 * Create a new team for an event.
 */
async function createTeam({ event_id, name, description, created_by }) {
  const [result] = await pool.query(
    `
    INSERT INTO volunteer_teams (event_id, name, description, created_by)
    VALUES (?, ?, ?, ?)
    `,
    [event_id, name, description || null, created_by]
  );

  return getTeamById(result.insertId);
}

/**
 * Get team by id with event info.
 */
async function getTeamById(teamId) {
  const [rows] = await pool.query(
    `
    SELECT
      t.*,
      e.title AS event_title,
      e.event_date,
      s.name AS society_name
    FROM volunteer_teams t
    JOIN events e ON t.event_id = e.event_id
    JOIN societies s ON e.society_id = s.society_id
    WHERE t.team_id = ?
    `,
    [teamId]
  );
  return rows[0] || null;
}

/**
 * List teams for an event.
 */
async function listTeamsForEvent(eventId) {
  const [rows] = await pool.query(
    `
    SELECT
      t.team_id,
      t.event_id,
      t.name,
      t.description,
      t.created_by,
      t.created_at
    FROM volunteer_teams t
    WHERE t.event_id = ?
    ORDER BY t.name ASC
    `,
    [eventId]
  );
  return rows;
}

/**
 * Update team (name/description).
 */
async function updateTeam(teamId, fields) {
  const allowedFields = ['name', 'description'];
  const setClauses = [];
  const params = [];

  for (const key of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      setClauses.push(`${key} = ?`);
      params.push(fields[key]);
    }
  }

  if (setClauses.length === 0) {
    return getTeamById(teamId);
  }

  params.push(teamId);

  await pool.query(
    `UPDATE volunteer_teams SET ${setClauses.join(', ')} WHERE team_id = ?`,
    params
  );

  return getTeamById(teamId);
}

/**
 * Delete team and its members.
 */
async function deleteTeam(teamId) {
  // FK ON DELETE CASCADE on team_members will handle members, but we’re explicit
  await pool.query('DELETE FROM volunteer_team_members WHERE team_id = ?', [
    teamId,
  ]);
  await pool.query('DELETE FROM volunteer_teams WHERE team_id = ?', [teamId]);
}

/**
 * List members of a team (with user info).
 */
async function listTeamMembers(teamId) {
  const [rows] = await pool.query(
    `
    SELECT
      m.team_member_id,
      m.team_id,
      m.user_id,
      m.role,
      m.assigned_by,
      m.assigned_at,
      u.name AS member_name,
      u.email AS member_email
    FROM volunteer_team_members m
    JOIN users u ON m.user_id = u.user_id
    WHERE m.team_id = ?
    ORDER BY
      CASE
        WHEN m.role LIKE '%Head%' THEN 0
        WHEN m.role LIKE '%Coordinator%' THEN 1
        ELSE 2
      END,
      m.assigned_at ASC
    `,
    [teamId]
  );
  return rows;
}

/**
 * Add member to team.
 */
async function addMemberToTeam({ team_id, user_id, role, assigned_by }) {
  const [result] = await pool.query(
    `
    INSERT INTO volunteer_team_members (team_id, user_id, role, assigned_by)
    VALUES (?, ?, ?, ?)
    `,
    [team_id, user_id, role || 'Member', assigned_by]
  );

  return getTeamMemberById(result.insertId);
}

/**
 * Get team member by id.
 */
async function getTeamMemberById(teamMemberId) {
  const [rows] = await pool.query(
    `
    SELECT
      m.*,
      u.name AS member_name,
      u.email AS member_email
    FROM volunteer_team_members m
    JOIN users u ON m.user_id = u.user_id
    WHERE m.team_member_id = ?
    `,
    [teamMemberId]
  );
  return rows[0] || null;
}

/**
 * Update member role (Team Head / Member / etc.).
 */
async function updateTeamMemberRole(teamMemberId, newRole) {
  await pool.query(
    `
    UPDATE volunteer_team_members
    SET role = ?
    WHERE team_member_id = ?
    `,
    [newRole, teamMemberId]
  );
  return getTeamMemberById(teamMemberId);
}

/**
 * Remove member from team.
 */
async function removeMemberFromTeam(teamMemberId) {
  await pool.query(
    'DELETE FROM volunteer_team_members WHERE team_member_id = ?',
    [teamMemberId]
  );
}

/**
 * Check if a user is already a member of a specific team.
 */
async function isUserInTeam(teamId, userId) {
  const [rows] = await pool.query(
    `
    SELECT team_member_id
    FROM volunteer_team_members
    WHERE team_id = ?
      AND user_id = ?
    LIMIT 1
    `,
    [teamId, userId]
  );
  return rows.length > 0;
}

/**
 * List all teams + members for an event (for a nice admin view).
 */
async function getEventTeamsWithMembers(eventId) {
  const teams = await listTeamsForEvent(eventId);
  if (teams.length === 0) return [];

  const [rows] = await pool.query(
    `
    SELECT
      m.team_member_id,
      m.team_id,
      m.user_id,
      m.role,
      m.assigned_by,
      m.assigned_at,
      u.name AS member_name,
      u.email AS member_email
    FROM volunteer_team_members m
    JOIN users u ON m.user_id = u.user_id
    JOIN volunteer_teams t ON m.team_id = t.team_id
    WHERE t.event_id = ?
    ORDER BY t.name ASC,
      CASE
        WHEN m.role LIKE '%Head%' THEN 0
        WHEN m.role LIKE '%Coordinator%' THEN 1
        ELSE 2
      END,
      m.assigned_at ASC
    `,
    [eventId]
  );

  const membersByTeam = teams.map((t) => ({
    ...t,
    members: rows.filter((m) => m.team_id === t.team_id),
  }));

  return membersByTeam;
}

module.exports = {
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
};
