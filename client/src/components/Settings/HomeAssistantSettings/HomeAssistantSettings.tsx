import { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { applyAuth } from '../../../utility';
import { Button, InputGroup, SettingsHeadline } from '../../UI';

type EntityKey = 'inside' | 'outside' | 'rain' | 'shortText' | 'forecast';
type ForecastMode = 'weather' | 'entities' | 'bom';
type FuelSource = { name: string; priceEntity: string; stationEntity: string };
type Settings = {
  url: string;
  tokenConfigured: boolean;
  days: number;
  forecastMode: ForecastMode;
  forecastEntities: string[];
  bomForecastEntity: string;
  entities: Record<EntityKey, string>;
  fuel: { showGraph: boolean; sources: FuelSource[] };
};
type Entity = { id: string; name: string; unit: string };

const empty: Settings = {
  url: '', tokenConfigured: false, days: 3, forecastMode: 'weather',
  forecastEntities: ['', '', '', '', ''],
  bomForecastEntity: '',
  entities: { inside: '', outside: '', rain: '', shortText: '', forecast: '' },
  fuel: {
    showGraph: false,
    sources: [
      { name: 'Unleaded', priceEntity: '', stationEntity: '' },
      { name: 'Premium', priceEntity: '', stationEntity: '' },
      { name: 'Diesel', priceEntity: '', stationEntity: '' },
    ],
  },
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
            ...(data.data.forecastEntities || [])].slice(0, 5),
          fuel: {
            ...empty.fuel,
            ...(data.data.fuel || {}),
            sources: empty.fuel.sources.map((fallback, index) => ({
              ...fallback,
              ...(data.data.fuel?.sources?.[index] || {}),
            })),
          },
        });
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
      setMessage('Saved. Refresh the homepage or open a new tab to load fresh data.');
      await loadEntities();
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Could not save Home Assistant settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save}>
      <SettingsHeadline text="Home Assistant" />
      <p>Connect weather and fuel information widgets to your local Home Assistant.</p>
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
      <div style={{ marginTop: 24 }}>
        <SettingsHeadline text="Fuel glance" />
      </div>
      <p>
        Add up to three Home Assistant fuel price sensors. Each configured fuel appears as a
        compact, read-only homepage panel.
      </p>
      <InputGroup>
        <label htmlFor="ha-fuel-graph">Show seven-day price graph</label>
        <select id="ha-fuel-graph" value={settings.fuel.showGraph ? 1 : 0}
          onChange={(event) => setSettings({ ...settings, fuel: {
            ...settings.fuel, showGraph: event.target.value === '1',
          } })}>
          <option value={1}>True</option>
          <option value={0}>False</option>
        </select>
        <span>The graph is fetched once and shares the five-minute Home Assistant cache policy.</span>
      </InputGroup>
      {settings.fuel.sources.map((source, index) => <div key={index}>
        <InputGroup>
          <label htmlFor={`ha-fuel-name-${index}`}>Fuel {index + 1} label</label>
          <input id={`ha-fuel-name-${index}`} maxLength={40}
            placeholder={empty.fuel.sources[index].name} value={source.name}
            onChange={(event) => {
              const sources = [...settings.fuel.sources];
              sources[index] = { ...source, name: event.target.value };
              setSettings({ ...settings, fuel: { ...settings.fuel, sources } });
            }} />
        </InputGroup>
        <InputGroup>
          <label htmlFor={`ha-fuel-price-${index}`}>Fuel {index + 1} cheapest price</label>
          <input id={`ha-fuel-price-${index}`} list="ha-entities"
            placeholder="sensor.cheapest_fuel_price" value={source.priceEntity}
            onChange={(event) => {
              const sources = [...settings.fuel.sources];
              sources[index] = { ...source, priceEntity: event.target.value };
              setSettings({ ...settings, fuel: { ...settings.fuel, sources } });
            }} />
          <span>Leave this blank to hide this fuel.</span>
        </InputGroup>
        <InputGroup>
          <label htmlFor={`ha-fuel-station-${index}`}>Fuel {index + 1} cheapest station</label>
          <input id={`ha-fuel-station-${index}`} list="ha-entities"
            placeholder="sensor.cheapest_fuel_station" value={source.stationEntity}
            onChange={(event) => {
              const sources = [...settings.fuel.sources];
              sources[index] = { ...source, stationEntity: event.target.value };
              setSettings({ ...settings, fuel: { ...settings.fuel, sources } });
            }} />
          <span>Optional. Station attributes on the price sensor are also supported.</span>
        </InputGroup>
      </div>)}
      <Button disabled={saving}>Save Home Assistant settings</Button>
      {message && <p role="status">{message}</p>}
    </form>
  );
};
