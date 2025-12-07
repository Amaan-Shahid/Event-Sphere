// src/controllers/logController.js
const { getRecentLogs } = require('../models/logModel');

async function getLogsHandler(req, res, next) {
  try {
    const limit = Number(req.query.limit) || 100;
    const logs = await getRecentLogs(limit);

    res.json({
      success: true,
      data: logs,
    });
  } catch (err) {
    console.error('🔥 getLogsHandler error:', err);
    next(err);
  }
}

module.exports = {
  getLogsHandler,
};
