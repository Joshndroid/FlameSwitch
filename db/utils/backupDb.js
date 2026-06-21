const fs = require('fs');
const path = require('path');
const { slugify } = require('./slugify');

module.exports = (databasePath) => {
  if (!fs.existsSync(databasePath)) return;

  const backupDirectory = path.join(path.dirname(databasePath), 'db_backups');
  const backupPath = path.join(backupDirectory, slugify());
  fs.mkdirSync(backupDirectory, { recursive: true });

  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(databasePath, backupPath);
  }
};
