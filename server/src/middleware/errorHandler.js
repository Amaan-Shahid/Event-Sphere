// src/middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  console.error('🔥 Error handler caught:', err);

  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    success: false,
    message,
  });
}

module.exports = errorHandler;
