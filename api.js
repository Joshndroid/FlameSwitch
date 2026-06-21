const { join } = require('path');
const express = require('express');
const { errorHandler } = require('./middleware');
const healthRoutes = require('./routes/health');
const changelog = require('./routes/changelog');
const version = require('./routes/version');
const api = express();
api.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);

api.use((_req, res, next) => {
  res.set({
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: http: https:; font-src 'self'; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  });
  next();
});

// Register health route BEFORE static content handler
api.use('/health', healthRoutes);

// Static files
api.use(express.static(join(__dirname, 'public')));
api.use(
  '/uploads',
  express.static(join(__dirname, 'data/uploads'), {
    setHeaders: (res) => {
      res.set('Content-Security-Policy', "sandbox; default-src 'none'");
      res.set('X-Content-Type-Options', 'nosniff');
    },
  })
);

// Body parser
api.use(express.json({ limit: '256kb' }));

// Link controllers with routes
api.use('/api/apps', require('./routes/apps'));
api.use('/api/config', require('./routes/config'));
api.use('/api/weather', require('./routes/weather'));
api.use('/api/categories', require('./routes/category'));
api.use('/api/bookmarks', require('./routes/bookmark'));
api.use('/api/queries', require('./routes/queries'));
api.use('/api/auth', require('./routes/auth'));
api.use('/api/themes', require('./routes/themes'));
api.use('/api/favicon', require('./routes/favicon'));
api.use('/api/changelog', changelog);
api.use('/app/changelog', changelog);
api.use('/api/version', version);

api.get(/^\/(?!api)/, (req, res) => {
  res.sendFile(join(__dirname, 'public/index.html'));
});

// Custom error handler
api.use(errorHandler);

module.exports = api;
