// src/controllers/eventController.js
const {
  createEvent,
  getEventById,
  updateEvent,
  softDeleteEvent,
  listEvents,
  listEventsForSociety,
} = require('../models/eventModel');
const { isUserCoreMemberOfSociety } = require('../models/userModel');

/**
 * Public endpoint: list events for students.
 * Query params:
 *  - search
 *  - society_id
 *  - is_paid (true/false)
 *  - category
 *  - upcomingOnly (true/false)
 */
async function getEvents(req, res, next) {
  try {
    const {
      search,
      society_id,
      is_paid,
      category,
      upcomingOnly,
    } = req.query;

    const filters = {};

    if (search) filters.search = search;
    if (society_id) filters.society_id = Number(society_id) || null;
    if (category) filters.category = category;

    if (typeof is_paid === 'string') {
      if (is_paid === 'true') filters.is_paid = true;
      if (is_paid === 'false') filters.is_paid = false;
    }

    if (typeof upcomingOnly === 'string') {
      filters.upcomingOnly = upcomingOnly === 'true';
    }

    const events = await listEvents(filters);

    res.json({
      success: true,
      data: events,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Public: get single event by ID
 */
async function getEvent(req, res, next) {
  try {
    const eventId = Number(req.params.id);
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event id',
      });
    }

    const event = await getEventById(eventId);
    if (!event || !event.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    res.json({
      success: true,
      data: event,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Helper: check if current user can manage events for a given society.
 * - super_admin: always yes
 * - student: must be core member in that society
 */
async function canManageSocietyEvents(user, societyId) {
  if (user.role === 'super_admin') return true;
  if (!societyId) return false;
  return isUserCoreMemberOfSociety(user.user_id, societyId);
}

/**
 * Admin: create event (society core members or super_admin)
 */
async function createEventHandler(req, res, next) {
  try {
    const user = req.user;
    const {
      society_id,
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
    } = req.body;

    if (!society_id || !title || !event_date) {
      return res.status(400).json({
        success: false,
        message: 'society_id, title, and event_date are required',
      });
    }

    const societyIdNum = Number(society_id);

    const allowed = await canManageSocietyEvents(user, societyIdNum);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to create events for this society',
      });
    }

    const newEvent = await createEvent({
      society_id: societyIdNum,
      created_by: user.user_id,
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
      is_paid: !!is_paid,
      base_fee_amount,
    });

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: newEvent,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: update event
 */
async function updateEventHandler(req, res, next) {
  try {
    const user = req.user;
    const eventId = Number(req.params.id);
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event id',
      });
    }

    const event = await getEventById(eventId);
    if (!event || !event.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const allowed = await canManageSocietyEvents(user, event.society_id);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to update this event',
      });
    }

    const updated = await updateEvent(eventId, req.body);

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: delete event (soft delete)
 */
async function deleteEventHandler(req, res, next) {
  try {
    const user = req.user;
    const eventId = Number(req.params.id);
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event id',
      });
    }

    const event = await getEventById(eventId);
    if (!event || !event.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const allowed = await canManageSocietyEvents(user, event.society_id);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to delete this event',
      });
    }

    await softDeleteEvent(eventId);

    res.json({
      success: true,
      message: 'Event deleted (soft) successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: List events for a specific society (for its leaders)
 */
async function getSocietyEventsForAdmin(req, res, next) {
  try {
    const user = req.user;
    const societyId = Number(req.params.societyId);
    if (!societyId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid society id',
      });
    }

    const allowed = await canManageSocietyEvents(user, societyId);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to view admin events for this society',
      });
    }

    const events = await listEventsForSociety(societyId);

    res.json({
      success: true,
      data: events,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getEvents,
  getEvent,
  createEventHandler,
  updateEventHandler,
  deleteEventHandler,
  getSocietyEventsForAdmin,
};
