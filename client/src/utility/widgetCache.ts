type WidgetCache<T> = {
  savedAt: number;
  data: T;
};

const prefix = 'flame-information-widget:';

export const saveWidgetCache = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(`${prefix}${key}`, JSON.stringify({
      savedAt: Date.now(),
      data,
    } satisfies WidgetCache<T>));
  } catch {
    // Storage can be disabled without preventing the live widget from working.
  }
};

export const loadWidgetCache = <T>(key: string): T | null => {
  try {
    const cached = JSON.parse(localStorage.getItem(`${prefix}${key}`) || 'null') as
      WidgetCache<T> | null;
    return cached?.data || null;
  } catch {
    return null;
  }
};
