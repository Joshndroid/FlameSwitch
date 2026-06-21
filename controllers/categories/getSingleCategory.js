const asyncWrapper = require('../../middleware/asyncWrapper');
const ErrorResponse = require('../../utils/ErrorResponse');
const Category = require('../../models/Category');
const loadConfig = require('../../utils/loadConfig');

// @desc      Get single category
// @route     GET /api/categories/:id
// @access    Public
const getSingleCategory = asyncWrapper(async (req, res, next) => {
  const { useOrdering: orderType } = await loadConfig();

  const category = await Category.findWithBookmarks(req.params.id, {
    orderBy: orderType,
    publicOnly: !req.isAuthenticated,
  });

  if (!category) {
    return next(
      new ErrorResponse(
        `Category with id of ${req.params.id} was not found`,
        404
      )
    );
  }

  res.status(200).json({
    success: true,
    data: category,
  });
});

module.exports = getSingleCategory;
