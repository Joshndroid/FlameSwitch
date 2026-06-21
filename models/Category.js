const createRepository = require('./repository');
const Bookmark = require('./Bookmark');
const db = require('../db');

const repository = createRepository({
  table: 'categories',
  fields: ['name', 'isPinned', 'orderId', 'isPublic', 'section'],
  defaults: {
    isPinned: false,
    orderId: null,
    isPublic: 1,
    section: 'bookmarks',
  },
  booleans: ['isPinned'],
});

const withBookmarks = async (categories, { publicOnly = false, orderBy } = {}) => {
  const bookmarks = await Bookmark.list({ publicOnly, orderBy });
  return categories.map((category) => {
    category.bookmarks = bookmarks.filter((bookmark) => bookmark.categoryId === category.id);
    return category;
  });
};

repository.listWithBookmarks = async ({ publicOnly = false, orderBy } = {}) => {
  const categories = await repository.list({
    publicOnly,
    orderBy,
    where: "section = 'bookmarks' OR section IS NULL",
  });
  return withBookmarks(categories, { publicOnly, orderBy });
};

repository.findWithBookmarks = async (id, { publicOnly = false, orderBy } = {}) => {
  const category = await repository.findById(id, { publicOnly });
  if (!category) return null;
  return (await withBookmarks([category], { publicOnly, orderBy }))[0];
};

repository.deleteWithBookmarks = (id) =>
  db.transaction(async () => {
    await db.run('DELETE FROM bookmarks WHERE categoryId = ?', [id]);
    await repository.deleteById(id);
  });

module.exports = repository;
