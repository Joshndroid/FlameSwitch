const createRepository = require('./repository');

module.exports = createRepository({
  table: 'apps',
  fields: [
    'name', 'url', 'icon', 'isPinned', 'orderId', 'isPublic', 'description', 'invertIcon',
  ],
  defaults: {
    icon: 'cancel',
    isPinned: false,
    orderId: null,
    isPublic: 1,
    description: '',
    invertIcon: false,
  },
  booleans: ['isPinned', 'invertIcon'],
});
