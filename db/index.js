const path = require('path');
const sqlite3 = require('sqlite3');
const backupDB = require('./utils/backupDb');
const initializeSchema = require('./schema');
const Logger = require('../utils/Logger');

const logger = new Logger();
let database;
let storagePath;
let transactionQueue = Promise.resolve();

const resolveStoragePath = (storage = process.env.DB_PATH || 'data/db.sqlite') =>
  path.resolve(storage);

const open = (storage) =>
  new Promise((resolve, reject) => {
    const connection = new sqlite3.Database(storage, (error) => {
      if (error) reject(error);
      else resolve(connection);
    });
  });

const requireDatabase = () => {
  if (!database) throw new Error('Database has not been connected');
  return database;
};

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    requireDatabase().run(sql, params, function onRun(error) {
      if (error) reject(error);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    requireDatabase().get(sql, params, (error, row) => {
      if (error) reject(error);
      else resolve(row);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    requireDatabase().all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });

const exec = (sql) =>
  new Promise((resolve, reject) => {
    requireDatabase().exec(sql, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });

const transaction = (work) => {
  const execute = async () => {
    await run('BEGIN IMMEDIATE');
    try {
      const result = await work();
      await run('COMMIT');
      return result;
    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }
  };

  const queued = transactionQueue.then(execute, execute);
  transactionQueue = queued.catch(() => {});
  return queued;
};

const closeDB = async () => {
  if (!database) return;
  const connection = database;
  database = undefined;
  storagePath = undefined;
  transactionQueue = Promise.resolve();
  await new Promise((resolve, reject) => {
    connection.close((error) => (error ? reject(error) : resolve()));
  });
};

const connectDB = async ({ storage, backup = true } = {}) => {
  try {
    if (database) await closeDB();
    storagePath = resolveStoragePath(storage);
    if (backup) backupDB(storagePath);
    database = await open(storagePath);
    await exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
    await transaction(() => initializeSchema({ all, exec, run }));
    logger.log(`Connected to SQLite database at ${storagePath}`);
  } catch (error) {
    if (database) await closeDB().catch(() => {});
    logger.log(`Unable to connect to the database: ${error.message}`, 'ERROR');
    throw error;
  }
};

module.exports = {
  all,
  closeDB,
  connectDB,
  exec,
  get,
  run,
  transaction,
};
