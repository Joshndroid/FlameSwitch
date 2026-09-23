export interface GeneralForm {
  defaultSearchProvider: string;
  secondarySearchProvider: string;
  searchSameTab: boolean;
  pinAppsByDefault: boolean;
  pinCategoriesByDefault: boolean;
  useOrdering: string;
  appsSameTab: boolean;
  bookmarksSameTab: boolean;
}

export interface UISettingsForm {
  customTitle: string;
  hideHeader: boolean;
  hideApps: boolean;
  hideCategories: boolean;
  useAmericanDate: boolean;
  greetingsSchema: string;
  daySchema: string;
  monthSchema: string;
  showTime: boolean;
  hideDate: boolean;
  hideSearch: boolean;
  disableAutofocus: boolean;
  homeLayout: HomeLayout;
}

export interface DockerSettingsForm {
  dockerApps: boolean;
  dockerHost: string;
  kubernetesApps: boolean;
  unpinStoppedApps: boolean;
}

export interface ThemeSettingsForm {
  defaultTheme: string;
}

export interface AppDetailsForm {
  automaticUpdates: boolean;
  useDefaults: boolean;
  updateUrl: string;
  showPopups: boolean;
}
import { HomeLayout } from './Config';
