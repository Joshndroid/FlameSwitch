const test = require('node:test');
const assert = require('node:assert/strict');
const { isLocalUrl } = require('../routes/homeAssistant');

test('Home Assistant address must be a local IP without redirects or URL extras', () => {
  assert.equal(isLocalUrl('http://192.168.1.5:8123'), true);
  assert.equal(isLocalUrl('http://10.0.0.2'), true);
  assert.equal(isLocalUrl('http://172.31.0.2'), true);
  assert.equal(isLocalUrl('http://[fd00::5]:8123'), true);
  assert.equal(isLocalUrl('http://8.8.8.8:8123'), false);
  assert.equal(isLocalUrl('http://169.254.169.254'), false);
  assert.equal(isLocalUrl('https://example.com'), false);
  assert.equal(isLocalUrl('http://192.168.1.5:8123/api'), false);
  assert.equal(isLocalUrl('http://user:password@192.168.1.5'), false);
});
