// src/models/roleModel.js
const { pool } = require('../config/db');

/**
 * Find existing core role for this society + name,
 * or create it if it doesn't exist.
 *
 * createdByUserId comes from req.user.user_id (super admin).
 */
async function findOrCreateCoreRole(societyId, roleName, createdByUserId) {
  // 1. Try to find existing role
  const [rows] = await pool.query(
    `
    SELECT role_id, name
    FROM society_roles
    WHERE society_id = ? AND name = ? AND is_core = 1
    LIMIT 1
    `,
    [societyId, roleName]
  );

  if (rows.length > 0) {
    return rows[0]; // { role_id, name }
  }

  // 2. Create new core role (requires created_by)
  const [result] = await pool.query(
    `
    INSERT INTO society_roles (society_id, name, role_type, is_core, created_by)
    VALUES (?, ?, 'core', 1, ?)
    `,
    [societyId, roleName, createdByUserId]
  );

  return { role_id: result.insertId, name: roleName };
}

module.exports = {
  findOrCreateCoreRole,
};
