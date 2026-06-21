const createRepository = require('./repository');

module.exports = createRepository({
  table: 'bookmarks',
  fields: [
    'name', 'url', 'categoryId', 'icon', 'isPublic', 'orderId', 'invertIcon',
  ],
  defaults: {
    icon: '',
    isPublic: 1,
    orderId: null,
    invertIcon: false,
  },
  booleans: ['invertIcon'],
});
