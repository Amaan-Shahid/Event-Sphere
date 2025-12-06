// src/models/eventModel.js
const { pool } = require('../config/db');

/**
 * Create a new event.
 * data: { society_id, created_by, title, description, event_date, start_time, end_time,
 *         venue, category, capacity, registration_deadline, banner_image_path,
 *         is_paid, base_fee_amount }
 */
async function createEvent(data) {
  const {
    society_id,
    created_by,
    title,
    description,
    event_date,
    start_time,
    end_time,
    venue,
    category,
    capacity,
    registration_deadline,
    banner_image_path,
    is_paid,
    base_fee_amount,
  } = data;

  const [result] = await pool.query(
    `
    INSERT INTO events (
      society_id, created_by, title, description,
      event_date, start_time, end_time, venue,
      category, capacity, registration_deadline,
      banner_image_path, is_paid, base_fee_amount, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `,
    [
      society_id,
      created_by,
      title,
      description || null,
      event_date,
      start_time || null,
      end_time || null,
      venue || null,
      category || null,
      capacity || 0,
      registration_deadline || null,
      banner_image_path || null,
      is_paid ? 1 : 0,
      is_paid ? base_fee_amount || 0 : null,
    ]
  );

  const eventId = result.insertId;
  return getEventById(eventId);
}

/**
 * Get event by id (with society name + creator name)
 */
async function getEventById(eventId) {
  const [rows] = await pool.query(
    `
    SELECT
      e.*,
      s.name AS society_name,
      u.name AS created_by_name
    FROM events e
    JOIN societies s ON e.society_id = s.society_id
    JOIN users u ON e.created_by = u.user_id
    WHERE e.event_id = ?
    `,
    [eventId]
  );

  return rows[0] || null;
}

/**
 * Update an event (partial).
 * fields is an object with keys to update.
 */
async function updateEvent(eventId, fields) {
  const allowedFields = [
    'title',
    'description',
    'event_date',
    'start_time',
    'end_time',
    'venue',
    'category',
    'capacity',
    'registration_deadline',
    'banner_image_path',
    'is_paid',
    'base_fee_amount',
    'is_active',
  ];

  const setClauses = [];
  const params = [];

  for (const key of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      setClauses.push(`${key} = ?`);
      params.push(fields[key]);
    }
  }

  if (setClauses.length === 0) {
    return getEventById(eventId);
  }

  params.push(eventId);

  await pool.query(
    `UPDATE events SET ${setClauses.join(', ')} WHERE event_id = ?`,
    params
  );

  return getEventById(eventId);
}

/**
 * Soft delete: set is_active = 0
 */
async function softDeleteEvent(eventId) {
  await pool.query(
    'UPDATE events SET is_active = 0 WHERE event_id = ?',
    [eventId]
  );
}

/**
 * List events with optional filters:
 * - search (title/description)
 * - society_id
 * - is_paid
 * - upcomingOnly
 * - category
 */
async function listEvents(filters = {}) {
  const {
    search,
    society_id,
    is_paid,
    category,
    upcomingOnly,
  } = filters;

  let query = `
    SELECT
      e.*,
      s.name AS society_name,
      u.name AS created_by_name
    FROM events e
    JOIN societies s ON e.society_id = s.society_id
    JOIN users u ON e.created_by = u.user_id
    WHERE e.is_active = 1
  `;
  const params = [];

  if (typeof search === 'string' && search.trim() !== '') {
    query += ' AND (e.title LIKE ? OR e.description LIKE ?)';
    const like = `%${search.trim()}%`;
    params.push(like, like);
  }

  if (society_id) {
    query += ' AND e.society_id = ?';
    params.push(society_id);
  }

  if (typeof is_paid === 'boolean') {
    query += ' AND e.is_paid = ?';
    params.push(is_paid ? 1 : 0);
  }

  if (category) {
    query += ' AND e.category = ?';
    params.push(category);
  }

  if (upcomingOnly) {
    query += ' AND e.event_date >= CURDATE()';
  }

  query += ' ORDER BY e.event_date ASC, e.start_time ASC';

  const [rows] = await pool.query(query, params);
  return rows;
}

/**
 * List events for a specific society (for admin view).
 */
async function listEventsForSociety(societyId) {
  return listEvents({ society_id: societyId });
}

module.exports = {
  createEvent,
  getEventById,
  updateEvent,
  softDeleteEvent,
  listEvents,
  listEventsForSociety,
};
