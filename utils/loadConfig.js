const { readFile } = require('fs/promises');
const checkFileExists = require('../utils/checkFileExists');
const initConfig = require('../utils/init/initConfig');

const legacyWeatherKeys = new Set([
  'WEATHER_API_KEY', 'lat', 'long', 'isCelsius', 'weatherData',
  'weatherMode', 'weatherWidgetIcon', 'showExtraWeatherColumn',
  'extraWeatherTop', 'extraWeatherBottom', 'forecastEnable',
  'forecastDays', 'forecastCache',
]);

const withoutWeatherConfig = (config) =>
  Object.fromEntries(
    Object.entries(config).filter(([key]) => !legacyWeatherKeys.has(key))
  );

const loadConfig = async () => {
  const configExists = await checkFileExists('data/config.json');

  if (!configExists) {
    await initConfig();
  }

  const config = await readFile('data/config.json', 'utf-8');
  const parsedConfig = JSON.parse(config);

  return withoutWeatherConfig(parsedConfig);
};

module.exports = loadConfig;
module.exports.withoutWeatherConfig = withoutWeatherConfig;
