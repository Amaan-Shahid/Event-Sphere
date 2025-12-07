// src/controllers/superAdminController.js
const { pool } = require('../config/db');
const { createLog } = require('../models/logModel');
const { getEventById } = require('../models/eventModel');

// If you already have this in another util, use that import instead.
const { hashPassword } = require('../utils/passwordUtils');

/**
 * POST /api/admin/users
 * body: { name, email, role, password? }
 * role: "student" | "super_admin"
 */
async function createUserHandler(req, res, next) {
  try {
    const admin = req.user;
    const { name, email, role, password } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'name, email, and role are required',
      });
    }

    if (!['student', 'super_admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be "student" or "super_admin"',
      });
    }

    const [existing] = await pool.query(
      'SELECT user_id FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    if (existing.length) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    const plainPassword = password || 'password123';
    const passwordHash = await hashPassword(plainPassword);

    const [insertRes] = await pool.query(
      `
      INSERT INTO users (name, email, password_hash, role, is_active)
      VALUES (?, ?, ?, ?, 1)
      `,
      [name, email, passwordHash, role]
    );

    await createLog({
      user_id: admin.user_id,
      action_type: 'CREATE_USER',
      target_type: 'user',
      target_id: insertRes.insertId,
      details: `Created ${role} ${email}`,
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user_id: insertRes.insertId,
        email,
        default_password: plainPassword,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/users?role=student
 */
async function listUsersHandler(req, res, next) {
  try {
    const { role } = req.query;

    let sql =
      'SELECT user_id, name, email, role, is_active, created_at FROM users';
    const params = [];

    if (role) {
      sql += ' WHERE role = ?';
      params.push(role);
    }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await pool.query(sql, params);

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/users/:userId
 * body: { is_active?, role? }
 */
async function updateUserHandler(req, res, next) {
  try {
    const admin = req.user;
    const userId = Number(req.params.userId);
    const { is_active, role } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user id',
      });
    }

    const [rows] = await pool.query(
      'SELECT user_id, role, is_active FROM users WHERE user_id = ?',
      [userId]
    );
    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const updates = [];
    const params = [];

    if (typeof is_active === 'boolean') {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (role) {
      if (!['student', 'super_admin'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role',
        });
      }
      updates.push('role = ?');
      params.push(role);
    }

    if (updates.length === 0) {
      return res.json({
        success: true,
        message: 'No changes applied',
      });
    }

    params.push(userId);

    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`,
      params
    );

    await createLog({
      user_id: admin.user_id,
      action_type: 'UPDATE_USER',
      target_type: 'user',
      target_id: userId,
      details: JSON.stringify({ is_active, role }),
    });

    res.json({
      success: true,
      message: 'User updated successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/societies
 * body: { name, description? }
 */
async function createSocietyHandler(req, res, next) {
  try {
    const admin = req.user;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Society name is required',
      });
    }

    const [existing] = await pool.query(
      'SELECT society_id FROM societies WHERE name = ? LIMIT 1',
      [name]
    );
    if (existing.length) {
      return res.status(400).json({
        success: false,
        message: 'Society with this name already exists',
      });
    }

    const [result] = await pool.query(
      `
      INSERT INTO societies (name, description, created_by)
      VALUES (?, ?, ?)
      `,
      [name, description || null, admin.user_id]
    );

    await createLog({
      user_id: admin.user_id,
      action_type: 'CREATE_SOCIETY',
      target_type: 'society',
      target_id: result.insertId,
      details: name,
    });

    res.status(201).json({
      success: true,
      message: 'Society created successfully',
      data: {
        society_id: result.insertId,
        name,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/societies/:societyId
 * body: { name?, description? }
 */
async function updateSocietyHandler(req, res, next) {
  try {
    const admin = req.user;
    const societyId = Number(req.params.societyId);
    const { name, description } = req.body;

    if (!societyId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid society id',
      });
    }

    const updates = [];
    const params = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (updates.length === 0) {
      return res.json({
        success: true,
        message: 'No changes applied',
      });
    }

    params.push(societyId);

    await pool.query(
      `UPDATE societies SET ${updates.join(', ')} WHERE society_id = ?`,
      params
    );

    await createLog({
      user_id: admin.user_id,
      action_type: 'UPDATE_SOCIETY',
      target_type: 'society',
      target_id: societyId,
      details: JSON.stringify({ name, description }),
    });

    res.json({
      success: true,
      message: 'Society updated successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/societies
 */
async function listSocietiesHandler(req, res, next) {
  try {
    const [rows] = await pool.query(
      `
      SELECT society_id, name, description, created_by, created_at
      FROM societies
      ORDER BY name ASC
      `
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Core members management:
 * We assume:
 *  - society_roles(role_id, name, is_core)
 *  - society_memberships(membership_id, society_id, user_id, role_id, is_active)
 */

/**
 * POST /api/admin/societies/:societyId/core-members
 * body: { user_id, role_id }
 */
async function addCoreMemberHandler(req, res, next) {
  try {
    const admin = req.user;
    const societyId = Number(req.params.societyId);
    const { user_id, role_id } = req.body;

    if (!societyId || !user_id || !role_id) {
      return res.status(400).json({
        success: false,
        message: 'societyId, user_id, and role_id are required',
      });
    }

    // Ensure role is core and belongs to this society or global roles (depending on schema)
    const [roleRows] = await pool.query(
      `
      SELECT role_id, name, is_core
      FROM society_roles
      WHERE role_id = ?
      `,
      [role_id]
    );
    if (!roleRows.length || !roleRows[0].is_core) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or non-core role',
      });
    }

    // Check if membership already exists
    const [existing] = await pool.query(
      `
      SELECT membership_id
      FROM society_memberships
      WHERE society_id = ? AND user_id = ? AND role_id = ?
      LIMIT 1
      `,
      [societyId, user_id, role_id]
    );

    if (existing.length) {
      // Reactivate if inactive
      await pool.query(
        `
        UPDATE society_memberships
        SET is_active = 1
        WHERE membership_id = ?
        `,
        [existing[0].membership_id]
      );

      await createLog({
        user_id: admin.user_id,
        action_type: 'UPDATE_CORE_MEMBER',
        target_type: 'society_membership',
        target_id: existing[0].membership_id,
        details: 'Reactivated existing core member',
      });

      return res.json({
        success: true,
        message: 'Core member reactivated',
      });
    }

    const [insertRes] = await pool.query(
      `
      INSERT INTO society_memberships (society_id, user_id, role_id, is_active)
      VALUES (?, ?, ?, 1)
      `,
      [societyId, user_id, role_id]
    );

    await createLog({
      user_id: admin.user_id,
      action_type: 'CREATE_CORE_MEMBER',
      target_type: 'society_membership',
      target_id: insertRes.insertId,
      details: JSON.stringify({ societyId, user_id, role_id }),
    });

    res.status(201).json({
      success: true,
      message: 'Core member added successfully',
      data: {
        membership_id: insertRes.insertId,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/societies/:societyId/core-members
 */
async function listCoreMembersHandler(req, res, next) {
  try {
    const societyId = Number(req.params.societyId);
    if (!societyId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid society id',
      });
    }

    const [rows] = await pool.query(
      `
      SELECT
        m.membership_id,
        m.user_id,
        u.name AS user_name,
        u.email AS user_email,
        m.role_id,
        r.name AS role_name,
        m.is_active
      FROM society_memberships m
      JOIN users u ON m.user_id = u.user_id
      JOIN society_roles r ON m.role_id = r.role_id
      WHERE m.society_id = ?
      ORDER BY m.is_active DESC, r.name ASC
      `,
      [societyId]
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/societies/:societyId/core-members/:membershipId
 * body: { is_active? }
 */
async function updateCoreMemberHandler(req, res, next) {
  try {
    const admin = req.user;
    const societyId = Number(req.params.societyId);
    const membershipId = Number(req.params.membershipId);
    const { is_active } = req.body;

    if (!societyId || !membershipId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ids',
      });
    }

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_active is required and must be boolean',
      });
    }

    await pool.query(
      `
      UPDATE society_memberships
      SET is_active = ?
      WHERE membership_id = ? AND society_id = ?
      `,
      [is_active ? 1 : 0, membershipId, societyId]
    );

    await createLog({
      user_id: admin.user_id,
      action_type: 'UPDATE_CORE_MEMBER',
      target_type: 'society_membership',
      target_id: membershipId,
      details: JSON.stringify({ is_active }),
    });

    res.json({
      success: true,
      message: 'Core member updated successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/events
 * Global view of all events
 */
async function globalEventsHandler(req, res, next) {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        e.event_id,
        e.title,
        e.event_date,
        e.venue,
        e.is_paid,
        e.base_fee_amount,
        e.is_active,
        s.name AS society_name
      FROM events e
      JOIN societies s ON e.society_id = s.society_id
      ORDER BY e.event_date DESC
      `
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/certificates
 * Global certificates view
 */
async function globalCertificatesHandler(req, res, next) {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        c.certificate_id,
        c.status,
        c.file_path,
        c.issued_at,
        u.name AS student_name,
        u.email AS student_email,
        e.title AS event_title,
        s.name AS society_name
      FROM certificates c
      JOIN registrations r ON c.registration_id = r.registration_id
      JOIN users u ON r.user_id = u.user_id
      JOIN events e ON r.event_id = e.event_id
      JOIN societies s ON e.society_id = s.society_id
      ORDER BY c.issued_at DESC
      `
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createUserHandler,
  listUsersHandler,
  updateUserHandler,
  createSocietyHandler,
  updateSocietyHandler,
  listSocietiesHandler,
  addCoreMemberHandler,
  listCoreMembersHandler,
  updateCoreMemberHandler,
  globalEventsHandler,
  globalCertificatesHandler,
};
