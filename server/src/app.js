// src/app.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { testConnection } = require('./config/db');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const errorHandler = require('./middleware/errorHandler');
const eventRoutes = require('./routes/eventRoutes');
const path = require('path');
const registrationRoutes = require('./routes/registrationRoutes');



dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded files (payment proofs, etc.)
app.use(
  '/uploads',
  express.static(path.join(__dirname, '..', 'uploads'))
);

// Test DB connection on startup
testConnection();

// Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/events', eventRoutes); 
app.use('/api', registrationRoutes);

// 404 fallback
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use(errorHandler);

module.exports = app;
