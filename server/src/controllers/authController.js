// src/controllers/authController.js
const { findUserByEmail, getUserSocietyMemberships, updateUserPassword } = require('../models/userModel');
const { comparePassword, hashPassword } = require('../utils/passwordUtils');
const { signToken } = require('../utils/jwtUtils');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Please contact admin.',
      });
    }

    const passwordMatch = await comparePassword(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Get memberships (which societies + roles)
    const memberships = await getUserSocietyMemberships(user.user_id);

    // Create token payload
    const tokenPayload = {
      user_id: user.user_id,
      role: user.role,
    };
    const token = signToken(tokenPayload);

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
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

async function changePassword(req, res, next) {
  try {
    const userId = req.user.user_id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Old password and new password are required',
      });
    }

    const user = await findUserByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const match = await comparePassword(oldPassword, user.password_hash);
    if (!match) {
      return res.status(400).json({
        success: false,
        message: 'Old password is incorrect',
      });
    }

    const newHash = await hashPassword(newPassword);
    await updateUserPassword(userId, newHash);

    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  changePassword,
};
