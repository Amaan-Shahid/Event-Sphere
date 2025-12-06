// src/app.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { testConnection } = require('./config/db');
const healthRoutes = require('./routes/healthRoutes');
const errorHandler = require('./middleware/errorHandler');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test DB connection once on startup
testConnection();

// Routes
app.use('/api', healthRoutes);

// 404 fallback for unknown API routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Central error handler (must be last)
app.use(errorHandler);

module.exports = app;
