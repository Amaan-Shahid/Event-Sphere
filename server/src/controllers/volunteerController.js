// src/controllers/volunteerController.js
const {
  getVolunteerByEventAndUser,
  getVolunteerById,
  createVolunteer,
  updateVolunteerStatus,
  cancelVolunteer,
  listVolunteersForEvent,
  listVolunteersForUser,
} = require('../models/volunteerModel');

const { getEventById } = require('../models/eventModel');
const { isUserCoreMemberOfSociety } = require('../models/userModel');

// Helper: can user manage volunteers for this event's society?
async function canManageEventVolunteers(user, event) {
  if (!event) return false;
  if (user.role === 'super_admin') return true;
  return isUserCoreMemberOfSociety(user.user_id, event.society_id);
}

/**
 * Student: apply as volunteer
 * POST /api/events/:eventId/volunteers/apply
 */
async function applyAsVolunteer(req, res, next) {
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
    if (!event || !event.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // (Optional) If you want to block volunteering after event date, you can add a date check here
    // We're skipping that for now like you did with registration deadlines

    const existing = await getVolunteerByEventAndUser(eventId, user.user_id);

    if (existing && existing.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'You are already approved as volunteer for this event',
      });
    }

    if (existing && existing.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Your volunteer application is already pending',
      });
    }

    // If previously rejected, allow them to re-apply:
    let volunteer;
    if (existing && existing.status === 'rejected') {
      volunteer = await updateVolunteerStatus(existing.volunteer_id, 'pending');
    } else {
      volunteer = await createVolunteer(eventId, user.user_id);
    }

    res.status(201).json({
      success: true,
      message: 'Volunteer application submitted successfully',
      data: volunteer,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Student: cancel own volunteer application
 * POST /api/events/:eventId/volunteers/cancel
 */
async function cancelVolunteerHandler(req, res, next) {
  try {
    const user = req.user;
    const eventId = Number(req.params.eventId);

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event id',
      });
    }

    const existing = await getVolunteerByEventAndUser(eventId, user.user_id);

    if (!existing || existing.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'You do not have a pending volunteer application for this event',
      });
    }

    await cancelVolunteer(eventId, user.user_id);

    res.json({
      success: true,
      message: 'Volunteer application cancelled (marked as rejected)',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Student: list own volunteer records
 * GET /api/my/volunteers
 */
async function getMyVolunteering(req, res, next) {
  try {
    const user = req.user;
    const volunteers = await listVolunteersForUser(user.user_id);

    res.json({
      success: true,
      data: volunteers,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: list volunteers for event
 * GET /api/events/:eventId/volunteers
 */
async function getEventVolunteers(req, res, next) {
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

    const allowed = await canManageEventVolunteers(user, event);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to view volunteers for this event',
      });
    }

    const volunteers = await listVolunteersForEvent(eventId);

    res.json({
      success: true,
      data: volunteers,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: change volunteer status
 * PUT /api/events/:eventId/volunteers/:volunteerId/status
 * body: { status: "approved" | "rejected" }
 */
async function updateVolunteerStatusHandler(req, res, next) {
  try {
    const user = req.user;
    const eventId = Number(req.params.eventId);
    const volunteerId = Number(req.params.volunteerId);
    const { status } = req.body;

    if (!eventId || !volunteerId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event or volunteer id',
      });
    }

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Allowed: pending, approved, rejected',
      });
    }

    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const allowed = await canManageEventVolunteers(user, event);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to update volunteers for this event',
      });
    }

    const volunteer = await getVolunteerById(volunteerId);
    if (!volunteer || volunteer.event_id !== eventId) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer record not found',
      });
    }

    const updated = await updateVolunteerStatus(volunteerId, status);

    res.json({
      success: true,
      message: 'Volunteer status updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  applyAsVolunteer,
  cancelVolunteerHandler,
  getMyVolunteering,
  getEventVolunteers,
  updateVolunteerStatusHandler,
};
