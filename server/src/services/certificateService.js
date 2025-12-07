// src/services/certificateService.js
const fs = require('fs/promises');
const path = require('path');
const puppeteer = require('puppeteer');

const { pool } = require('../config/db');
const {
  getCertificateTemplateById,
  getCertificatesByRegistration,
  createCertificate,
} = require('../models/certificateModel');
const { generateVerificationToken } = require('../utils/tokenUtils');
const { renderTemplate } = require('../utils/templateRenderer');

/**
 * Make sure directory exists.
 */
async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true }).catch(() => {});
}

/**
 * Load registration + user + event + society + attendance + payment info
 * for a given registration_id.
 */
async function getRegistrationContext(registrationId) {
  const [rows] = await pool.query(
    `
    SELECT
      r.registration_id,
      r.event_id,
      r.user_id,
      r.status AS registration_status,
      r.payment_required,
      r.fee_amount,
      r.payment_status,
      u.name AS student_name,
      u.email AS student_email,
      e.title AS event_title,
      e.event_date,
      e.venue,
      e.is_paid,
      e.base_fee_amount,
      s.society_id,
      s.name AS society_name
    FROM registrations r
    JOIN users u ON r.user_id = u.user_id
    JOIN events e ON r.event_id = e.event_id
    JOIN societies s ON e.society_id = s.society_id
    WHERE r.registration_id = ?
    `,
    [registrationId]
  );

  if (!rows.length) return null;
  const ctx = rows[0];

  // Get attendance (if exists)
  const [attRows] = await pool.query(
    `
    SELECT attendance_status
    FROM attendance
    WHERE event_id = ? AND user_id = ?
    LIMIT 1
    `,
    [ctx.event_id, ctx.user_id]
  );

  ctx.attendance_status = attRows[0]?.attendance_status || null;
  return ctx;
}

/**
 * Eligibility rules for PARTICIPANT certificates:
 *
 * - registration_status = 'registered'
 * - if event is paid => payment_status = 'approved'
 * - attendance_status = 'present'
 * - (optional) event_date in the past (you can enable it if you want)
 */
function isParticipantEligible(ctx) {
  if (!ctx) return false;

  if (ctx.registration_status !== 'registered') return false;

  if (ctx.is_paid && ctx.payment_required) {
    if (ctx.payment_status !== 'approved') return false;
  }

  // Require present
  if (ctx.attendance_status !== 'present') return false;

  // OPTIONAL: require event date in the past
  // const today = new Date();
  // if (ctx.event_date && new Date(ctx.event_date) > today) return false;

  return true;
}

/**
 * Generate a single participant certificate PDF
 * for one registration + template.
 *
 * baseUrl is used to build the verification URL embedded in the PDF.
 */
async function generateParticipantCertificate(registrationId, templateId, issuedBy, baseUrl) {
  const ctx = await getRegistrationContext(registrationId);
  if (!ctx) {
    throw new Error('Registration not found');
  }

  if (!isParticipantEligible(ctx)) {
    throw new Error('Registration is not eligible for participant certificate');
  }

  const template = await getCertificateTemplateById(templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  if (template.society_id !== ctx.society_id) {
    throw new Error('Template does not belong to this registration’s society');
  }

  // If a certificate already exists for this registration, just return it
  const existing = await getCertificatesByRegistration(registrationId);
  if (existing && existing.length > 0) {
    return existing[0];
  }

  // Load template HTML from disk
  // template_file_path is something like "/uploads/templates/template_...html"
  const templatePathOnDisk = path.join(
    __dirname,
    '..',
    '..',
    template.template_file_path.replace(/^\//, '')
  );

  const htmlRaw = await fs.readFile(templatePathOnDisk, 'utf8');

  // Generate verification token + URL
  const token = generateVerificationToken();
  const cleanBase = baseUrl.replace(/\/$/, '');
  const verificationUrl = `${cleanBase}/api/certificates/verify/${token}`;

  // Data for placeholders in the template
  const data = {
    name: ctx.student_name,
    role: 'Participant',
    verification_url: verificationUrl,
    token: token,
  };

  const renderedHtml = renderTemplate(htmlRaw, data);

  // Prepare certificates directory
  const certsDir = path.join(__dirname, '..', '..', 'uploads', 'certificates');
  await ensureDir(certsDir);

  const fileName = `event_${ctx.event_id}_reg_${registrationId}.pdf`;
  const filePathOnDisk = path.join(certsDir, fileName);
  const filePathPublic = `/uploads/certificates/${fileName}`;

  // Generate PDF with Puppeteer
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    await page.setContent(renderedHtml, { waitUntil: 'networkidle0' });

    await page.pdf({
      path: filePathOnDisk,
      format: 'A4',
      printBackground: true,
    });
  } finally {
    await browser.close();
  }

  // Insert certificate row
  const cert = await createCertificate({
    registration_id: registrationId,
    template_id: templateId,
    verification_token: token,
    status: 'ready',
    file_path: filePathPublic,
    issued_by: issuedBy,
  });

  return cert;
}

/**
 * Bulk generate PARTICIPANT certificates for all eligible registrations of an event.
 */
async function generateParticipantCertificatesForEvent(eventId, templateId, issuedBy, baseUrl) {
  const [rows] = await pool.query(
    `
    SELECT registration_id
    FROM registrations
    WHERE event_id = ?
      AND status = 'registered'
    `,
    [eventId]
  );

  const created = [];
  const skipped = [];

  for (const r of rows) {
    try {
      const cert = await generateParticipantCertificate(
        r.registration_id,
        templateId,
        issuedBy,
        baseUrl
      );
      created.push(cert);
    } catch (err) {
      skipped.push({
        registration_id: r.registration_id,
        reason: err.message,
      });
    }
  }

  return { created, skipped };
}

module.exports = {
  generateParticipantCertificate,
  generateParticipantCertificatesForEvent,
};
