const asyncWrapper = require('../../middleware/asyncWrapper');
const loadConfig = require('../../utils/loadConfig');

const redactConfig = (config, isAuthenticated) =>
  isAuthenticated
    ? config
    : {
        ...config,
        WEATHER_API_KEY: config.WEATHER_API_KEY ? '__configured__' : '',
      };

// @desc      Get config
// @route     GET /api/config
// @access    Public
const getConfig = asyncWrapper(async (req, res, next) => {
  const config = await loadConfig();
  const responseConfig = redactConfig(config, req.isAuthenticated);

  res.status(200).json({
    success: true,
    data: responseConfig,
  });
});

module.exports = getConfig;
module.exports.redactConfig = redactConfig;
