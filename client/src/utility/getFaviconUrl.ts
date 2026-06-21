/**
 * Get favicon URL via server-side proxy endpoint
 * The server fetches favicons only for configured app and bookmark origins and
 * caches them for 7 days.
 * @param url The full URL of the website
 * @returns URL to the proxied/cached favicon
 */
export const getFaviconUrl = (url: string): string => {
  try {
    // Use the server-side favicon proxy endpoint
    // This handles both local and remote URLs configured by the administrator.
    const encodedUrl = encodeURIComponent(url);
    return `/api/favicon?url=${encodedUrl}`;
  } catch (error) {
    console.error('Error creating favicon URL:', error);
    return '';
  }
};
