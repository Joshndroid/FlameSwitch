const express = require('express');
const fs = require('fs');
const path = require('path');
const { rateLimit } = require('express-rate-limit');

const router = express.Router();
const CONFIG_PATH = path.resolve('data/config.json');
const DB_PATH = path.resolve('data/db.sqlite');
const healthRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    status: 'unhealthy',
    errors: ['Too many health check requests. Try again later.'],
  },
});

router.get('/', healthRateLimit, (_req, res) => {
  const errors = [];

  if (!fs.existsSync(CONFIG_PATH)) errors.push('Missing config.json');
  if (!fs.existsSync(DB_PATH)) errors.push('Missing SQLite DB');

  const healthy = errors.length === 0;
  return res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    errors,
  });
});

module.exports = router;
