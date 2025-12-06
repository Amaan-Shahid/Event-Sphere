// src/routes/registrationRoutes.js
const express = require('express');
const router = express.Router();

const {
  registerForEvent,
  cancelRegistrationHandler,
  uploadPaymentProof,
  getEventRegistrations,
  approvePayment,
  rejectPayment,
  getMyRegistrations,
} = require('../controllers/registrationController');

const { requireAuth } = require('../middleware/authMiddleware');
const { uploadPaymentProof: uploadPaymentMulter } = require('../config/uploadConfig');

// Student routes
router.post('/events/:eventId/register', requireAuth, registerForEvent);
router.post('/events/:eventId/cancel', requireAuth, cancelRegistrationHandler);
router.get('/my/registrations', requireAuth, getMyRegistrations);

// Payment screenshot upload (student)
router.post(
  '/events/:eventId/registrations/:registrationId/payment-proof',
  requireAuth,
  uploadPaymentMulter.single('payment_screenshot'),
  uploadPaymentProof
);

// Admin routes (society core or super admin)
router.get(
  '/events/:eventId/registrations',
  requireAuth,
  getEventRegistrations
);

router.put(
  '/events/:eventId/registrations/:registrationId/payment/approve',
  requireAuth,
  approvePayment
);

router.put(
  '/events/:eventId/registrations/:registrationId/payment/reject',
  requireAuth,
  rejectPayment
);

module.exports = router;
