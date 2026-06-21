const asyncWrapper = require('../../middleware/asyncWrapper');
const ErrorResponse = require('../../utils/ErrorResponse');
const Category = require('../../models/Category');

// @desc      Delete category
// @route     DELETE /api/categories/:id
// @access    Public
const deleteCategory = asyncWrapper(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(
      new ErrorResponse(
        `Category with id of ${req.params.id} was not found`,
        404
      )
    );
  }

  await Category.deleteWithBookmarks(req.params.id);

  res.status(200).json({
    success: true,
    data: {},
  });
});

module.exports = deleteCategory;
