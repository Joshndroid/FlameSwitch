const asyncWrapper = require('../../middleware/asyncWrapper');
const Category = require('../../models/Category');
const loadConfig = require('../../utils/loadConfig');

// @desc      Get all categories
// @route     GET /api/categories
// @access    Public
const getAllCategories = asyncWrapper(async (req, res, next) => {
  const { useOrdering: orderType } = await loadConfig();

  const output = await Category.listWithBookmarks({
    orderBy: orderType,
    publicOnly: !req.isAuthenticated,
  });

  res.status(200).json({
    success: true,
    data: output,
  });
});

module.exports = getAllCategories;
