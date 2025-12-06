// src/config/uploadConfig.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');
const paymentsDir = path.join(uploadsRoot, 'payments');
const templatesDir = path.join(uploadsRoot, 'templates');       
const certificatesDir = path.join(uploadsRoot, 'certificates'); //  maybe later for real PDFs

// Ensure directories exist
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot);
}
if (!fs.existsSync(paymentsDir)) {
  fs.mkdirSync(paymentsDir);
}
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir);
}
if (!fs.existsSync(certificatesDir)) {
  fs.mkdirSync(certificatesDir);
}

// -------- Payment screenshots (existing) --------
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
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed for payment proof'), false);
  }
  cb(null, true);
}

const uploadPaymentProof = multer({
  storage: paymentStorage,
  fileFilter: fileFilterImageOnly,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

// -------- Certificate templates (NEW) --------
// Could be .html, .hbs, .docx, .png, etc. We won't restrict much.
const templateStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, templatesDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    const uniqueName =
      'template_' +
      Date.now() +
      '_' +
      Math.round(Math.random() * 1e9) +
      ext;
    cb(null, uniqueName);
  },
});

const uploadCertificateTemplate = multer({
  storage: templateStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

module.exports = {
  uploadPaymentProof,
  uploadCertificateTemplate, 
};
