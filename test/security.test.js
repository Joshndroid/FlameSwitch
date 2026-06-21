const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { redactConfig } = require('../controllers/config/getConfig');
const { passwordsMatch } = require('../controllers/auth/login');
const rateLimit = require('../middleware/rateLimit');

const runAuth = (authorization) => {
  const req = {
    header: () => authorization,
  };
  let called = false;
  auth(req, {}, () => {
    called = true;
  });
  return { req, called };
};

test('authentication accepts a valid token', () => {
  process.env.SECRET = 'test-secret';
  const token = jwt.sign({ app: 'flame' }, process.env.SECRET, { expiresIn: '1h' });
  const { req, called } = runAuth(`Bearer ${token}`);
  assert.equal(called, true);
  assert.equal(req.isAuthenticated, true);
});

test('authentication rejects an invalid token without throwing', () => {
  process.env.SECRET = 'test-secret';
  const { req, called } = runAuth('Bearer invalid-token');
  assert.equal(called, true);
  assert.equal(req.isAuthenticated, false);
});

test('public config never exposes the weather API key', () => {
  const config = { WEATHER_API_KEY: 'private-value', customTitle: 'Flame' };
  assert.deepEqual(redactConfig(config, false), {
    WEATHER_API_KEY: '__configured__',
    customTitle: 'Flame',
  });
  assert.equal(redactConfig(config, true).WEATHER_API_KEY, 'private-value');
});

test('password comparison is exact', () => {
  assert.equal(passwordsMatch('correct horse', 'correct horse'), true);
  assert.equal(passwordsMatch('correct horse', 'correct Horse'), false);
  assert.equal(passwordsMatch(undefined, undefined), false);
});

test('rate limiter blocks requests over the configured limit', () => {
  const limiter = rateLimit({ windowMs: 60_000, max: 1, message: 'limited' });
  const request = { baseUrl: '/test-rate-limit', ip: 'test-client' };
  let nextCalls = 0;
  const response = {
    statusCode: 200,
    set: () => {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  limiter(request, response, () => nextCalls++);
  limiter(request, response, () => nextCalls++);
  assert.equal(nextCalls, 1);
  assert.equal(response.statusCode, 429);
  assert.equal(response.body.error, 'limited');
});
