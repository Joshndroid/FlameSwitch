const currentColumns = {
  apps: {
    isPublic: 'INTEGER DEFAULT 1',
    description: "TEXT NOT NULL DEFAULT ''",
    invertIcon: 'INTEGER NOT NULL DEFAULT 0',
  },
  bookmarks: {
    isPublic: 'INTEGER DEFAULT 1',
    orderId: 'INTEGER DEFAULT NULL',
    invertIcon: 'INTEGER NOT NULL DEFAULT 0',
  },
  categories: {
    orderId: 'INTEGER DEFAULT NULL',
    isPublic: 'INTEGER DEFAULT 1',
    section: "TEXT DEFAULT 'bookmarks'",
  },
  weather: {
    humidity: 'INTEGER',
    windK: 'REAL',
    windM: 'REAL',
  },
};

const ensureColumns = async ({ all, run }) => {
  for (const [table, columns] of Object.entries(currentColumns)) {
    const existing = new Set((await all(`PRAGMA table_info(${table})`)).map(({ name }) => name));
    for (const [name, definition] of Object.entries(columns)) {
      if (!existing.has(name)) {
        await run(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
      }
    }
  }
};

module.exports = async ({ all, exec, run }) => {
  await exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      isPinned INTEGER NOT NULL DEFAULT 0,
      orderId INTEGER DEFAULT NULL,
      isPublic INTEGER DEFAULT 1,
      section TEXT DEFAULT 'bookmarks',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      categoryId INTEGER NOT NULL,
      icon TEXT DEFAULT '',
      isPublic INTEGER DEFAULT 1,
      orderId INTEGER DEFAULT NULL,
      invertIcon INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS apps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'cancel',
      isPinned INTEGER NOT NULL DEFAULT 0,
      orderId INTEGER DEFAULT NULL,
      isPublic INTEGER DEFAULT 1,
      description TEXT NOT NULL DEFAULT '',
      invertIcon INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weather (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      externalLastUpdate TEXT,
      tempC REAL,
      tempF REAL,
      isDay INTEGER,
      cloud INTEGER,
      conditionText TEXT,
      conditionCode INTEGER,
      humidity INTEGER,
      windK REAL,
      windM REAL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS bookmarks_category_id ON bookmarks(categoryId);
  `);

  await ensureColumns({ all, run });
  await run('DROP TABLE IF EXISTS SequelizeMeta');
  await run('PRAGMA user_version = 1');
};
