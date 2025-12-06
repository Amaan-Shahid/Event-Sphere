// src/models/registrationModel.js
const { pool } = require('../config/db');

// Get a registration by event+user
async function getRegistrationByEventAndUser(eventId, userId) {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM registrations
    WHERE event_id = ? AND user_id = ?
    LIMIT 1
    `,
    [eventId, userId]
  );
  return rows[0] || null;
}

// Get registration by id
async function getRegistrationById(registrationId) {
  const [rows] = await pool.query(
    'SELECT * FROM registrations WHERE registration_id = ? LIMIT 1',
    [registrationId]
  );
  return rows[0] || null;
}

// Count active registrations (status = 'registered')
async function countActiveRegistrations(eventId) {
  const [rows] = await pool.query(
    `
    SELECT COUNT(*) AS count
    FROM registrations
    WHERE event_id = ? AND status = 'registered'
    `,
    [eventId]
  );
  return rows[0]?.count || 0;
}

// Create registration
async function createRegistration({
  event_id,
  user_id,
  payment_required,
  fee_amount,
  payment_status,
}) {
  const [result] = await pool.query(
    `
    INSERT INTO registrations (
      event_id,
      user_id,
      status,
      payment_required,
      fee_amount,
      payment_status,
      payment_screenshot_path
    ) VALUES (?, ?, 'registered', ?, ?, ?, NULL)
    `,
    [event_id, user_id, payment_required ? 1 : 0, fee_amount, payment_status]
  );

  return getRegistrationById(result.insertId);
}

// Cancel registration (user side)
async function cancelRegistration(registrationId, userId) {
  await pool.query(
    `
    UPDATE registrations
    SET status = 'cancelled'
    WHERE registration_id = ? AND user_id = ?
    `,
    [registrationId, userId]
  );
}

// Update payment screenshot + set status = 'submitted'
async function updatePaymentScreenshot(registrationId, screenshotRelativePath) {
  await pool.query(
    `
    UPDATE registrations
    SET payment_screenshot_path = ?, payment_status = 'submitted'
    WHERE registration_id = ?
    `,
    [screenshotRelativePath, registrationId]
  );
}

// Change payment status (admin)
async function updatePaymentStatus(registrationId, paymentStatus) {
  await pool.query(
    `
    UPDATE registrations
    SET payment_status = ?
    WHERE registration_id = ?
    `,
    [paymentStatus, registrationId]
  );
}

// List registrations for event (with student info)
async function listRegistrationsForEvent(eventId) {
  const [rows] = await pool.query(
    `
    SELECT
      r.registration_id,
      r.event_id,
      r.user_id,
      u.name AS student_name,
      u.email AS student_email,
      r.status,
      r.payment_required,
      r.fee_amount,
      r.payment_status,
      r.payment_screenshot_path,
      r.registered_at
    FROM registrations r
    JOIN users u ON r.user_id = u.user_id
    WHERE r.event_id = ?
    ORDER BY r.registered_at ASC
    `,
    [eventId]
  );
  return rows;
}

// List registrations for a user (for "My Registrations")
async function listRegistrationsForUser(userId) {
  const [rows] = await pool.query(
    `
    SELECT
      r.registration_id,
      r.event_id,
      e.title AS event_title,
      e.event_date,
      e.venue,
      e.is_paid,
      r.status,
      r.payment_required,
      r.fee_amount,
      r.payment_status,
      r.payment_screenshot_path,
      r.registered_at
    FROM registrations r
    JOIN events e ON r.event_id = e.event_id
    WHERE r.user_id = ?
    ORDER BY e.event_date DESC, r.registered_at DESC
    `,
    [userId]
  );
  return rows;
}

module.exports = {
  getRegistrationByEventAndUser,
  getRegistrationById,
  countActiveRegistrations,
  createRegistration,
  cancelRegistration,
  updatePaymentScreenshot,
  updatePaymentStatus,
  listRegistrationsForEvent,
  listRegistrationsForUser,
};
