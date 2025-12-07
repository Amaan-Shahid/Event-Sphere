// src/models/logModel.js
const { pool } = require('../config/db');

// write a log entry
async function createLog({ user_id, action_type, target_type, target_id, details }) {
  await pool.query(
    `
    INSERT INTO action_logs (user_id, action_type, target_type, target_id, details)
    VALUES (?, ?, ?, ?, ?)
    `,
    [user_id || null, action_type, target_type || null, target_id || null, details || null]
  );
}

// read recent logs for dashboard / system logs page
async function getRecentLogs(limit = 100) {
  const [rows] = await pool.query(
    `
    SELECT
      l.log_id,
      l.user_id,
      u.name  AS user_name,
      u.email AS user_email,
      l.action_type,
      l.target_type,
      l.target_id,
      l.details,
      l.created_at
    FROM action_logs l
    LEFT JOIN users u ON l.user_id = u.user_id
    ORDER BY l.created_at DESC
    LIMIT ?
    `,
    [limit]
  );
  return rows;
}

// Backwards-compatible alias (so controllers can call listLogs or getRecentLogs)
async function listLogs(limit = 100) {
  return getRecentLogs(limit);
}

module.exports = {
  createLog,
  getRecentLogs,
  listLogs,
};
