const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { redactConfig } = require('../controllers/config/getConfig');
const { passwordsMatch } = require('../controllers/auth/login');

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

test('password comparison is exact', async () => {
  assert.equal(await passwordsMatch('correct horse', 'correct horse'), true);
  assert.equal(await passwordsMatch('correct horse', 'correct Horse'), false);
  assert.equal(await passwordsMatch(undefined, undefined), false);
});

test('rate limiter is mounted after health and static routes', () => {
  const api = require('../api');
  const limiterIndex = api.router.stack.findIndex(
    ({ handle }) => handle === api.apiRateLimit
  );
  const jsonParserIndex = api.router.stack.findIndex(
    ({ name }) => name === 'jsonParser'
  );

  assert.ok(limiterIndex > 3);
  assert.ok(limiterIndex < jsonParserIndex);
});
