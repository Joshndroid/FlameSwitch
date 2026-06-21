const asyncWrapper = require('../../middleware/asyncWrapper');
const Bookmark = require('../../models/Bookmark');
const loadConfig = require('../../utils/loadConfig');

// @desc      Get all bookmarks
// @route     GET /api/bookmarks
// @access    Public
const getAllBookmarks = asyncWrapper(async (req, res, next) => {
  const { useOrdering: orderType } = await loadConfig();

  const bookmarks = await Bookmark.list({
    orderBy: orderType,
    publicOnly: !req.isAuthenticated,
  });

  res.status(200).json({
    success: true,
    data: bookmarks,
  });
});

module.exports = getAllBookmarks;
