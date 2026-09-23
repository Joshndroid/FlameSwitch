import { useSelector } from 'react-redux';
import { WidgetDensity, WidgetOrder } from '../../../interfaces';
import { State } from '../../../store/reducers';
import { FuelGlance } from '../FuelGlance/FuelGlance';
import { WeatherGlance } from '../WeatherGlance/WeatherGlance';
import classes from './InformationWidgets.module.css';

type Preferences = {
  showWeatherWidget: boolean;
  showFuelWidget: boolean;
  widgetOrder: WidgetOrder;
  widgetDensity: WidgetDensity;
};

type Props = { preferences?: Preferences };

export const InformationWidgets = ({ preferences }: Props): JSX.Element | null => {
  const config = useSelector((state: State) => state.config.config);
  const showWeather = preferences?.showWeatherWidget ?? (config.showWeatherWidget !== false);
  const showFuel = preferences?.showFuelWidget ?? (config.showFuelWidget !== false);
  const order = preferences?.widgetOrder || config.widgetOrder || 'weather-first';
  const density = preferences?.widgetDensity || config.widgetDensity || 'comfortable';
  const widgets = [
    showWeather
      ? { id: 'weather', element: <WeatherGlance density={density} /> } : null,
    showFuel
      ? { id: 'fuel', element: <FuelGlance density={density} /> } : null,
  ].filter(Boolean) as { id: string; element: JSX.Element }[];

  if (order === 'fuel-first') widgets.reverse();
  if (!widgets.length) return null;

  return <div className={`${classes.Widgets} ${density === 'compact' ? classes.Compact : ''}`}
    aria-label="Information widgets">
    {widgets.map(({ id, element }) => <div key={id}>{element}</div>)}
  </div>;
};
