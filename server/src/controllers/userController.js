// src/controllers/userController.js
const { findUserById, getUserSocietyMemberships } = require('../models/userModel');

async function getMe(req, res, next) {
  try {
    const userId = req.user.user_id;

    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const memberships = await getUserSocietyMemberships(userId);

    res.json({
      success: true,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      societyMemberships: memberships.map(m => ({
        membership_id: m.membership_id,
        society_id: m.society_id,
        society_name: m.society_name,
        role_id: m.role_id,
        role_name: m.role_name,
        role_type: m.role_type,
        is_core: !!m.is_core,
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMe,
};
