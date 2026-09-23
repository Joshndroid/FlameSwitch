import { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { applyAuth } from '../../../utility';
import { Button, InputGroup, SettingsHeadline } from '../../UI';

type EntityKey = 'inside' | 'outside' | 'rain' | 'shortText' | 'forecast';
type ForecastMode = 'weather' | 'entities' | 'bom';
type Settings = {
  url: string;
  tokenConfigured: boolean;
  days: number;
  forecastMode: ForecastMode;
  forecastEntities: string[];
  bomForecastEntity: string;
  entities: Record<EntityKey, string>;
};
type Entity = { id: string; name: string; unit: string };

const empty: Settings = {
  url: '', tokenConfigured: false, days: 3, forecastMode: 'weather',
  forecastEntities: ['', '', '', '', ''],
  bomForecastEntity: '',
  entities: { inside: '', outside: '', rain: '', shortText: '', forecast: '' },
};
const fields: { key: EntityKey; label: string; hint: string }[] = [
  { key: 'outside', label: 'Outside now', hint: 'Temperature sensor or weather entity' },
  { key: 'inside', label: 'Inside now', hint: 'Indoor temperature sensor' },
  { key: 'rain', label: 'Rain in the last 24 hours', hint: '24 hour rain accumulation sensor' },
  { key: 'shortText', label: 'Short description', hint: 'For example, BOM short_text sensor' },
];

export const HomeAssistantSettings = (): JSX.Element => {
  const [settings, setSettings] = useState<Settings>(empty);
  const [token, setToken] = useState('');
  const [entities, setEntities] = useState<Entity[]>([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const loadEntities = async () => {
    try {
      const response = await axios.get('/api/home-assistant/entities', { headers: applyAuth() });
      setEntities(response.data.data);
      setMessage(`${response.data.data.length} entities available`);
    } catch {
      setMessage('Could not list entities. Check the address and token.');
    }
  };

  useEffect(() => {
    axios.get('/api/home-assistant/config', { headers: applyAuth() })
      .then(({ data }) => {
        setSettings({ ...empty, ...data.data,
          entities: { ...empty.entities, ...data.data.entities },
          forecastEntities: [...empty.forecastEntities,
            ...(data.data.forecastEntities || [])].slice(0, 5) });
        if (data.data.tokenConfigured) loadEntities();
      })
      .catch(() => setMessage('Could not load Home Assistant settings.'));
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await axios.put('/api/home-assistant/config',
        { ...settings, token }, { headers: applyAuth() });
      setSettings(response.data.data);
      setToken('');
      setMessage('Saved. The homepage will update shortly.');
      await loadEntities();
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Could not save Home Assistant settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save}>
      <SettingsHeadline text="Home Assistant weather" />
      <p>Show a small local weather glance on the homepage. Leave a source blank to hide it.</p>
      <InputGroup>
        <label htmlFor="ha-url">Home Assistant local address</label>
        <input id="ha-url" type="url" required placeholder="http://192.168.1.10:8123"
          value={settings.url} onChange={(event) => setSettings({ ...settings, url: event.target.value })} />
        <span>Use an IP address reachable from this app.</span>
      </InputGroup>
      <InputGroup>
        <label htmlFor="ha-token">Long-lived access token</label>
        <input id="ha-token" type="password" autoComplete="new-password"
          required={!settings.tokenConfigured} value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder={settings.tokenConfigured ? 'Saved — leave blank to keep it' : 'Paste token'} />
        <span>Stored on the app server. It is never sent to homepage visitors.</span>
      </InputGroup>
      <Button type="button" onClick={loadEntities} disabled={!settings.tokenConfigured}>
        Refresh entity list
      </Button>
      <datalist id="ha-entities">
        {entities.map((entity) => <option key={entity.id} value={entity.id}>
          {entity.name}{entity.unit ? ` (${entity.unit})` : ''}
        </option>)}
      </datalist>
      <datalist id="ha-weather-entities">
        {entities.filter((entity) => entity.id.startsWith('weather.'))
          .map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
      </datalist>
      <div style={{ marginTop: 24 }}>
        <SettingsHeadline text="Weather sources" />
      </div>
      {fields.map(({ key, label, hint }) => <InputGroup key={key}>
        <label htmlFor={`ha-${key}`}>{label}</label>
        <input id={`ha-${key}`} list={key === 'forecast' ? 'ha-weather-entities' : 'ha-entities'}
          placeholder={hint} value={settings.entities[key]}
          onChange={(event) => setSettings({ ...settings, entities: {
            ...settings.entities, [key]: event.target.value,
          } })} />
        <span>{hint}. Choose from the list or enter an entity ID.</span>
      </InputGroup>)}
      <div style={{ marginTop: 24 }}>
        <SettingsHeadline text="Forecast" />
      </div>
      <InputGroup>
        <label htmlFor="ha-forecast-mode">Forecast source</label>
        <select id="ha-forecast-mode" value={settings.forecastMode}
          onChange={(event) => setSettings({ ...settings,
            forecastMode: event.target.value as ForecastMode })}>
          <option value="weather">Single weather entity</option>
          <option value="entities">One entity for each day</option>
          <option value="bom">Bureau of Meteorology forecast sensors</option>
        </select>
        <span>Choose a weather entity with daily forecast support, or map each day separately.</span>
      </InputGroup>
      <InputGroup>
        <label htmlFor="ha-days">Forecast days ahead</label>
        <select id="ha-days" value={settings.days}
          onChange={(event) => setSettings({ ...settings, days: Number(event.target.value) })}>
          <option value={3}>3 days</option>
          <option value={4}>4 days</option>
          <option value={5}>5 days</option>
        </select>
      </InputGroup>
      {settings.forecastMode === 'weather' ? <InputGroup>
        <label htmlFor="ha-forecast">Daily forecast</label>
        <input id="ha-forecast" list="ha-weather-entities"
          placeholder="Weather entity supporting daily forecasts"
          value={settings.entities.forecast}
          onChange={(event) => setSettings({ ...settings, entities: {
            ...settings.entities, forecast: event.target.value,
          } })} />
        <span>Choose a weather entity that supports daily forecasts.</span>
      </InputGroup> : settings.forecastMode === 'bom' ? <InputGroup>
        <label htmlFor="ha-bom-forecast">BOM maximum temperature for tomorrow</label>
        <input id="ha-bom-forecast" list="ha-entities"
          placeholder="sensor.location_temp_max_1"
          value={settings.bomForecastEntity}
          onChange={(event) => setSettings({ ...settings,
            bomForecastEntity: event.target.value })} />
        <span>
          Select the T+1 maximum temperature entity ending in _temp_max_1.
          Matching minimum, icon descriptor and rain chance sensors are found automatically.
        </span>
      </InputGroup> : Array.from({ length: settings.days }, (_, index) =>
        <InputGroup key={index}>
          <label htmlFor={`ha-forecast-${index}`}>
            {index === 0 ? 'Tomorrow (T+1)' : `Forecast T+${index + 1}`}
          </label>
          <input id={`ha-forecast-${index}`} list="ha-entities"
            placeholder={`Entity for day ${index + 1}`}
            value={settings.forecastEntities[index] || ''}
            onChange={(event) => {
              const forecastEntities = [...settings.forecastEntities];
              forecastEntities[index] = event.target.value;
              setSettings({ ...settings, forecastEntities });
            }} />
          <span>Reads common condition, high, low, date and rain probability attributes.</span>
        </InputGroup>)}
      <Button disabled={saving}>Save weather settings</Button>
      {message && <p role="status">{message}</p>}
    </form>
  );
};
