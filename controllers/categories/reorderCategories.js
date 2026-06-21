const asyncWrapper = require('../../middleware/asyncWrapper');
const Category = require('../../models/Category');

// @desc      Reorder categories
// @route     PUT /api/categories/0/reorder
// @access    Public
const reorderCategories = asyncWrapper(async (req, res, next) => {
  await Category.reorder(req.body.categories);

  res.status(200).json({
    success: true,
    data: {},
  });
});

module.exports = reorderCategories;
