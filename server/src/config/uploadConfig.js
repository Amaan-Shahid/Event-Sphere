// src/config/uploadConfig.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');
const paymentsDir = path.join(uploadsRoot, 'payments');

// Ensure directories exist
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot);
}
if (!fs.existsSync(paymentsDir)) {
  fs.mkdirSync(paymentsDir);
}

// Storage for payment screenshots
const paymentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, paymentsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    const uniqueName =
      'payment_' +
      Date.now() +
      '_' +
      Math.round(Math.random() * 1e9) +
      ext;
    cb(null, uniqueName);
  },
});

function fileFilterImageOnly(req, file, cb) {
  // Very simple filter: allow only images
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed for payment proof'), false);
  }
  cb(null, true);
}

const uploadPaymentProof = multer({
  storage: paymentStorage,
  fileFilter: fileFilterImageOnly,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit
  },
});

module.exports = {
  uploadPaymentProof,
};
