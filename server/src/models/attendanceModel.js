// src/models/attendanceModel.js
const { pool } = require('../config/db');

/**
 * Get single attendance record for event+user
 */
async function getAttendanceByEventAndUser(eventId, userId) {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM attendance
    WHERE event_id = ? AND user_id = ?
    LIMIT 1
    `,
    [eventId, userId]
  );
  return rows[0] || null;
}

/**
 * Upsert attendance:
 * - If record exists → update status + marked_by + marked_at
 * - Else → insert new
 */
async function upsertAttendance({ event_id, user_id, attendance_status, marked_by }) {
  // Using INSERT...ON DUPLICATE KEY because of UNIQUE(event_id, user_id)
  await pool.query(
    `
    INSERT INTO attendance (event_id, user_id, attendance_status, marked_by)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      attendance_status = VALUES(attendance_status),
      marked_by = VALUES(marked_by),
      marked_at = CURRENT_TIMESTAMP
    `,
    [event_id, user_id, attendance_status, marked_by]
  );

  return getAttendanceByEventAndUser(event_id, user_id);
}

/**
 * List attendance for an event (admin view)
 */
async function listAttendanceForEvent(eventId) {
  const [rows] = await pool.query(
    `
    SELECT
      a.attendance_id,
      a.event_id,
      a.user_id,
      u.name AS student_name,
      u.email AS student_email,
      a.attendance_status,
      a.marked_at,
      a.marked_by
    FROM attendance a
    JOIN users u ON a.user_id = u.user_id
    WHERE a.event_id = ?
    ORDER BY a.marked_at DESC
    `,
    [eventId]
  );
  return rows;
}

/**
 * List attendance records for a user (student "My Attendance")
 */
async function listAttendanceForUser(userId) {
  const [rows] = await pool.query(
    `
    SELECT
      a.attendance_id,
      a.event_id,
      e.title AS event_title,
      e.event_date,
      e.venue,
      a.attendance_status,
      a.marked_at
    FROM attendance a
    JOIN events e ON a.event_id = e.event_id
    WHERE a.user_id = ?
    ORDER BY e.event_date DESC, a.marked_at DESC
    `,
    [userId]
  );
  return rows;
}

module.exports = {
  getAttendanceByEventAndUser,
  upsertAttendance,
  listAttendanceForEvent,
  listAttendanceForUser,
};
