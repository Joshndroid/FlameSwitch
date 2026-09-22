const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { withoutWeatherConfig } = require('../utils/loadConfig');
const { passwordsMatch } = require('../controllers/auth/login');
const { slugify } = require('../db/utils/slugify');
const trustProxy = require('../utils/trustProxy');

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

test('removed configuration fields are not returned', () => {
  const config = { WEATHER_API_KEY: 'private-value', customTitle: 'Flame' };
  assert.deepEqual(withoutWeatherConfig(config), { customTitle: 'Flame' });
});

test('password comparison is exact', async () => {
  assert.equal(await passwordsMatch('correct horse', 'correct horse'), true);
  assert.equal(await passwordsMatch('correct horse', 'correct Horse'), false);
  assert.equal(await passwordsMatch(undefined, undefined), false);
});

test('database backup names do not depend on a .env VERSION', () => {
  assert.equal(slugify('v1.6.1'), 'db-v161-backup.sqlite');
  assert.equal(slugify('../../outside'), 'db-outside-backup.sqlite');
  assert.match(slugify(), /^db-[a-zA-Z0-9_-]+-backup\.sqlite$/);
});

test('reverse proxy trust is explicit and bounded', () => {
  assert.equal(trustProxy(undefined), false);
  assert.equal(trustProxy('false'), false);
  assert.equal(trustProxy('0'), false);
  assert.equal(trustProxy('true'), 1);
  assert.equal(trustProxy('2'), 2);
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
