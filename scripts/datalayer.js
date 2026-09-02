/*
 * Adobe Client Data Layer wiring for the Journal (Phase 4, task E4-0).
 *
 * ARRAY-STUB SEMANTICS (docs/architecture/data-layer-dictionary.md section 0):
 * the page declares `window.adobeDataLayer = window.adobeDataLayer || []`
 * and everything below is a plain Array.prototype.push onto that stub. The
 * real @adobe/adobe-client-data-layer library is NOT vendored here; on the
 * flagship prototype it augments this same array in place, and it can do the
 * same for the Journal at deploy time without any change to these call
 * sites. Until then, the array itself is the inspectable record: data pushes
 * ({ page }, { user }) and event pushes ({ event, eventInfo }) accumulate in
 * push order.
 *
 * Produced interface (consumed by scripts.js now, by every block task later):
 *   initDataLayer(pageMeta)  seeds page + user, then fires page:loaded
 *   pushEvent(name, payload) pushes { event: name, eventInfo: payload }
 *
 * The media:* helpers land in task E4-2 alongside podcast-player and
 * video-story.
 */

/** Ensures the array stub exists and returns it. */
function stub() {
  window.adobeDataLayer = window.adobeDataLayer || [];
  return window.adobeDataLayer;
}

/**
 * Pushes an event onto the data layer.
 * @param {string} name event name, e.g. "page:loaded"
 * @param {object} payload eventInfo payload
 */
export function pushEvent(name, payload = {}) {
  stub().push({ event: name, eventInfo: payload });
}

/**
 * Computes the dictionary-conformant page object for the current document.
 * Follows the prototype's conventions (dictionary section 1.1): stable id
 * `slair:` + the URL with slashes as colons, en-US/USD defaults, and the
 * Journal's own site section. publishDate/modifyDate mirror the article's
 * authored Date metadata when present.
 * @param {object} meta values read from the rendered head by scripts.js
 */
function buildPage(meta) {
  const url = window.location.pathname.endsWith('/') || window.location.pathname.includes('.')
    ? window.location.pathname
    : `${window.location.pathname}/`;
  const date = meta.date || '';
  return {
    id: `slair:${url.replaceAll('/', ':')}`,
    pageURL: url,
    pageName: meta.pageName || document.title || 'Untitled',
    template: meta.template || 'journal',
    siteSection: 'journal',
    subSection: meta.subSection || 'journal',
    language: 'en-US',
    currency: 'USD',
    tags: meta.tags || [],
    publishDate: date,
    modifyDate: date,
  };
}

/**
 * Default anonymous user, dictionary section 1.2. The Journal has no
 * notifications drawer, so notificationCount is 0 here rather than the
 * flagship's seeded 4; every other field matches the documented fallback.
 */
const ANONYMOUS_USER = {
  authState: 'anonymous',
  loyaltyTier: null,
  hashedId: null,
  milesBalance: 0,
  notificationCount: 0,
};

/**
 * Boots the data layer for the current page: page push, user push, then the
 * page:loaded event, in that order (dictionary sections 1.1, 1.2 and 2).
 * @param {object} pageMeta { pageName, template, subSection, tags, date }
 */
export function initDataLayer(pageMeta = {}) {
  const page = buildPage(pageMeta);
  stub().push({ page });
  stub().push({ user: { ...ANONYMOUS_USER } });
  pushEvent('page:loaded', { pageName: page.pageName, template: page.template });
}
