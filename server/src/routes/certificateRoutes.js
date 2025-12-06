// src/routes/certificateRoutes.js
const express = require('express');
const router = express.Router();

const {
  uploadCertificateTemplateHandler,
  listTemplatesForSocietyHandler,
  deleteTemplateHandler,
  issueCertificatesForEventHandler,
  listCertificatesForEventHandler,
  listMyCertificatesHandler,
  verifyCertificateHandler,
} = require('../controllers/certificateController');

const { requireAuth } = require('../middleware/authMiddleware');
const { uploadCertificateTemplate } = require('../config/uploadConfig');

// Template management (admin)
router.post(
  '/societies/:societyId/cert-templates',
  requireAuth,
  uploadCertificateTemplate.single('template_file'),
  uploadCertificateTemplateHandler
);

router.get(
  '/societies/:societyId/cert-templates',
  requireAuth,
  listTemplatesForSocietyHandler
);

router.delete(
  '/societies/:societyId/cert-templates/:templateId',
  requireAuth,
  deleteTemplateHandler
);

// Event certificates (admin)
router.post(
  '/events/:eventId/certificates/issue',
  requireAuth,
  issueCertificatesForEventHandler
);

router.get(
  '/events/:eventId/certificates',
  requireAuth,
  listCertificatesForEventHandler
);

// Student: my certificates
router.get('/my/certificates', requireAuth, listMyCertificatesHandler);

// Public: verify certificate
router.get('/certificates/verify/:token', verifyCertificateHandler);

module.exports = router;
