// src/models/userModel.js
const { pool } = require('../config/db');

async function findUserByEmail(email) {
  const [rows] = await pool.query(
    'SELECT user_id, name, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

async function findUserById(userId) {
  const [rows] = await pool.query(
    'SELECT user_id, name, email, role, is_active, created_at, updated_at FROM users WHERE user_id = ? LIMIT 1',
    [userId]
  );
  return rows[0] || null;
}

/**
 * Get all active society memberships + roles for a user.
 * Used to know if they are President, Media Sec, etc.
 */
async function getUserSocietyMemberships(userId) {
  const [rows] = await pool.query(
    `
    SELECT
      m.membership_id,
      m.society_id,
      s.name AS society_name,
      r.role_id,
      r.name AS role_name,
      r.role_type,
      r.is_core,
      m.is_active,
      m.started_at,
      m.ended_at
    FROM society_memberships m
    JOIN societies s ON m.society_id = s.society_id
    JOIN society_roles r ON m.role_id = r.role_id
    WHERE m.user_id = ?
      AND m.is_active = 1
    ORDER BY s.name, r.is_core DESC, r.name
    `,
    [userId]
  );
  return rows;
}

async function updateUserPassword(userId, newPasswordHash) {
  await pool.query(
    'UPDATE users SET password_hash = ? WHERE user_id = ?',
    [newPasswordHash, userId]
  );
}

module.exports = {
  findUserByEmail,
  findUserById,
  getUserSocietyMemberships,
  updateUserPassword,
};
