// src/controllers/attendanceController.js
const {
  upsertAttendance,
  listAttendanceForEvent,
  listAttendanceForUser,
} = require('../models/attendanceModel');

const { getEventById } = require('../models/eventModel');
const { isUserCoreMemberOfSociety } = require('../models/userModel');
const { getRegistrationByEventAndUser } = require('../models/registrationModel');

/**
 * Helper: can user manage attendance for this event?
 */
async function canManageEventAttendance(user, event) {
  if (!event) return false;
  if (user.role === 'super_admin') return true;
  return isUserCoreMemberOfSociety(user.user_id, event.society_id);
}

/**
 * Admin: mark attendance for a user
 * POST /api/events/:eventId/attendance/mark
 * body: { user_id, attendance_status? }
 */
async function markAttendanceHandler(req, res, next) {
  try {
    const admin = req.user;
    const eventId = Number(req.params.eventId);
    const { user_id, attendance_status } = req.body;

    if (!eventId || !user_id) {
      return res.status(400).json({
        success: false,
        message: 'eventId and user_id are required',
      });
    }

    const event = await getEventById(eventId);
    if (!event || !event.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const allowed = await canManageEventAttendance(admin, event);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to mark attendance for this event',
      });
    }

    // Optional but good: ensure student is registered for the event
    const registration = await getRegistrationByEventAndUser(eventId, user_id);
    if (!registration || registration.status !== 'registered') {
      return res.status(400).json({
        success: false,
        message: 'User is not a registered attendee for this event',
      });
    }

    const status = attendance_status === 'absent' ? 'absent' : 'present';

    const record = await upsertAttendance({
      event_id: eventId,
      user_id,
      attendance_status: status,
      marked_by: admin.user_id,
    });

    res.json({
      success: true,
      message: 'Attendance recorded successfully',
      data: record,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: get attendance list for an event
 * GET /api/events/:eventId/attendance
 */
async function getEventAttendanceHandler(req, res, next) {
  try {
    const admin = req.user;
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

    const allowed = await canManageEventAttendance(admin, event);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to view attendance for this event',
      });
    }

    const records = await listAttendanceForEvent(eventId);

    res.json({
      success: true,
      data: records,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Student: get "My Attendance"
 * GET /api/my/attendance
 */
async function getMyAttendanceHandler(req, res, next) {
  try {
    const user = req.user;
    const records = await listAttendanceForUser(user.user_id);

    res.json({
      success: true,
      data: records,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  markAttendanceHandler,
  getEventAttendanceHandler,
  getMyAttendanceHandler,
};
