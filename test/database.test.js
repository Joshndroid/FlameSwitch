const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3');

const db = require('../db');
const App = require('../models/App');
const Bookmark = require('../models/Bookmark');
const Category = require('../models/Category');

const temporaryDatabase = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'flameswitch-db-'));
  return { directory, storage: path.join(directory, 'db.sqlite') };
};

const createLegacyDatabase = (storage) =>
  new Promise((resolve, reject) => {
    const connection = new sqlite3.Database(storage);
    connection.exec(`
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        isPinned INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE TABLE bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        categoryId INTEGER NOT NULL,
        icon TEXT DEFAULT '',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE TABLE apps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT 'cancel',
        isPinned INTEGER DEFAULT 0,
        orderId INTEGER DEFAULT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE TABLE weather (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        externalLastUpdate TEXT,
        tempC REAL,
        tempF REAL,
        isDay INTEGER,
        cloud INTEGER,
        conditionText TEXT,
        conditionCode INTEGER,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE TABLE SequelizeMeta (name TEXT NOT NULL UNIQUE PRIMARY KEY);
      INSERT INTO SequelizeMeta (name) VALUES ('00_initial.js');
      INSERT INTO categories (name, createdAt, updatedAt)
      VALUES ('Preserved category', '2026-01-01', '2026-01-01');
      INSERT INTO bookmarks (name, url, categoryId, createdAt, updatedAt)
      VALUES ('Preserved bookmark', 'https://bookmark.example', 1, '2026-01-01', '2026-01-01');
      INSERT INTO apps (name, url, createdAt, updatedAt)
      VALUES ('Preserved app', 'https://app.example', '2026-01-01', '2026-01-01');
    `, (error) => {
      if (error) return reject(error);
      connection.close((closeError) => (closeError ? reject(closeError) : resolve()));
    });
  });

test('direct SQLite repositories preserve CRUD, ordering, and visibility', async (t) => {
  const { directory, storage } = temporaryDatabase();
  t.after(async () => {
    await db.closeDB();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  await db.connectDB({ storage, backup: false });
  const category = await Category.create({ name: 'Links', isPinned: true });
  await Bookmark.create({
    name: 'Zulu', url: 'https://z.example', categoryId: category.id, isPublic: 1,
  });
  await Bookmark.create({
    name: 'alpha', url: 'https://a.example', categoryId: category.id, isPublic: 0,
  });
  const app = await App.create({
    name: 'Example', url: 'https://example.com', invertIcon: '0',
  });

  assert.equal(app.isPinned, false);
  assert.equal(app.invertIcon, false);
  assert.equal((await App.findById(app.id)).description, '');
  assert.equal((await app.update({ invertIcon: '1' })).invertIcon, true);
  assert.equal((await App.list({ orderBy: 'createdAt' }))[0].id, app.id);

  const publicCategories = await Category.listWithBookmarks({
    publicOnly: true,
    orderBy: 'name',
  });
  assert.deepEqual(publicCategories[0].bookmarks.map(({ name }) => name), ['Zulu']);

  const bookmarks = await Bookmark.list({ orderBy: 'name' });
  assert.deepEqual(bookmarks.map(({ name }) => name), ['alpha', 'Zulu']);

  await Bookmark.reorder([
    { id: bookmarks[0].id, orderId: 2 },
    { id: bookmarks[1].id, orderId: 1 },
  ]);
  assert.deepEqual(
    (await Bookmark.list({ orderBy: 'orderId' })).map(({ orderId }) => orderId),
    [1, 2]
  );

  await Category.deleteWithBookmarks(category.id);
  assert.equal((await Bookmark.list()).length, 0);
});

test('legacy Sequelize schemas migrate in place and retain existing rows', async (t) => {
  const { directory, storage } = temporaryDatabase();
  t.after(async () => {
    await db.closeDB();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  await createLegacyDatabase(storage);
  await db.connectDB({ storage });

  const categoryColumns = new Set(
    (await db.all('PRAGMA table_info(categories)')).map(({ name }) => name)
  );
  assert.ok(categoryColumns.has('isPublic'));
  assert.ok(categoryColumns.has('orderId'));
  assert.ok(categoryColumns.has('section'));
  assert.equal((await Category.findById(1)).name, 'Preserved category');
  assert.equal((await Bookmark.findById(1)).name, 'Preserved bookmark');
  assert.equal((await App.findById(1)).description, '');
  assert.equal((await db.get('PRAGMA user_version')).user_version, 1);
  assert.equal(
    await db.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'SequelizeMeta'"),
    undefined
  );

  const backups = fs.readdirSync(path.join(directory, 'db_backups'));
  assert.equal(backups.length, 1);
  assert.match(backups[0], /^db-[a-zA-Z0-9_-]+-backup\.sqlite$/);
});
