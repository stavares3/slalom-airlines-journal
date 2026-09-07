/*
 * Links from the Journal back into the flagship site. One environment-specific
 * value: window.SLAIR_SITE_URL, the site's language root (for example
 * https://www.example.com/content/slalomair/us/en, or the dispatcher-shortened
 * origin), set in a deployed head.html before scripts.js. Without it the local
 * AEM author is assumed, where pages want wcmmode=disabled to render as a
 * visitor sees them.
 */
const DEFAULT_ROOT = 'http://localhost:4502/content/slalomair/us/en';

export function siteRoot() {
  return (window.SLAIR_SITE_URL || DEFAULT_ROOT).replace(/\/$/, '');
}

/**
 * Builds a site page URL. `path` is the prototype-style page path ("/book",
 * "" for the home page); `params` become the query string.
 */
export function siteUrl(path = '', params = {}) {
  const root = siteRoot();
  const query = new URLSearchParams(params);
  if (root.includes('localhost:4502')) query.set('wcmmode', 'disabled');
  const q = query.toString();
  return `${root}${path}.html${q ? `?${q}` : ''}`;
}
