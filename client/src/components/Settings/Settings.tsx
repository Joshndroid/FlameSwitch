import { NavLink, Link, Routes, Route } from 'react-router';

// Redux
import { useSelector } from 'react-redux';
import { State } from '../../store/reducers';

// CSS
import classes from './Settings.module.css';

// Components
import { Container } from '../UI';
import { GeneralSettings } from './GeneralSettings/GeneralSettings';
import { UISettings } from './UISettings/UISettings';
import { WeatherSettings } from './WeatherSettings/WeatherSettings';
import { DockerSettings } from './DockerSettings/DockerSettings';
import { Themer } from './Themer/Themer';
import { AppDetails } from './AppDetails/AppDetails';
import { AuthForm } from './AppDetails/AuthForm/AuthForm';
import { StyleSettings } from './StyleSettings/StyleSettings';

export const Settings = (): JSX.Element => {
  const { isAuthenticated } = useSelector((state: State) => state.auth);
  const navClassName = ({ isActive }: { isActive: boolean }) =>
    `${classes.SettingsNavLink} ${isActive ? classes.Active : ''}`;

  return (
    <Container>
      {!isAuthenticated ? (
        <AuthForm />
      ) : (
        <div className={classes.Settings}>
          <div className={classes.SettingsNav}>
            <h2 className={classes.SettingsNavTitle}>Settings</h2>
            <NavLink
              to="/settings/app"
              className={navClassName}
            >
              General
            </NavLink>
            <NavLink
              to="/settings/ui"
              className={navClassName}
            >
              Interface
            </NavLink>
            <NavLink
              to="/settings/weather"
              className={navClassName}
            >
              Weather
            </NavLink>
            <NavLink
              to="/settings/docker"
              className={navClassName}
            >
              Docker
            </NavLink>
            <NavLink
              to="/settings/theme"
              className={navClassName}
            >
              Theme
            </NavLink>
            <NavLink
              to="/settings/css"
              className={navClassName}
            >
              CSS
            </NavLink>
            <NavLink
              to="/settings/details"
              className={navClassName}
            >
              About
            </NavLink>
            <Link to="/" className={classes.GoBack}>
              Go back
            </Link>
          </div>
          <div className={classes.SettingsContent}>
            <Routes>
              <Route path="/app" element={<GeneralSettings />} />
              <Route path="/ui" element={<UISettings />} />
              <Route path="/weather" element={<WeatherSettings />} />
              <Route path="/docker" element={<DockerSettings />} />
              <Route path="/theme" element={<Themer />} />
	      <Route path="/css" element={<StyleSettings />} />
              <Route path="/details" element={<AppDetails />} />
            </Routes>
          </div>
        </div>
      )}
    </Container>
  );
};
