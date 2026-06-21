const packageVersion = require('../../package.json').version;

const getAppVersion = () =>
  process.env.APP_VERSION || process.env.VERSION || packageVersion || 'unknown';

const slugify = (version = getAppVersion()) => {
  const safeVersion = String(version)
    .replace(/\./g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '') || 'unknown';

  return `db-${safeVersion}-backup.sqlite`;
};

const parseSlug = (slug) => {
  const parts = slug.split('-');
  const version = {
    raw: parts[1],
    parsed: parts[1].split('').join('.'),
  };
  return version;
};

module.exports = {
  getAppVersion,
  slugify,
  parseSlug,
};
