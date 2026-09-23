import { useEffect, useState } from 'react';
import { Link } from 'react-router';

// Redux
import { useSelector } from 'react-redux';
import { State } from '../../../store/reducers';

// CSS
import classes from './Header.module.css';

// Utils
import { getDate, getTime } from './functions/getDateTime';
import { greeter } from './functions/greeter';

export const Header = (): JSX.Element => {
  const { hideHeader, hideDate, showTime } = useSelector(
    (state: State) => state.config.config
  );

  const [date, setDate] = useState<string>(getDate());
  const [time, setTime] = useState<string>(getTime());
  const [greeting, setGreeting] = useState<string>(greeter());

  useEffect(() => {
    let clockInterval: NodeJS.Timeout;

    clockInterval = setInterval(() => {
      setDate(getDate());
      setTime(getTime());
      setGreeting(greeter());
    }, 1000);

    return () => window.clearInterval(clockInterval);
  }, []);

  return (
    <header className={classes.Header}>
      {!hideDate && <p>{date}</p>}
      {!hideHeader && (
        <div className={classes.HeaderMain}>
          <h1>{greeting}</h1>
        </div>
      )}
      {showTime && <p className={classes.Time}>{time}</p>}

      <Link to="/settings" className={classes.SettingsLink}>
        Go to Settings
      </Link>
    </header>
  );
};
