// src/models/certificateModel.js
const { pool } = require('../config/db');

/**
 * TEMPLATES
 */

async function createCertificateTemplate({ society_id, name, template_file_path, created_by }) {
  const [result] = await pool.query(
    `
    INSERT INTO certificate_templates (society_id, name, template_file_path, created_by)
    VALUES (?, ?, ?, ?)
    `,
    [society_id, name, template_file_path, created_by]
  );

  return getCertificateTemplateById(result.insertId);
}

async function getCertificateTemplateById(templateId) {
  const [rows] = await pool.query(
    `
    SELECT t.*, s.name AS society_name
    FROM certificate_templates t
    JOIN societies s ON t.society_id = s.society_id
    WHERE t.template_id = ?
    `,
    [templateId]
  );
  return rows[0] || null;
}

async function listCertificateTemplatesForSociety(societyId) {
  const [rows] = await pool.query(
    `
    SELECT t.*, s.name AS society_name
    FROM certificate_templates t
    JOIN societies s ON t.society_id = s.society_id
    WHERE t.society_id = ?
    ORDER BY t.created_at DESC
    `,
    [societyId]
  );
  return rows;
}

async function deleteCertificateTemplate(templateId, societyId) {
  // extra safety with societyId
  await pool.query(
    `
    DELETE FROM certificate_templates
    WHERE template_id = ? AND society_id = ?
    `,
    [templateId, societyId]
  );
}

/**
 * CERTIFICATES
 */

async function createCertificate({
  registration_id,
  template_id,
  verification_token,
  status,
  file_path,
  issued_by,
}) {
  const [result] = await pool.query(
    `
    INSERT INTO certificates (
      registration_id,
      template_id,
      verification_token,
      status,
      file_path,
      issued_by,
      issued_at
    ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `,
    [registration_id, template_id, verification_token, status, file_path, issued_by]
  );

  return getCertificateById(result.insertId);
}

async function getCertificateById(certificateId) {
  const [rows] = await pool.query(
    `
    SELECT
      c.*,
      r.event_id,
      u.name AS student_name,
      u.email AS student_email,
      e.title AS event_title,
      e.event_date,
      s.name AS society_name
    FROM certificates c
    JOIN registrations r ON c.registration_id = r.registration_id
    JOIN users u ON r.user_id = u.user_id
    JOIN events e ON r.event_id = e.event_id
    JOIN societies s ON e.society_id = s.society_id
    WHERE c.certificate_id = ?
    `,
    [certificateId]
  );
  return rows[0] || null;
}

async function getCertificateByToken(token) {
  const [rows] = await pool.query(
    `
    SELECT
      c.*,
      r.event_id,
      u.name AS student_name,
      u.email AS student_email,
      e.title AS event_title,
      e.event_date,
      s.name AS society_name
    FROM certificates c
    JOIN registrations r ON c.registration_id = r.registration_id
    JOIN users u ON r.user_id = u.user_id
    JOIN events e ON r.event_id = e.event_id
    JOIN societies s ON e.society_id = s.society_id
    WHERE c.verification_token = ?
    `,
    [token]
  );
  return rows[0] || null;
}

async function listCertificatesForEvent(eventId) {
  const [rows] = await pool.query(
    `
    SELECT
      c.certificate_id,
      c.registration_id,
      c.template_id,
      c.verification_token,
      c.status,
      c.file_path,
      c.issued_by,
      c.issued_at,
      u.user_id,
      u.name AS student_name,
      u.email AS student_email
    FROM certificates c
    JOIN registrations r ON c.registration_id = r.registration_id
    JOIN users u ON r.user_id = u.user_id
    WHERE r.event_id = ?
    ORDER BY c.issued_at DESC
    `,
    [eventId]
  );
  return rows;
}

async function listCertificatesForUser(userId) {
  const [rows] = await pool.query(
    `
    SELECT
      c.certificate_id,
      c.registration_id,
      c.template_id,
      c.verification_token,
      c.status,
      c.file_path,
      c.issued_at,
      e.event_id,
      e.title AS event_title,
      e.event_date
    FROM certificates c
    JOIN registrations r ON c.registration_id = r.registration_id
    JOIN events e ON r.event_id = e.event_id
    WHERE r.user_id = ?
    ORDER BY c.issued_at DESC
    `,
    [userId]
  );
  return rows;
}

/**
 * Check if a certificate already exists for a registration
 */
async function getCertificatesByRegistration(registrationId) {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM certificates
    WHERE registration_id = ?
    `,
    [registrationId]
  );
  return rows;
}

module.exports = {
  createCertificateTemplate,
  getCertificateTemplateById,
  listCertificateTemplatesForSociety,
  deleteCertificateTemplate,

  createCertificate,
  getCertificateById,
  getCertificateByToken,
  listCertificatesForEvent,
  listCertificatesForUser,
  getCertificatesByRegistration,
};
