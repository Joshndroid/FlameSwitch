const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { rateLimit } = require('express-rate-limit');
const App = require('../models/App');
const Bookmark = require('../models/Bookmark');

const router = express.Router();
const cacheDir = path.resolve('data/favicon-cache');
const maxBytes = 1024 * 1024;
fs.mkdirSync(cacheDir, { recursive: true });

const faviconRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many favicon requests. Try again later.',
  },
});

const parseURL = (value) => {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return ['http:', 'https:'].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
};

const isConfiguredURL = async (requested) => {
  const [apps, bookmarks] = await Promise.all([
    App.findAll({ attributes: ['url'], raw: true }),
    Bookmark.findAll({ attributes: ['url'], raw: true }),
  ]);

  return [...apps, ...bookmarks].some(({ url }) => {
    const configured = parseURL(url);
    return configured && configured.origin === requested.origin;
  });
};

const isImage = (bytes) =>
  bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) ||
  bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex')) ||
  (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') ||
  bytes.subarray(0, 4).equals(Buffer.from('00000100', 'hex'));

const fetchImage = async (initialURL) => {
  let current = initialURL;

  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'FlameSwitch favicon fetcher' },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) return null;
      const next = new URL(location, current);
      if (next.origin !== initialURL.origin) return null;
      current = next;
      continue;
    }

    if (!response.ok) return null;
    const declaredLength = Number(response.headers.get('content-length'));
    if (declaredLength > maxBytes) return null;

    const reader = response.body.getReader();
    const chunks = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }

    const bytes = Buffer.concat(chunks);
    return isImage(bytes) ? bytes : null;
  }

  return null;
};

router.get('/', faviconRateLimit, async (req, res, next) => {
  try {
    const requested = typeof req.query.url === 'string' ? parseURL(req.query.url) : null;
    if (!requested) return res.status(400).json({ error: 'Valid URL parameter required' });
    if (!(await isConfiguredURL(requested))) {
      return res.status(403).json({ error: 'URL is not configured in FlameSwitch' });
    }

    const hash = crypto.createHash('sha256').update(requested.origin).digest('hex');
    const cacheFile = path.join(cacheDir, `${hash}.ico`);
    if (fs.existsSync(cacheFile)) {
      const age = Date.now() - fs.statSync(cacheFile).mtimeMs;
      if (age < 7 * 24 * 60 * 60 * 1000) return res.sendFile(cacheFile);
    }

    for (const faviconPath of ['/favicon.ico', '/apple-touch-icon.png', '/apple-touch-icon-precomposed.png']) {
      const bytes = await fetchImage(new URL(faviconPath, requested.origin));
      if (bytes) {
        fs.writeFileSync(cacheFile, bytes, { mode: 0o600 });
        return res.sendFile(cacheFile);
      }
    }

    return res.status(404).json({ error: 'Favicon not found' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
