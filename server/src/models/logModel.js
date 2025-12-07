// src/models/logModel.js
const { pool } = require('../config/db');

async function createLog({ user_id, action_type, target_type, target_id, details }) {
  await pool.query(
    `
    INSERT INTO action_logs (user_id, action_type, target_type, target_id, details)
    VALUES (?, ?, ?, ?, ?)
    `,
    [user_id || null, action_type, target_type || null, target_id || null, details || null]
  );
}

async function listLogs(limit = 100) {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM action_logs
    ORDER BY created_at DESC
    LIMIT ?
    `,
    [limit]
  );
  return rows;
}

module.exports = {
  createLog,
  listLogs,
};
