// src/controllers/logController.js
const { listLogs } = require('../models/logModel');

async function getLogsHandler(req, res, next) {
  try {
    const limit = Number(req.query.limit) || 100;
    const logs = await listLogs(limit);

    res.json({
      success: true,
      data: logs,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLogsHandler,
};
