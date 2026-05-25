import axios from 'axios';
import { useState, useEffect, Fragment, useMemo } from 'react';
import { Link } from 'react-router-dom';

// Redux
import { useDispatch, useSelector } from 'react-redux';
import { State } from '../../store/reducers';
import { bindActionCreators } from 'redux';
import { actionCreators } from '../../store';

// Typescript
import { App, Category, ForecastDay, ApiResponse } from '../../interfaces';

// UI
import { Icon, Container, SectionHeadline, Spinner, Message } from '../UI';

// CSS
import classes from './Home.module.css';
import { ForecastModal } from '../Widgets/ForecastModal/ForecastModal';

// Components
import { AppGrid } from '../Apps/AppGrid/AppGrid';
import { BookmarkGrid } from '../Bookmarks/BookmarkGrid/BookmarkGrid';
import { SearchBar } from '../SearchBar/SearchBar';
import { Header } from './Header/Header';

// Utils
import { escapeRegex } from '../../utility';

export const Home = (): JSX.Element => {
  const {
    apps: { apps, loading: appsLoading },
    bookmarks: { categories, loading: bookmarksLoading },
    config: { config },
    auth: { isAuthenticated },
  } = useSelector((state: State) => state);

  // once per render
  const forecastEnabled = config?.forecastEnable !== false;

  const dispatch = useDispatch();
  const { getApps, getCategories, createNotification } = bindActionCreators(
    actionCreators,
    dispatch
  );

  // forecast
  const [isForecastOpen, setIsForecastOpen] = useState(false);
  const [forecastData, setForecastData] = useState<ForecastDay[] | null>(null);
  const [isForecastLoading, setIsForecastLoading] = useState(false);

  // Local search query
  const [localSearch, setLocalSearch] = useState<null | string>(null);
  const [appSearchResult, setAppSearchResult] = useState<null | App[]>(null);
  const [bookmarkSearchResult, setBookmarkSearchResult] = useState<
    null | Category[]
  >(null);

  const visibleApps = useMemo(
    () => apps.filter(({ isPublic }) => isPublic),
    [apps]
  );

  const visibleCategories = useMemo(
    () =>
      categories
        .filter(({ isPublic }) => isPublic)
        .map((category) => ({
          ...category,
          bookmarks: category.bookmarks.filter(({ isPublic }) => isPublic),
        })),
    [categories]
  );

  const pinnedVisibleApps = useMemo(
    () => visibleApps.filter(({ isPinned }) => isPinned),
    [visibleApps]
  );

  const pinnedVisibleCategories = useMemo(
    () =>
      visibleCategories.filter(
        ({ isPinned, bookmarks }) => isPinned && bookmarks.length
      ),
    [visibleCategories]
  );

  // Load applications
  useEffect(() => {
    if (!apps.length) {
      getApps();
    }
  }, []);

  // Load bookmark categories
  useEffect(() => {
    if (!categories.length) {
      getCategories();
    }
  }, []);

  // click2forecast
  const handleWidgetClick = async () => {
    // Hard stop if disabled
    if (!forecastEnabled) return;

    if (!config.WEATHER_API_KEY) {
      createNotification({
        title: 'Info',
        message: 'Weather API key is not configured in settings.',
      });
      return;
    }

    setIsForecastOpen(true);
    setIsForecastLoading(true);

    try {
      const params = {
        days: config.forecastDays,
        useCache: config.forecastCache,
      };
      const res = await axios.get<ApiResponse<ForecastDay[]>>(
        '/api/weather/forecast',
        { params }
      );
      setForecastData(res.data.data);
    } catch (err: any) {
      createNotification({
        title: 'Error',
        message: err.response?.data?.error || 'Failed to fetch forecast',
      });
      setIsForecastOpen(false); // Close modal on error
    } finally {
      setIsForecastLoading(false);
    }
  };

  useEffect(() => {
    if (localSearch) {
      // Search through apps
      setAppSearchResult([
        ...visibleApps.filter(({ name, description }) =>
          new RegExp(escapeRegex(localSearch), 'i').test(
            `${name} ${description}`
          )
        ),
      ]);

      // Search through bookmarks
      const bookmarks = visibleCategories
        .map(({ bookmarks }) => bookmarks)
        .flat()
        .filter(({ name }) =>
          new RegExp(escapeRegex(localSearch), 'i').test(name)
        );

      setBookmarkSearchResult([
        {
          id: -1,
          name: 'Search Results',
          isPinned: true,
          isPublic: true,
          orderId: -1,
          createdAt: new Date(),
          updatedAt: new Date(),
          bookmarks,
        },
      ]);
    } else {
      setAppSearchResult(null);
      setBookmarkSearchResult(null);
    }
  }, [localSearch, visibleApps, visibleCategories]);

  return (
    <Container>
      {/* modal => forecast enabled */}
      {forecastEnabled && isForecastOpen && (
        <ForecastModal
          data={forecastData}
          isLoading={isForecastLoading}
          onClose={() => setIsForecastOpen(false)}
	  isCelsius={config.isCelsius}
        />
      )}

      {!config.hideSearch ? (
        <SearchBar
          setLocalSearch={setLocalSearch}
          appSearchResult={appSearchResult}
          bookmarkSearchResult={bookmarkSearchResult}
        />
      ) : (
        <div></div>
      )}

      <Header
	onWidgetClick={forecastEnabled ? handleWidgetClick : undefined}
	forecastEnable={config.forecastEnable}
      />

      {!isAuthenticated &&
      !pinnedVisibleApps.length &&
      !pinnedVisibleCategories.length ? (
        <Message>
          Welcome to Flame! Go to <Link to="/settings/app">/settings</Link>,
          login and start customizing your new homepage
        </Message>
      ) : (
        <></>
      )}

      {!config.hideApps && (isAuthenticated || pinnedVisibleApps.length) ? (
        <Fragment>
          <SectionHeadline title="Applications" link="/applications" />
          {appsLoading ? (
            <Spinner />
          ) : (
            <AppGrid
              apps={
                !appSearchResult
                  ? pinnedVisibleApps
                  : appSearchResult
              }
              totalApps={visibleApps.length}
              searching={!!localSearch}
            />
          )}
          <div className={classes.HomeSpace}></div>
        </Fragment>
      ) : (
        <></>
      )}

      {!config.hideCategories &&
      (isAuthenticated || pinnedVisibleCategories.length) ? (
        <Fragment>
          <SectionHeadline title="Bookmarks" link="/bookmarks" />
          {bookmarksLoading ? (
            <Spinner />
          ) : (
            <BookmarkGrid
              categories={
                !bookmarkSearchResult
                  ? pinnedVisibleCategories
                  : bookmarkSearchResult
              }
              totalCategories={visibleCategories.length}
              searching={!!localSearch}
              fromHomepage={true}
            />
          )}
        </Fragment>
      ) : (
        <></>
      )}

      <Link to="/settings" className={classes.SettingsButton}>
        <Icon icon="mdiCog" color="var(--color-background)" />
      </Link>
    </Container>
  );
};
