const express = require('express');
const axios = require('axios');
const { readFile, writeFile } = require('fs/promises');
const { isIP } = require('net');
const { join } = require('path');
const { auth, requireAuth } = require('../middleware');
const asyncWrapper = require('../middleware/asyncWrapper');
const ErrorResponse = require('../utils/ErrorResponse');

const router = express.Router();
const file = join(__dirname, '../data/home-assistant.json');
const fields = ['inside', 'outside', 'rain', 'shortText', 'forecast'];
const entityIdPattern = /^(sensor|weather)\.[a-z0-9_]+$/;
let cache = { key: '', expires: 0, data: null };

const readSettings = async () => {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
};

const isLocalUrl = (value) => {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    const parts = host.split('.').map(Number);
    const ipv4 = isIP(host) === 4 && (
      parts[0] === 10 || parts[0] === 127 ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    );
    const ipv6 = isIP(host) === 6 &&
      (host === '::1' || /^f[cd]/.test(host) || /^fe[89ab]/.test(host));
    return ['http:', 'https:'].includes(url.protocol) &&
      (ipv4 || ipv6) && !url.username && !url.password &&
      !url.search && !url.hash && (url.pathname === '/' || url.pathname === '');
  } catch {
    return false;
  }
};

const haRequest = async (settings, path, method = 'get', data) => {
  const response = await axios({
    method,
    url: `${settings.url.replace(/\/$/, '')}/api/${path}`,
    headers: { Authorization: `Bearer ${settings.token}` },
    data,
    timeout: 6000,
    maxRedirects: 0,
    proxy: false,
  });
  return response.data;
};

const entityValue = (entity) => {
  if (!entity || ['unknown', 'unavailable'].includes(entity.state)) return null;
  const attributes = entity.attributes || {};
  const value = entity.entity_id.startsWith('weather.')
    ? attributes.temperature
    : entity.state;
  if (value == null || value === '') return null;
  return {
    value: String(value),
    unit: attributes.unit_of_measurement ||
      (entity.entity_id.startsWith('weather.') ? attributes.temperature_unit || '' : ''),
    condition: entity.entity_id.startsWith('weather.') ? entity.state : null,
  };
};

const firstAttribute = (attributes, names) => {
  for (const name of names) {
    if (attributes[name] !== undefined && attributes[name] !== null && attributes[name] !== '') {
      return attributes[name];
    }
  }
  return null;
};

const numericValue = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const futureDate = (index, now = new Date()) => {
  const date = new Date(now);
  date.setDate(date.getDate() + index + 1);
  return date.toLocaleDateString('sv-SE');
};

const normalizedCondition = (value) => {
  const condition = String(value || '').toLowerCase().replace(/[\s_]+/g, '-');
  if (/storm|thunder/.test(condition)) return 'lightning-rainy';
  if (/shower|rain/.test(condition)) return 'rainy';
  if (/frost|snow/.test(condition)) return 'snowy';
  if (/dust|haze/.test(condition)) return 'fog';
  if (condition === 'mostly-sunny' || condition === 'clear') return 'sunny';
  return condition;
};

const forecastEntityDay = (entity, index, now) => {
  if (!entity || ['unknown', 'unavailable'].includes(entity.state)) return null;
  const attributes = entity.attributes || {};
  const stateNumber = numericValue(entity.state);
  const high = numericValue(firstAttribute(attributes, [
    'temperature', 'temperature_high', 'high', 'temp_high', 'temp_max',
    'max_temp', 'max_temperature',
  ])) ?? stateNumber;
  const low = numericValue(firstAttribute(attributes, [
    'templow', 'temperature_low', 'low', 'temp_low', 'temp_min',
    'min_temp', 'min_temperature',
  ]));
  const rainChance = numericValue(firstAttribute(attributes, [
    'precipitation_probability', 'probability_of_precipitation',
    'precipitation_chance', 'rain_chance', 'chance_of_rain',
  ]));
  const rawCondition = firstAttribute(attributes, [
    'condition', 'weather_condition', 'icon_descriptor',
  ]) ?? (stateNumber === null ? entity.state : '');
  const rawDate = firstAttribute(attributes, ['datetime', 'date', 'forecast_date']);
  const entityUnit = String(attributes.unit_of_measurement || '');
  const unit = String(attributes.temperature_unit ||
    (/°|celsius|fahrenheit|kelvin|^[cfk]$/i.test(entityUnit) ? entityUnit : '°'));

  return {
    date: typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(rawDate)
      ? rawDate.slice(0, 10) : futureDate(index, now),
    condition: normalizedCondition(rawCondition),
    high,
    low,
    unit,
    rainChance,
  };
};

const bomForecastDay = (byId, anchorId, index, now) => {
  const match = /^(sensor\..+)_temp_max_(\d+)$/.exec(anchorId || '');
  if (!match) return null;
  const [, prefix, firstDay] = match;
  const day = Number(firstDay) + index;
  const entity = (metric) => byId[`${prefix}_${metric}_${day}`];
  const high = entity('temp_max');
  const low = entity('temp_min');
  const condition = entity('icon_descriptor') || entity('short_text');
  const rain = entity('rain_chance');
  const source = high || low || condition || rain;
  if (!source) return null;
  const dateSource = [high, low, condition, rain]
    .find((item) => item?.attributes?.date);

  return forecastEntityDay({
    entity_id: source.entity_id,
    state: condition?.state || '',
    attributes: {
      date: dateSource?.attributes?.date,
      temperature: high?.state,
      templow: low?.state,
      condition: condition?.state,
      precipitation_probability: rain?.state,
      temperature_unit: high?.attributes?.unit_of_measurement ||
        low?.attributes?.unit_of_measurement,
    },
  }, index, now);
};

router.get('/config', auth, requireAuth, asyncWrapper(async (_req, res) => {
  const settings = await readSettings();
  res.json({ success: true, data: {
    url: settings?.url || '',
    entities: settings?.entities || {},
    days: settings?.days || 3,
    forecastMode: settings?.forecastMode || 'weather',
    forecastEntities: settings?.forecastEntities || [],
    bomForecastEntity: settings?.bomForecastEntity || '',
    tokenConfigured: !!settings?.token,
  } });
}));

router.put('/config', auth, requireAuth, asyncWrapper(async (req, res) => {
  const previous = await readSettings();
  const {
    url, token, entities, days, forecastMode = 'weather', bomForecastEntity = '',
  } = req.body;
  const forecastEntities = Array.isArray(req.body.forecastEntities)
    ? req.body.forecastEntities : [];
  if (typeof url !== 'string' || !isLocalUrl(url)) {
    throw new ErrorResponse('Enter a local IP address with http:// or https://', 400);
  }
  if (!entities || typeof entities !== 'object' || Array.isArray(entities) ||
    fields.some((field) => typeof entities[field] !== 'string' ||
      (entities[field] && !entityIdPattern.test(entities[field])))) {
    throw new ErrorResponse('Choose valid Home Assistant entity IDs', 400);
  }
  if (entities.forecast && !entities.forecast.startsWith('weather.')) {
    throw new ErrorResponse('Daily forecast must use a weather entity', 400);
  }
  if (![3, 4, 5].includes(days)) {
    throw new ErrorResponse('Choose 3, 4, or 5 forecast days', 400);
  }
  if (!['weather', 'entities', 'bom'].includes(forecastMode) ||
    forecastEntities.length > 5 ||
    forecastEntities.some((entity) => typeof entity !== 'string' ||
      (entity && !entityIdPattern.test(entity)))) {
    throw new ErrorResponse('Choose valid daily forecast entities', 400);
  }
  if (typeof bomForecastEntity !== 'string' ||
    (bomForecastEntity && !/^sensor\.[a-z0-9_]+_temp_max_\d+$/.test(bomForecastEntity))) {
    throw new ErrorResponse('Choose a BOM maximum temperature forecast entity', 400);
  }
  if (typeof token !== 'string' || token.length > 4096 ||
    (!token && !previous?.token)) {
    throw new ErrorResponse('Enter a Home Assistant long-lived access token', 400);
  }
  const next = {
    url: url.replace(/\/$/, ''),
    token: token || previous.token,
    entities,
    days,
    forecastMode,
    forecastEntities: [...forecastEntities, '', '', '', '', ''].slice(0, 5),
    bomForecastEntity,
  };
  await writeFile(file, JSON.stringify(next), { mode: 0o600 });
  cache = { key: '', expires: 0, data: null };
  res.json({ success: true, data: {
    url: next.url,
    entities,
    days,
    forecastMode,
    forecastEntities: next.forecastEntities,
    bomForecastEntity,
    tokenConfigured: true,
  } });
}));

router.get('/entities', auth, requireAuth, asyncWrapper(async (_req, res) => {
  const settings = await readSettings();
  if (!settings?.url || !settings?.token) {
    throw new ErrorResponse('Save the Home Assistant connection first', 400);
  }
  try {
    const states = await haRequest(settings, 'states');
    res.json({ success: true, data: states
      .filter(({ entity_id }) => /^(sensor|weather)\./.test(entity_id))
      .map(({ entity_id, attributes }) => ({
        id: entity_id,
        name: attributes?.friendly_name || entity_id,
        unit: attributes?.unit_of_measurement || '',
      })) });
  } catch {
    throw new ErrorResponse('Could not reach Home Assistant or list entities', 502);
  }
}));

router.get('/glance', asyncWrapper(async (_req, res) => {
  const settings = await readSettings();
  if (!settings?.url || !settings?.token ||
    (!Object.values(settings.entities || {}).some(Boolean) &&
      !settings.forecastEntities?.some(Boolean) && !settings.bomForecastEntity)) {
    return res.json({ success: true, data: null });
  }
  const key = JSON.stringify(settings);
  if (cache.key === key && cache.expires > Date.now()) {
    return res.json({ success: true, data: cache.data });
  }
  try {
    const states = await haRequest(settings, 'states');
    const byId = Object.fromEntries(states.map((state) => [state.entity_id, state]));
    const selected = (field) => byId[settings.entities[field]];
    const textEntity = selected('shortText');
    const data = {
      inside: entityValue(selected('inside')),
      outside: entityValue(selected('outside')),
      rain: entityValue(selected('rain')),
      shortText: textEntity && !['unknown', 'unavailable'].includes(textEntity.state)
        ? String(textEntity.state).slice(0, 240) : null,
      forecast: [],
    };
    if (settings.forecastMode === 'bom') {
      data.forecast = Array.from({ length: settings.days }, (_, index) =>
        bomForecastDay(byId, settings.bomForecastEntity, index))
        .filter(Boolean);
    } else if (settings.forecastMode === 'entities') {
      data.forecast = (settings.forecastEntities || [])
        .slice(0, settings.days)
        .map((entityId, index) => forecastEntityDay(byId[entityId], index))
        .filter(Boolean);
    } else if (settings.entities.forecast?.startsWith('weather.')) {
      try {
        const result = await haRequest(settings, 'services/weather/get_forecasts?return_response',
          'post', { entity_id: settings.entities.forecast, type: 'daily' });
        const forecast = result?.service_response?.[settings.entities.forecast]?.forecast || [];
        const today = new Date().toLocaleDateString('sv-SE');
        data.forecast = forecast
          .filter((day) => typeof day.datetime === 'string' && day.datetime.slice(0, 10) > today)
          .slice(0, settings.days)
          .map((day) => ({
            date: day.datetime.slice(0, 10),
            condition: day.condition || '',
            high: day.temperature ?? null,
            low: day.templow ?? null,
            unit: byId[settings.entities.forecast]?.attributes?.temperature_unit || '°',
            rainChance: day.precipitation_probability ?? null,
          }));
      } catch {
        // A weather entity without daily forecasts should not hide current readings.
      }
    }
    cache = { key, expires: Date.now() + 60000, data };
    res.json({ success: true, data });
  } catch {
    throw new ErrorResponse('Home Assistant weather is unavailable', 502);
  }
}));

module.exports = router;
module.exports.isLocalUrl = isLocalUrl;
module.exports.forecastEntityDay = forecastEntityDay;
module.exports.bomForecastDay = bomForecastDay;
