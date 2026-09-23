import { parseTime } from '../../../../utility';

export const getDate = (): string => {
  const days = localStorage.getItem('daySchema')?.split(';') || [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  const months = localStorage.getItem('monthSchema')?.split(';') || [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const now = new Date();

  const useAmericanDate = localStorage.useAmericanDate === 'true';
  if (!useAmericanDate) {
    return `${days[now.getDay()]}, ${now.getDate()} ${
      months[now.getMonth()]
    } ${now.getFullYear()}`;
  }

  return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()} ${
    now.getFullYear()
  }`;
};

export const getTime = (): string => {
  const now = new Date();
  return `${parseTime(now.getHours())}:${parseTime(now.getMinutes())}:${parseTime(
    now.getSeconds()
  )}`;
};
