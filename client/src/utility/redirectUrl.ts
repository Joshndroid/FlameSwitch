import { urlParser } from '.';

export const redirectUrl = (url: string, sameTab: boolean) => {
  const parsedUrl = urlParser(url)[1];

  try {
    const safeUrl = new URL(parsedUrl);
    const allowedProtocols = new Set(['http:', 'https:', 'steam:']);

    if (!allowedProtocols.has(safeUrl.protocol)) {
      return;
    }

    if (sameTab) {
      document.location.assign(safeUrl.toString());
    } else {
      window.open(safeUrl.toString());
    }
  } catch {
    return;
  }
};
