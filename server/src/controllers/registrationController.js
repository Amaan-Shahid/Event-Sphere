// src/controllers/registrationController.js
const {
  getRegistrationByEventAndUser,
  getRegistrationById,
  countActiveRegistrations,
  createRegistration,
  cancelRegistration,
  updatePaymentScreenshot,
  updatePaymentStatus,
  listRegistrationsForEvent,
  listRegistrationsForUser,
} = require('../models/registrationModel');

const { getEventById } = require('../models/eventModel');
const { isUserCoreMemberOfSociety } = require('../models/userModel');

// Helper to check if user can manage registrations for event's society
async function canManageEventRegistrations(user, event) {
  if (!event) return false;
  if (user.role === 'super_admin') return true;
  return isUserCoreMemberOfSociety(user.user_id, event.society_id);
}

/**
 * Student: register for event
 * POST /api/events/:eventId/register
 */
async function registerForEvent(req, res, next) {
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

    // Optional: check registration deadline
    if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Registration deadline has passed',
      });
    }

    // Check if already registered
    const existing = await getRegistrationByEventAndUser(eventId, user.user_id);
    if (existing && existing.status === 'registered') {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this event',
      });
    }

    // Capacity check (for registered only)
    if (event.capacity && event.capacity > 0) {
      const regCount = await countActiveRegistrations(eventId);
      if (regCount >= event.capacity) {
        return res.status(400).json({
          success: false,
          message: 'Event capacity is full',
        });
      }
    }

    let payment_required = false;
    let fee_amount = null;
    let payment_status = 'not_required';

    if (event.is_paid) {
      payment_required = true;
      fee_amount = event.base_fee_amount || 0;
      payment_status = 'pending';
    }

    const registration = await createRegistration({
      event_id: eventId,
      user_id: user.user_id,
      payment_required,
      fee_amount,
      payment_status,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: registration,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Student: cancel registration
 * POST /api/events/:eventId/cancel
 */
async function cancelRegistrationHandler(req, res, next) {
  try {
    const user = req.user;
    const eventId = Number(req.params.eventId);

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event id',
      });
    }

    const existing = await getRegistrationByEventAndUser(eventId, user.user_id);
    if (!existing || existing.status !== 'registered') {
      return res.status(400).json({
        success: false,
        message: 'You are not currently registered for this event',
      });
    }

    await cancelRegistration(existing.registration_id, user.user_id);

    res.json({
      success: true,
      message: 'Registration cancelled successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Student: upload payment screenshot for a registration
 * POST /api/events/:eventId/registrations/:registrationId/payment-proof
 */
async function uploadPaymentProof(req, res, next) {
  try {
    const user = req.user;
    const eventId = Number(req.params.eventId);
    const registrationId = Number(req.params.registrationId);

    if (!eventId || !registrationId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event or registration id',
      });
    }

    const registration = await getRegistrationById(registrationId);
    if (!registration || registration.event_id !== eventId) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }

    if (registration.user_id !== user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'You can only upload payment proof for your own registrations',
      });
    }

    if (!registration.payment_required) {
      return res.status(400).json({
        success: false,
        message: 'This registration does not require payment',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Store relative path: /uploads/payments/filename
    const relativePath = `/uploads/payments/${req.file.filename}`;

    await updatePaymentScreenshot(registrationId, relativePath);

    res.json({
      success: true,
      message: 'Payment proof uploaded successfully',
      payment_screenshot_path: relativePath,
    });
  } catch (err) {
    // Multer errors will also be caught here
    next(err);
  }
}

/**
 * Admin: list registrations for an event
 * GET /api/events/:eventId/registrations
 */
async function getEventRegistrations(req, res, next) {
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

    const allowed = await canManageEventRegistrations(user, event);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to view registrations for this event',
      });
    }

    const regs = await listRegistrationsForEvent(eventId);

    res.json({
      success: true,
      data: regs,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: approve payment
 * PUT /api/events/:eventId/registrations/:registrationId/payment/approve
 */
async function approvePayment(req, res, next) {
  try {
    const user = req.user;
    const eventId = Number(req.params.eventId);
    const registrationId = Number(req.params.registrationId);

    if (!eventId || !registrationId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event or registration id',
      });
    }

    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const allowed = await canManageEventRegistrations(user, event);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to approve payments for this event',
      });
    }

    const registration = await getRegistrationById(registrationId);
    if (!registration || registration.event_id !== eventId) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }

    if (!registration.payment_required) {
      return res.status(400).json({
        success: false,
        message: 'This registration does not require payment',
      });
    }

    await updatePaymentStatus(registrationId, 'approved');

    res.json({
      success: true,
      message: 'Payment approved successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: reject payment
 * PUT /api/events/:eventId/registrations/:registrationId/payment/reject
 */
async function rejectPayment(req, res, next) {
  try {
    const user = req.user;
    const eventId = Number(req.params.eventId);
    const registrationId = Number(req.params.registrationId);

    if (!eventId || !registrationId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event or registration id',
      });
    }

    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const allowed = await canManageEventRegistrations(user, event);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to reject payments for this event',
      });
    }

    const registration = await getRegistrationById(registrationId);
    if (!registration || registration.event_id !== eventId) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }

    if (!registration.payment_required) {
      return res.status(400).json({
        success: false,
        message: 'This registration does not require payment',
      });
    }

    await updatePaymentStatus(registrationId, 'rejected');

    res.json({
      success: true,
      message: 'Payment rejected successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Student: list own registrations
 * GET /api/my/registrations
 */
async function getMyRegistrations(req, res, next) {
  try {
    const user = req.user;
    const regs = await listRegistrationsForUser(user.user_id);

    res.json({
      success: true,
      data: regs,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  registerForEvent,
  cancelRegistrationHandler,
  uploadPaymentProof,
  getEventRegistrations,
  approvePayment,
  rejectPayment,
  getMyRegistrations,
};
