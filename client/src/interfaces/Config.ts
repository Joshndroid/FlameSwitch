export type HomeLayout = 'balanced' | 'stacked' | 'centered';
export type ContentLayout = 'relaxed' | 'balanced' | 'compact';

export interface Config {
  customTitle: string;
  pinAppsByDefault: boolean;
  pinCategoriesByDefault: boolean;
  hideHeader: boolean;
  useOrdering: string;
  appsSameTab: boolean;
  bookmarksSameTab: boolean;
  searchSameTab: boolean;
  hideApps: boolean;
  hideCategories: boolean;
  hideSearch: boolean;
  defaultSearchProvider: string;
  secondarySearchProvider: string;
  dockerApps: boolean;
  dockerHost: string;
  kubernetesApps: boolean;
  unpinStoppedApps: boolean;
  useAmericanDate: boolean;
  disableAutofocus: boolean;
  greetingsSchema: string;
  daySchema: string;
  monthSchema: string;
  showTime: boolean;
  defaultTheme: string;
  isKilometer: boolean;
  hideDate: boolean;
  homeLayout: HomeLayout;
  contentLayout: ContentLayout;
  automaticUpdates?: boolean;
  useDefaults?: boolean;
  updateUrl?: string;
  showPopups?: boolean;
}
