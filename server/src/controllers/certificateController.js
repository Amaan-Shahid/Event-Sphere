// src/controllers/certificateController.js
const path = require('path');
const {
  createCertificateTemplate,
  getCertificateTemplateById,
  listCertificateTemplatesForSociety,
  deleteCertificateTemplate,
  createCertificate,
  getCertificateByToken,
  listCertificatesForEvent,
  listCertificatesForUser,
  getCertificatesByRegistration,
} = require('../models/certificateModel');

const { getEventById } = require('../models/eventModel');
const { isUserCoreMemberOfSociety } = require('../models/userModel');
const { pool } = require('../config/db');
const { generateVerificationToken } = require('../utils/tokenUtils');
const dotenv = require('dotenv');
dotenv.config();
const {
  generateParticipantCertificatesForEvent,
} = require('../services/certificateService');

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5000';

/**
 * Helper: can manage society certificates?
 */
async function canManageSociety(user, societyId) {
  if (user.role === 'super_admin') return true;
  return isUserCoreMemberOfSociety(user.user_id, societyId);
}

/**
 * Helper: can manage event certificates?
 */
async function canManageEventCertificates(user, event) {
  if (!event) return false;
  return canManageSociety(user, event.society_id);
}

/**
 * Upload certificate template for a society
 * POST /api/societies/:societyId/cert-templates
 * form-data: { name, template_file (file) }
 */
async function uploadCertificateTemplateHandler(req, res, next) {
  try {
    const user = req.user;
    const societyId = Number(req.params.societyId);
    const { name } = req.body;

    if (!societyId || !name) {
      return res.status(400).json({
        success: false,
        message: 'societyId and name are required',
      });
    }

    const allowed = await canManageSociety(user, societyId);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to upload certificate templates for this society',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No template file uploaded',
      });
    }

    const relativePath = `/uploads/templates/${req.file.filename}`;

    const template = await createCertificateTemplate({
      society_id: societyId,
      name,
      template_file_path: relativePath,
      created_by: user.user_id,
    });

    res.status(201).json({
      success: true,
      message: 'Certificate template uploaded successfully',
      data: template,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List certificate templates for a society
 * GET /api/societies/:societyId/cert-templates
 */
async function listTemplatesForSocietyHandler(req, res, next) {
  try {
    const user = req.user;
    const societyId = Number(req.params.societyId);

    if (!societyId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid society id',
      });
    }

    const allowed = await canManageSociety(user, societyId);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to view templates for this society',
      });
    }

    const templates = await listCertificateTemplatesForSociety(societyId);

    res.json({
      success: true,
      data: templates,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete template
 * DELETE /api/societies/:societyId/cert-templates/:templateId
 */
async function deleteTemplateHandler(req, res, next) {
  try {
    const user = req.user;
    const societyId = Number(req.params.societyId);
    const templateId = Number(req.params.templateId);

    if (!societyId || !templateId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ids',
      });
    }

    const allowed = await canManageSociety(user, societyId);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to delete templates for this society',
      });
    }

    // Optional: could also check template belongs to society
    const template = await getCertificateTemplateById(templateId);
    if (!template || template.society_id !== societyId) {
      return res.status(404).json({
        success: false,
        message: 'Template not found for this society',
      });
    }

    await deleteCertificateTemplate(templateId, societyId);

    res.json({
      success: true,
      message: 'Certificate template deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Issue certificates for an event
 * POST /api/events/:eventId/certificates/issue
 * body: { template_id, mode? } // mode: 'present_only' | 'all_registered'
 */
async function issueCertificatesForEventHandler(req, res, next) {
  try {
    const user = req.user;
    const eventId = Number(req.params.eventId);
    const { template_id } = req.body;

    if (!eventId || !template_id) {
      return res.status(400).json({
        success: false,
        message: 'eventId and template_id are required',
      });
    }

    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const allowed = await canManageEventCertificates(user, event);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to issue certificates for this event',
      });
    }

    // Use the new Puppeteer-based engine
    const { created, skipped } = await generateParticipantCertificatesForEvent(
      eventId,
      template_id,
      user.user_id,
      APP_BASE_URL
    );

    res.json({
      success: true,
      message: `Certificates generated for ${created.length} registration(s); skipped ${skipped.length}.`,
      created,
      skipped,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: list certificates for an event
 * GET /api/events/:eventId/certificates
 */
async function listCertificatesForEventHandler(req, res, next) {
  try {
    const user = req.user;
    const eventId = Number(req.params.eventId);

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event id',
      });
    }

    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const allowed = await canManageEventCertificates(user, event);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to view certificates for this event',
      });
    }

    const certs = await listCertificatesForEvent(eventId);

    res.json({
      success: true,
      data: certs,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Student: list my certificates
 * GET /api/my/certificates
 */
async function listMyCertificatesHandler(req, res, next) {
  try {
    const user = req.user;
    const certs = await listCertificatesForUser(user.user_id);

    res.json({
      success: true,
      data: certs,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Public: verify certificate by token
 * GET /api/certificates/verify/:token
 */
async function verifyCertificateHandler(req, res, next) {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required',
      });
    }

    const cert = await getCertificateByToken(token);

    if (!cert) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found or invalid token',
      });
    }

    if (cert.status === 'revoked') {
      return res.status(410).json({
        success: false,
        message: 'This certificate has been revoked',
        data: {
          certificate_id: cert.certificate_id,
          event_title: cert.event_title,
          student_name: cert.student_name,
        },
      });
    }

    res.json({
      success: true,
      message: 'Certificate is valid',
      data: {
        certificate_id: cert.certificate_id,
        student_name: cert.student_name,
        student_email: cert.student_email,
        event_title: cert.event_title,
        event_date: cert.event_date,
        society_name: cert.society_name,
        status: cert.status,
        file_path: cert.file_path,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadCertificateTemplateHandler,
  listTemplatesForSocietyHandler,
  deleteTemplateHandler,
  issueCertificatesForEventHandler,
  listCertificatesForEventHandler,
  listMyCertificatesHandler,
  verifyCertificateHandler,
};
