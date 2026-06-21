const createRepository = require('./repository');
const db = require('../db');

const repository = createRepository({
  table: 'weather',
  fields: [
    'externalLastUpdate', 'tempC', 'tempF', 'isDay', 'cloud', 'conditionText',
    'conditionCode', 'humidity', 'windK', 'windM',
  ],
});

repository.latest = async () => repository.hydrate(
  await db.get('SELECT * FROM weather ORDER BY createdAt DESC, id DESC LIMIT 1')
);

repository.deleteBeforeId = (id) => db.run('DELETE FROM weather WHERE id < ?', [id]);

module.exports = repository;
