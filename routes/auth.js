const express = require('express');
const router = express.Router();

const { login, validate } = require('../controllers/auth');
const requireBody = require('../middleware/requireBody');
const rateLimit = require('../middleware/rateLimit');

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts. Try again later.',
});

router.route('/').post(authRateLimit, requireBody(['password', 'duration']), login);

router.route('/validate').post(authRateLimit, requireBody(['token']), validate);

module.exports = router;
