import {
  DockerSettingsForm,
  UISettingsForm,
  GeneralForm,
  ThemeSettingsForm,
} from '../interfaces';

export type ConfigFormData =
  | GeneralForm
  | DockerSettingsForm
  | UISettingsForm
  | ThemeSettingsForm;
