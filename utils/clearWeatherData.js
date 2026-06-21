const Weather = require('../models/Weather');

const clearWeatherData = async () => {
  const weather = await Weather.latest();

  if (weather) {
    await Weather.deleteBeforeId(weather.id);
  }
};

module.exports = clearWeatherData;
