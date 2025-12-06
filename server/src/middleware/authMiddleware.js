// src/middleware/authMiddleware.js
const { verifyToken } = require('../utils/jwtUtils');
const { findUserById } = require('../models/userModel');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token missing',
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    const user = await findUserById(decoded.user_id);
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      });
    }

    // Attach user to request
    req.user = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  requireAuth,
};
