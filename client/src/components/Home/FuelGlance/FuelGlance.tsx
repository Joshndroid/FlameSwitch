import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { WidgetDensity } from '../../../interfaces';
import { loadWidgetCache, saveWidgetCache } from '../../../utility/widgetCache';
import { Icon } from '../../UI';
import classes from './FuelGlance.module.css';

type HistoryPoint = { value: number; time: string };
type FuelSource = {
  name: string;
  price: number;
  unit: string;
  station: string;
  change: number | null;
  history: HistoryPoint[];
};
type FuelData = { showGraph: boolean; sources: FuelSource[]; stale?: boolean };
type Props = { density?: WidgetDensity };

const graphSize = { width: 360, height: 72, inset: 4 };

const priceText = (price: number) => price.toLocaleString(undefined, {
  minimumFractionDigits: Number.isInteger(price) ? 0 : 1,
  maximumFractionDigits: 1,
});

export const FuelGlance = ({ density = 'comfortable' }: Props): JSX.Element | null => {
  const [data, setData] = useState<FuelData | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    axios.get('/api/home-assistant/fuel-glance')
      .then(({ data: response }) => {
        if (response.data && !response.data.stale) {
          saveWidgetCache('fuel', response.data);
        }
        if (active) { setData(response.data); setUnavailable(false); }
      })
      .catch(() => {
        if (!active) return;
        const cached = loadWidgetCache<FuelData>('fuel');
        setData(cached ? { ...cached, stale: true } : null);
        setUnavailable(!cached);
      });
    return () => { active = false; };
  }, []);

  const graph = useMemo(() => {
    if (!data?.showGraph) return [];
    const points = data.sources.flatMap(({ history }) => history);
    if (!points.length) return [];
    const values = points.map(({ value }) => value);
    const times = points.map(({ time }) => new Date(time).getTime()).filter(Number.isFinite);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const valueRange = maxValue - minValue || 1;
    const timeRange = maxTime - minTime || 1;
    return data.sources.map(({ history }) => history.map(({ value, time }) => {
      const timestamp = new Date(time).getTime();
      const x = graphSize.inset + ((timestamp - minTime) / timeRange) *
        (graphSize.width - graphSize.inset * 2);
      const y = graphSize.height - graphSize.inset - ((value - minValue) / valueRange) *
        (graphSize.height - graphSize.inset * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ')).filter(Boolean);
  }, [data]);

  if (!data && !unavailable) return null;
  if (!data) return unavailable
    ? <div className={classes.Unavailable} role="status">Fuel prices unavailable</div>
    : null;

  return <section className={`${classes.Glance} ${density === 'compact' ? classes.Compact : ''}`}
    aria-label="Fuel prices">
    <div className={classes.Heading}>
      <Icon icon="mdiGasStation" color="var(--color-accent)" />
      <small>FUEL GLANCE</small>
      {data.stale && <small className={classes.Status}>CACHED</small>}
    </div>
    <div className={classes.Prices}>
      {data.sources.map((source, index) => <div className={classes.Price} key={`${source.name}-${index}`}>
        <span className={`${classes.Swatch} ${classes[`Series${index}`]}`} aria-hidden="true"></span>
        <small>{source.name.toUpperCase()}</small>
        <strong>{priceText(source.price)}<span>{source.unit}</span></strong>
        {source.change != null && source.change !== 0 && <span
          className={`${classes.Trend} ${source.change > 0 ? classes.TrendUp : classes.TrendDown}`}
          aria-label={`${source.change > 0 ? 'Up' : 'Down'} ${priceText(Math.abs(source.change))} ${source.unit}`}>
          {source.change > 0 ? '↑' : '↓'} {priceText(Math.abs(source.change))}
        </span>}
        {source.station && <span className={classes.Station}>{source.station}</span>}
      </div>)}
    </div>
    {!!graph.length && <div className={classes.Graph}>
      <svg viewBox={`0 0 ${graphSize.width} ${graphSize.height}`}
        role="img" aria-label="Fuel price history over the last seven days"
        preserveAspectRatio="none">
        <line className={classes.Baseline} x1="0" y1={graphSize.height - 1}
          x2={graphSize.width} y2={graphSize.height - 1} />
        {graph.map((points, index) => <polyline key={index} points={points}
          className={`${classes.Series} ${classes[`Series${index}`]}`} />)}
      </svg>
      <div><small>7 DAYS AGO</small><small>NOW</small></div>
    </div>}
  </section>;
};
