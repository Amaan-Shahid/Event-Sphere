// src/controllers/superAdminController.js
const { pool } = require('../config/db');
const { createLog } = require('../models/logModel');
const { getEventById } = require('../models/eventModel');

// If you already have this in another util, use that import instead.
const { hashPassword } = require('../utils/passwordUtils');
const { findOrCreateCoreRole } = require('../models/roleModel');


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

// DELETE /api/admin/users/:userId
async function deleteUserHandler(req, res, next) {
  try {
    const admin = req.user; // current super_admin performing delete
    const userId = Number(req.params.userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user id',
      });
    }

    // 1) Fetch user
    const [userRows] = await pool.query(
      'SELECT user_id, name, email, role FROM users WHERE user_id = ? LIMIT 1',
      [userId]
    );
    if (!userRows.length) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    const user = userRows[0];

    // (Optional but recommended) don't allow deleting other super_admins
    if (user.role === 'super_admin') {
      return res.status(400).json({
        success: false,
        message: 'Deleting super admin accounts is not allowed. Deactivate instead.',
      });
    }

    // 2) Block if they own upcoming / active events
    const [futureEvents] = await pool.query(
      `
      SELECT event_id, title, event_date
      FROM events
      WHERE created_by = ?
        AND is_active = 1
        AND event_date >= CURDATE()
      LIMIT 1
      `,
      [userId]
    );

    if (futureEvents.length) {
      return res.status(400).json({
        success: false,
        message:
          'Cannot delete this user because they are creator of upcoming/active events. ' +
          'Please transfer those events to another admin or deactivate the user instead.',
      });
    }

    // 3) Reassign all RESTRICT foreign keys pointing to this user
    const newOwnerId = admin.user_id;

    // 3a) Past events they created
    await pool.query(
      `
      UPDATE events
      SET created_by = ?
      WHERE created_by = ?
      `,
      [newOwnerId, userId]
    );

    // 3b) Society roles they originally created
    await pool.query(
      `
      UPDATE society_roles
      SET created_by = ?
      WHERE created_by = ?
      `,
      [newOwnerId, userId]
    );

    // 3c) Volunteer teams they created
    await pool.query(
      `
      UPDATE volunteer_teams
      SET created_by = ?
      WHERE created_by = ?
      `,
      [newOwnerId, userId]
    );

    // 3d) Team memberships they assigned
    await pool.query(
      `
      UPDATE volunteer_team_members
      SET assigned_by = ?
      WHERE assigned_by = ?
      `,
      [newOwnerId, userId]
    );

    // 3e) Certificate templates they created
    await pool.query(
      `
      UPDATE certificate_templates
      SET created_by = ?
      WHERE created_by = ?
      `,
      [newOwnerId, userId]
    );

    // (Other FKs like certificates.issued_by, attendance.marked_by already
    // have ON DELETE SET NULL, so we don't need to touch them.)

    // 4) Now it is safe to delete user
    await pool.query('DELETE FROM users WHERE user_id = ?', [userId]);

    // 5) Log the action
    await createLog({
      user_id: admin.user_id,
      action_type: 'DELETE_USER',
      target_type: 'user',
      target_id: userId,
      details: `Deleted user ${user.email} (${user.role}); ownership reassigned to user_id=${newOwnerId}`,
    });

    res.json({
      success: true,
      message: 'User deleted successfully. Related records reassigned to current super admin.',
    });
  } catch (err) {
    console.error('🔥 deleteUserHandler error:', err);
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
/**
 * PUT /api/admin/societies/:societyId
 * body: { name?, description?, is_active? }
 */
async function updateSocietyHandler(req, res, next) {
  try {
    const admin = req.user;
    const societyId = Number(req.params.societyId);
    const { name, description, is_active } = req.body;

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
    if (typeof is_active === 'boolean') {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
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
      details: JSON.stringify({ name, description, is_active }),
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
/**
 * GET /api/admin/societies
 */
async function listSocietiesHandler(req, res, next) {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        s.society_id,
        s.name,
        s.description,
        s.created_by,
        s.created_at,
        s.is_active,

        -- total active members
        COALESCE(mem.member_count, 0)   AS member_count,

        -- total events for society
        COALESCE(ev.event_count, 0)     AS event_count,

        -- president info (if any)
        pres.user_id                    AS president_user_id,
        pres.name                       AS president_name,
        pres.email                      AS president_email

      FROM societies s
      LEFT JOIN (
        SELECT
          society_id,
          COUNT(*) AS member_count
        FROM society_memberships
        WHERE is_active = 1
        GROUP BY society_id
      ) mem ON mem.society_id = s.society_id
      LEFT JOIN (
        SELECT
          society_id,
          COUNT(*) AS event_count
        FROM events
        GROUP BY society_id
      ) ev ON ev.society_id = s.society_id
      LEFT JOIN (
        SELECT
          m.society_id,
          u.user_id,
          u.name,
          u.email
        FROM society_memberships m
        JOIN users u ON m.user_id = u.user_id
        JOIN society_roles r ON m.role_id = r.role_id
        WHERE m.is_active = 1
          AND r.is_core = 1
          AND r.name LIKE '%President%'
      ) pres ON pres.society_id = s.society_id
      ORDER BY s.name ASC
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
/**
 * POST /api/admin/societies/:societyId/core-members
 * body: { user_id, role_id? , role_name? }
 *
 * - If role_id is provided, we use it (old behaviour).
 * - If role_id is NOT provided, we expect role_name, and we
 *   find/create the core role for that society by name.
 */
async function addCoreMemberHandler(req, res, next) {
  try {
    const admin = req.user;
    const societyId = Number(req.params.societyId);
    const { user_id, role_id, role_name } = req.body;

    if (!societyId || !user_id) {
      return res.status(400).json({
        success: false,
        message: 'societyId and user_id are required',
      });
    }

    let finalRoleId = role_id;

    // 🔹 NEW: accept free-text role_name when role_id is not given
    if (!finalRoleId) {
      if (!role_name || !role_name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'role_name is required when role_id is not provided',
        });
      }

      const role = await findOrCreateCoreRole(
        societyId,
        role_name.trim(),
        admin.user_id
      );
      finalRoleId = role.role_id;
    }

    // Ensure role is core
    const [roleRows] = await pool.query(
      `
      SELECT role_id, name, is_core
      FROM society_roles
      WHERE role_id = ?
      `,
      [finalRoleId]
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
      [societyId, user_id, finalRoleId]
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

    // Insert new membership
    const [insertRes] = await pool.query(
      `
      INSERT INTO society_memberships (society_id, user_id, role_id, is_active)
      VALUES (?, ?, ?, 1)
      `,
      [societyId, user_id, finalRoleId]
    );

    await createLog({
      user_id: admin.user_id,
      action_type: 'CREATE_CORE_MEMBER',
      target_type: 'society_membership',
      target_id: insertRes.insertId,
      details: JSON.stringify({ societyId, user_id, role_id: finalRoleId }),
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
/**
 * PUT /api/admin/societies/:societyId/core-members/:membershipId
 * body: { is_active?, role_name? }
 *
 * - is_active: true/false to activate/deactivate
 * - role_name: free-text new role (e.g. "Vice President")
 */
async function updateCoreMemberHandler(req, res, next) {
  try {
    const admin = req.user;
    const societyId = Number(req.params.societyId);
    const membershipId = Number(req.params.membershipId);
    const { is_active, role_name } = req.body;

    if (!societyId || !membershipId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ids',
      });
    }

    // Nothing provided?
    if (
      typeof is_active !== 'boolean' &&
      (role_name === undefined || role_name === null)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Nothing to update',
      });
    }

    const updates = [];
    const params = [];

    // 1) handle active / inactive toggle
    if (typeof is_active === 'boolean') {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    // 2) handle role change by name
    if (role_name && role_name.trim()) {
      const role = await findOrCreateCoreRole(
        societyId,
        role_name.trim(),
        admin.user_id
      );
      updates.push('role_id = ?');
      params.push(role.role_id);
    }

    if (updates.length === 0) {
      return res.json({
        success: true,
        message: 'No changes applied',
      });
    }

    params.push(membershipId, societyId);

    await pool.query(
      `
      UPDATE society_memberships
      SET ${updates.join(', ')}
      WHERE membership_id = ? AND society_id = ?
      `,
      params
    );

    await createLog({
      user_id: admin.user_id,
      action_type: 'UPDATE_CORE_MEMBER',
      target_type: 'society_membership',
      target_id: membershipId,
      details: JSON.stringify({ is_active, role_name }),
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

/**
 * DELETE /api/admin/societies/:societyId/core-members/:membershipId
 */
async function deleteCoreMemberHandler(req, res, next) {
  try {
    const admin = req.user;
    const societyId = Number(req.params.societyId);
    const membershipId = Number(req.params.membershipId);

    if (!societyId || !membershipId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ids',
      });
    }

    const [result] = await pool.query(
      `
      DELETE FROM society_memberships
      WHERE membership_id = ? AND society_id = ?
      `,
      [membershipId, societyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Core member not found',
      });
    }

    await createLog({
      user_id: admin.user_id,
      action_type: 'DELETE_CORE_MEMBER',
      target_type: 'society_membership',
      target_id: membershipId,
      details: JSON.stringify({ societyId }),
    });

    res.json({
      success: true,
      message: 'Core member deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/admin/societies/:societyId
 * Hard delete a society and its related data.
 */
async function deleteSocietyHandler(req, res, next) {
  try {
    const admin = req.user;
    const societyId = Number(req.params.societyId);

    if (!societyId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid society id',
      });
    }

    // Optionally clean up related rows if you don't have ON DELETE CASCADE
    await pool.query(
      'DELETE FROM society_memberships WHERE society_id = ?',
      [societyId]
    );
    await pool.query('DELETE FROM events WHERE society_id = ?', [societyId]);
    await pool.query('DELETE FROM society_roles WHERE society_id = ?', [
      societyId,
    ]);

    const [result] = await pool.query(
      'DELETE FROM societies WHERE society_id = ?',
      [societyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Society not found',
      });
    }

    await createLog({
      user_id: admin.user_id,
      action_type: 'DELETE_SOCIETY',
      target_type: 'society',
      target_id: societyId,
      details: `Deleted society ${societyId}`,
    });

    res.json({
      success: true,
      message: 'Society deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

async function overviewStatsHandler(req, res, next) {
  try {
    // 1) Students – total + new this month
    const [[studentRow]] = await pool.query(
      `
      SELECT
        COUNT(*) AS total_students,
        SUM(
          CASE
            WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            THEN 1 ELSE 0
          END
        ) AS new_last_30
      FROM users
      WHERE role = 'student'
      `
    );

    // 2) Societies – total + pending (active but no president)
    const [[societyRow]] = await pool.query(
      `
      SELECT
        COUNT(*) AS total_societies,
        SUM(
          CASE
            WHEN s.is_active = 1 AND pres.president_user_id IS NULL
            THEN 1 ELSE 0
          END
        ) AS pending_societies
      FROM societies s
      LEFT JOIN (
        SELECT DISTINCT
          m.society_id,
          m.user_id AS president_user_id
        FROM society_memberships m
        JOIN society_roles r ON m.role_id = r.role_id
        WHERE m.is_active = 1
          AND r.is_core = 1
          AND r.name LIKE '%President%'
      ) pres ON pres.society_id = s.society_id
      `
    );

    // 3) Events – total + active
    const [[eventRow]] = await pool.query(
      `
      SELECT
        COUNT(*) AS total_events,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_events
      FROM events
      `
    );

    // 4) Certificates – total issued this academic year (simple: this year)
    const [[certRow]] = await pool.query(
      `
      SELECT
        COUNT(*) AS issued_this_year
      FROM certificates
      WHERE status = 'issued'
        AND YEAR(issued_at) = YEAR(CURDATE())
      `
    );

    // 5) Recent activity – from logs table
    let activityRows = [];
try {
  const [rows] = await pool.query(
    `
    SELECT
      log_id,
      action_type,
      target_type,
      target_id,
      details,
      created_at
    FROM action_logs
    ORDER BY created_at DESC
    LIMIT 5
    `
  );
  activityRows = rows;
} catch (err2) {
  // If action_logs somehow missing, just return empty recentActivity
  if (err2.code === 'ER_NO_SUCH_TABLE') {
    console.warn('action_logs table missing, recentActivity will be empty');
    activityRows = [];
  } else {
    throw err2;
  }
}

    res.json({
      success: true,
      data: {
        students: {
          total: studentRow.total_students || 0,
          new_last_30: studentRow.new_last_30 || 0,
        },
        societies: {
          total: societyRow.total_societies || 0,
          pending: societyRow.pending_societies || 0,
        },
        events: {
          total: eventRow.total_events || 0,
          active: eventRow.active_events || 0,
        },
        certificates: {
          issued_this_year: certRow.issued_this_year || 0,
        },
        recentActivity: activityRows,
      },
    });
  } catch (err) {
    next(err);
  }
}



module.exports = {
  createUserHandler,
  listUsersHandler,
  updateUserHandler,
  deleteUserHandler,
  createSocietyHandler,
  updateSocietyHandler,
  listSocietiesHandler,
  addCoreMemberHandler,
  listCoreMembersHandler,
  updateCoreMemberHandler,
  deleteCoreMemberHandler,
  overviewStatsHandler,
  deleteSocietyHandler,
  globalEventsHandler,
  globalCertificatesHandler,
};
