const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isLocalUrl, forecastEntityDay, bomForecastDay, historyPoints, fuelPriceChange,
} = require('../routes/homeAssistant');

test('Home Assistant address must be a local IP without redirects or URL extras', () => {
  assert.equal(isLocalUrl('http://192.168.1.5:8123'), true);
  assert.equal(isLocalUrl('http://10.0.0.2'), true);
  assert.equal(isLocalUrl('http://172.31.0.2'), true);
  assert.equal(isLocalUrl('http://[fd00::5]:8123'), true);
  assert.equal(isLocalUrl('http://8.8.8.8:8123'), false);
  assert.equal(isLocalUrl('http://169.254.169.254'), false);
  assert.equal(isLocalUrl('https://example.com'), false);
  assert.equal(isLocalUrl('http://192.168.1.5:8123/api'), false);
  assert.equal(isLocalUrl('http://user:password@192.168.1.5'), false);
});

test('daily forecast entities support standard Home Assistant attributes', () => {
  const day = forecastEntityDay({
    entity_id: 'sensor.tomorrow_forecast',
    state: 'Partly Cloudy',
    attributes: {
      datetime: '2026-09-24T00:00:00+10:00',
      temperature: '24.5',
      templow: 13,
      precipitation_probability: '40',
      temperature_unit: '°C',
    },
  }, 0);

  assert.deepEqual(day, {
    date: '2026-09-24',
    condition: 'partly-cloudy',
    high: 24.5,
    low: 13,
    unit: '°C',
    rainChance: 40,
  });
});

test('daily forecast entities support common sensor aliases and numeric state', () => {
  const day = forecastEntityDay({
    entity_id: 'sensor.forecast_day_2',
    state: '27',
    attributes: {
      forecast_date: '2026-09-25',
      temp_min: '16',
      icon_descriptor: 'Mostly Sunny',
      chance_of_rain: 5,
      unit_of_measurement: '°C',
    },
  }, 1);

  assert.equal(day.date, '2026-09-25');
  assert.equal(day.condition, 'sunny');
  assert.equal(day.high, 27);
  assert.equal(day.low, 16);
  assert.equal(day.rainChance, 5);
  assert.equal(day.unit, '°C');
});

test('BOM forecast sensors are combined by metric and day suffix', () => {
  const byId = {
    'sensor.sydney_temp_max_1': {
      entity_id: 'sensor.sydney_temp_max_1', state: '29',
      attributes: { date: '2026-09-24T00:00:00+10:00', unit_of_measurement: '°C' },
    },
    'sensor.sydney_temp_min_1': {
      entity_id: 'sensor.sydney_temp_min_1', state: '18', attributes: {},
    },
    'sensor.sydney_icon_descriptor_1': {
      entity_id: 'sensor.sydney_icon_descriptor_1', state: 'Showers', attributes: {},
    },
    'sensor.sydney_rain_chance_1': {
      entity_id: 'sensor.sydney_rain_chance_1', state: '60', attributes: {},
    },
  };

  assert.deepEqual(bomForecastDay(byId, 'sensor.sydney_temp_max_1', 0), {
    date: '2026-09-24',
    condition: 'rainy',
    high: 29,
    low: 18,
    unit: '°C',
    rainChance: 60,
  });
});

test('fuel history keeps numeric readings for the selected entity', () => {
  const history = [[
    { entity_id: 'sensor.e10_price', state: '179.9', last_changed: '2026-09-22T00:00:00Z' },
    { entity_id: 'sensor.e10_price', state: 'unknown', last_changed: '2026-09-22T01:00:00Z' },
    { entity_id: 'sensor.e10_price', state: '181.5', last_updated: '2026-09-23T00:00:00Z' },
  ]];

  assert.deepEqual(historyPoints(history, 'sensor.e10_price'), [
    { value: 179.9, time: '2026-09-22T00:00:00Z' },
    { value: 181.5, time: '2026-09-23T00:00:00Z' },
  ]);
});

test('fuel trend compares the current price with the last different reading', () => {
  const points = [
    { value: 175.9, time: '2026-09-21T00:00:00Z' },
    { value: 181.5, time: '2026-09-22T00:00:00Z' },
    { value: 181.5, time: '2026-09-23T00:00:00Z' },
  ];

  assert.ok(Math.abs(fuelPriceChange(points, 181.5) - 5.6) < 0.0001);
  assert.equal(fuelPriceChange([], 181.5), null);
});
