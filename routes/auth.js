const express = require('express');
const { rateLimit } = require('express-rate-limit');
const router = express.Router();

const { login, validate } = require('../controllers/auth');
const requireBody = require('../middleware/requireBody');

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Try again later.',
  },
});

router.route('/').post(authRateLimit, requireBody(['password', 'duration']), login);

router.route('/validate').post(authRateLimit, requireBody(['token']), validate);

module.exports = router;
