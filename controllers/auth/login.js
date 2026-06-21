const asyncWrapper = require('../../middleware/asyncWrapper');
const ErrorResponse = require('../../utils/ErrorResponse');
const signToken = require('../../utils/signToken');
const crypto = require('crypto');
const { promisify } = require('util');
const passwordComparisonSalt = crypto.randomBytes(16);
const scrypt = promisify(crypto.scrypt);

const passwordsMatch = async (expected, supplied) => {
  if (typeof expected !== 'string' || !expected || typeof supplied !== 'string') {
    return false;
  }
  const expectedHash = await scrypt(expected, passwordComparisonSalt, 64);
  const suppliedHash = await scrypt(supplied, passwordComparisonSalt, 64);
  return crypto.timingSafeEqual(expectedHash, suppliedHash);
};

// @desc      Login user
// @route     POST /api/auth/
// @access    Public
const login = asyncWrapper(async (req, res, next) => {
  const { password, duration } = req.body;
  const allowedDurations = new Set(['1h', '8h', '1d', '7d', '14d', '30d']);

  if (!allowedDurations.has(duration)) {
    return next(new ErrorResponse('Invalid session duration', 400));
  }

  if (!process.env.PASSWORD) {
    return next(new ErrorResponse('Authentication is not configured', 503));
  }

  const isMatch = await passwordsMatch(process.env.PASSWORD, password);

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  const token = signToken(duration);

  res.status(200).json({
    success: true,
    data: { token },
  });
});

module.exports = login;
module.exports.passwordsMatch = passwordsMatch;
