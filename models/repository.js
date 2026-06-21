const db = require('../db');

const now = () => new Date().toISOString();

const createRepository = ({ table, fields, defaults = {}, booleans = [] }) => {
  const allowedFields = new Set(fields);
  const knownFields = new Set(['id', 'createdAt', 'updatedAt', ...fields]);
  const booleanFields = new Set(booleans);

  const serialize = (name, value) => {
    if (!booleanFields.has(name) || value === null) return value;
    return Number(value === true || value === 1 || value === '1' || value === 'true');
  };

  const hydrate = (row) => {
    if (!row) return null;
    const record = { ...row };
    for (const field of booleanFields) {
      if (Object.prototype.hasOwnProperty.call(record, field)) {
        record[field] = Boolean(record[field]);
      }
    }
    Object.defineProperty(record, 'update', {
      enumerable: false,
      value: (changes) => updateById(record.id, changes),
    });
    Object.defineProperty(record, 'get', {
      enumerable: false,
      value: () => ({ ...record }),
    });
    return record;
  };

  const selectFields = (attributes) => {
    if (!attributes) return '*';
    const selected = attributes.filter((field) => knownFields.has(field));
    return selected.length ? selected.join(', ') : 'id';
  };

  const orderClause = (orderBy) => {
    const fallback = knownFields.has('orderId') ? 'orderId' : 'id';
    const selected = knownFields.has(orderBy) ? orderBy : fallback;
    return selected === 'name' ? 'name COLLATE NOCASE ASC' : `${selected} ASC`;
  };

  const create = async (values) => {
    const input = { ...defaults, ...values };
    const entries = Object.entries(input).filter(
      ([name, value]) => allowedFields.has(name) && value !== undefined
    );
    const timestamp = now();
    entries.push(['createdAt', timestamp], ['updatedAt', timestamp]);
    const columns = entries.map(([name]) => name);
    const params = entries.map(([name, value]) => serialize(name, value));
    const placeholders = columns.map(() => '?').join(', ');
    const { lastID } = await db.run(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
      params
    );
    return findById(lastID);
  };

  const findById = async (id, { publicOnly = false } = {}) => {
    const row = await db.get(
      `SELECT * FROM ${table} WHERE id = ?${publicOnly ? ' AND isPublic = 1' : ''}`,
      [id]
    );
    return hydrate(row);
  };

  const list = async ({ publicOnly = false, orderBy, attributes, where = '', params = [] } = {}) => {
    const filters = [];
    if (publicOnly) filters.push('isPublic = 1');
    if (where) filters.push(where);
    const whereClause = filters.length ? ` WHERE ${filters.join(' AND ')}` : '';
    const rows = await db.all(
      `SELECT ${selectFields(attributes)} FROM ${table}${whereClause} ORDER BY ${orderClause(orderBy)}`,
      params
    );
    return rows.map(hydrate);
  };

  const updateById = async (id, changes) => {
    const entries = Object.entries(changes).filter(
      ([name, value]) => allowedFields.has(name) && value !== undefined
    );
    if (!entries.length) return findById(id);
    entries.push(['updatedAt', now()]);
    const assignments = entries.map(([name]) => `${name} = ?`).join(', ');
    const params = entries.map(([name, value]) => serialize(name, value));
    await db.run(`UPDATE ${table} SET ${assignments} WHERE id = ?`, [...params, id]);
    return findById(id);
  };

  const deleteById = (id) => db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);

  const reorder = (items) =>
    db.transaction(async () => {
      for (const { id, orderId } of items) {
        await updateById(id, { orderId });
      }
    });

  return { create, deleteById, findById, hydrate, list, reorder, updateById };
};

module.exports = createRepository;
