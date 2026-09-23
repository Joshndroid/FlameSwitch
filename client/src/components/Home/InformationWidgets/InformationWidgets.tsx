import { useSelector } from 'react-redux';
import { State } from '../../../store/reducers';
import { FuelGlance } from '../FuelGlance/FuelGlance';
import { WeatherGlance } from '../WeatherGlance/WeatherGlance';
import classes from './InformationWidgets.module.css';

export const InformationWidgets = (): JSX.Element | null => {
  const config = useSelector((state: State) => state.config.config);
  const widgets = [
    config.showWeatherWidget !== false
      ? { id: 'weather', element: <WeatherGlance /> } : null,
    config.showFuelWidget !== false
      ? { id: 'fuel', element: <FuelGlance /> } : null,
  ].filter(Boolean) as { id: string; element: JSX.Element }[];

  if (config.widgetOrder === 'fuel-first') widgets.reverse();
  if (!widgets.length) return null;

  return <div className={classes.Widgets} aria-label="Information widgets">
    {widgets.map(({ id, element }) => <div key={id}>{element}</div>)}
  </div>;
};
