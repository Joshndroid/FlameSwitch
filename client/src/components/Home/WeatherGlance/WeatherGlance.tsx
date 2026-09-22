import { useEffect, useState } from 'react';
import axios from 'axios';
import { Icon } from '../../UI';
import classes from './WeatherGlance.module.css';

type Reading = { value: string; unit: string; condition: string | null } | null;
type Day = { date: string; condition: string; high: number | null; low: number | null; unit: string; rainChance: number | null };
type Glance = { inside: Reading; outside: Reading; rain: Reading; shortText: string | null; forecast: Day[] };

const iconFor = (condition?: string | null) => {
  if (!condition) return 'mdiWeatherPartlyCloudy';
  if (condition === 'clear-night') return 'mdiWeatherNight';
  if (/rain|pouring|lightning/.test(condition)) return 'mdiWeatherRainy';
  if (/snow|hail/.test(condition)) return 'mdiWeatherSnowy';
  if (/sunny|clear/.test(condition)) return 'mdiWeatherSunny';
  if (/cloudy|fog/.test(condition)) return 'mdiWeatherCloudy';
  if (/wind/.test(condition)) return 'mdiWeatherWindy';
  return 'mdiWeatherPartlyCloudy';
};

export const WeatherGlance = (): JSX.Element | null => {
  const [data, setData] = useState<Glance | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = () => axios.get('/api/home-assistant/glance')
      .then(({ data }) => {
        if (active) { setData(data.data); setUnavailable(false); }
      })
      .catch(() => { if (active) { setData(null); setUnavailable(true); } });
    refresh();
    const timer = window.setInterval(refresh, 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  if (!data && !unavailable) return null;
  if (!data) return <div className={classes.Unavailable} role="status">Weather unavailable</div>;
  if (!data.inside && !data.outside && !data.rain && !data.shortText && !data.forecast.length) return null;

  return <section className={classes.Card} aria-label="Local weather">
    <div className={classes.Current}>
      <div className={classes.Mark}><Icon icon={iconFor(data.outside?.condition || data.forecast[0]?.condition)} color="var(--color-accent)" /></div>
      {data.outside ? <div className={classes.Outside}>
        <small>OUTSIDE</small>
        <strong>{data.outside.value}{data.outside.unit}</strong>
        {data.outside.condition && <span>{data.outside.condition.replaceAll('-', ' ')}</span>}
      </div> : <div className={classes.Outside}><small>LOCAL WEATHER</small></div>}
      {(data.inside || data.rain) && <div className={classes.Details}>
        {data.inside && <div><small>INSIDE</small><b>{data.inside.value}{data.inside.unit}</b></div>}
        {data.rain && <div><small>RAIN · 24H</small><b>{data.rain.value}{data.rain.unit}</b></div>}
      </div>}
    </div>
    {data.shortText && <p className={classes.Summary}>{data.shortText}</p>}
    {!!data.forecast.length && <div className={classes.Forecast} aria-label="Daily forecast">
      {data.forecast.map((day, index) => <div className={classes.Day} key={day.date}>
        <small>T+{index + 1} · {new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</small>
        <Icon icon={iconFor(day.condition)} />
        <b>{day.high == null ? '—' : `${day.high}${day.unit}`}</b>
        <span>{day.low == null ? '—' : `${day.low}${day.unit}`}</span>
        {day.rainChance != null && <small>{day.rainChance}% rain</small>}
      </div>)}
    </div>}
  </section>;
};
