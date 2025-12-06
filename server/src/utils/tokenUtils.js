// src/utils/tokenUtils.js
const crypto = require('crypto');

function generateVerificationToken() {
  // 32 hex chars = 16 bytes
  return crypto.randomBytes(16).toString('hex');
}

module.exports = {
  generateVerificationToken,
};
