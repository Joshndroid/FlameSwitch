const asyncWrapper = require('../../middleware/asyncWrapper');
const loadConfig = require('../../utils/loadConfig');
const { withoutWeatherConfig } = loadConfig;
const { writeFile } = require('fs/promises');

// @desc      Update config
// @route     PUT /api/config/
// @access    Public
const updateConfig = asyncWrapper(async (req, res, next) => {
  const existingConfig = await loadConfig();
  const updates = withoutWeatherConfig(req.body);

  const newConfig = {
    ...existingConfig,
    ...updates,
  };

  await writeFile('data/config.json', JSON.stringify(newConfig));

  res.status(200).send({
    success: true,
    data: newConfig,
  });
});

module.exports = updateConfig;
