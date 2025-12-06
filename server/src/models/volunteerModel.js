// src/models/volunteerModel.js
const { pool } = require('../config/db');

/**
 * Get volunteer record by event + user (for checking if already applied)
 */
async function getVolunteerByEventAndUser(eventId, userId) {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM volunteers
    WHERE event_id = ? AND user_id = ?
    LIMIT 1
    `,
    [eventId, userId]
  );
  return rows[0] || null;
}

/**
 * Get volunteer by volunteer_id
 */
async function getVolunteerById(volunteerId) {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM volunteers
    WHERE volunteer_id = ?
    LIMIT 1
    `,
    [volunteerId]
  );
  return rows[0] || null;
}

/**
 * Create volunteer application
 */
async function createVolunteer(eventId, userId) {
  const [result] = await pool.query(
    `
    INSERT INTO volunteers (event_id, user_id, status)
    VALUES (?, ?, 'pending')
    `,
    [eventId, userId]
  );
  return getVolunteerById(result.insertId);
}

/**
 * Update volunteer status: 'pending' | 'approved' | 'rejected'
 */
async function updateVolunteerStatus(volunteerId, status) {
  await pool.query(
    `
    UPDATE volunteers
    SET status = ?
    WHERE volunteer_id = ?
    `,
    [status, volunteerId]
  );
  return getVolunteerById(volunteerId);
}

/**
 * Cancel volunteering (student side) — we’ll treat it as status='rejected'
 * OR we could delete row, but better to keep history.
 */
async function cancelVolunteer(eventId, userId) {
  await pool.query(
    `
    UPDATE volunteers
    SET status = 'rejected'
    WHERE event_id = ? AND user_id = ?
    `,
    [eventId, userId]
  );
}

/**
 * List volunteers for a specific event (admin view)
 */
async function listVolunteersForEvent(eventId) {
  const [rows] = await pool.query(
    `
    SELECT
      v.volunteer_id,
      v.event_id,
      v.user_id,
      u.name AS student_name,
      u.email AS student_email,
      v.status,
      v.applied_at,
      v.updated_at
    FROM volunteers v
    JOIN users u ON v.user_id = u.user_id
    WHERE v.event_id = ?
    ORDER BY v.status DESC, v.applied_at ASC
    `,
    [eventId]
  );
  return rows;
}

/**
 * List volunteer records for a user (for "My Volunteering")
 */
async function listVolunteersForUser(userId) {
  const [rows] = await pool.query(
    `
    SELECT
      v.volunteer_id,
      v.event_id,
      e.title AS event_title,
      e.event_date,
      e.venue,
      v.status,
      v.applied_at,
      v.updated_at
    FROM volunteers v
    JOIN events e ON v.event_id = e.event_id
    WHERE v.user_id = ?
    ORDER BY e.event_date DESC, v.applied_at DESC
    `,
    [userId]
  );
  return rows;
}

// Check if a user is an approved volunteer for a specific event
async function isUserApprovedVolunteerForEvent(eventId, userId) {
  const [rows] = await pool.query(
    `
    SELECT volunteer_id
    FROM volunteers
    WHERE event_id = ?
      AND user_id = ?
      AND status = 'approved'
    LIMIT 1
    `,
    [eventId, userId]
  );
  return rows.length > 0;
}

module.exports = {
  getVolunteerByEventAndUser,
  getVolunteerById,
  createVolunteer,
  updateVolunteerStatus,
  cancelVolunteer,
  listVolunteersForEvent,
  listVolunteersForUser,
  isUserApprovedVolunteerForEvent, 
};
