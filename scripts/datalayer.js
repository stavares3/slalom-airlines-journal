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
 * The media:* helper (task E4-2) is attachMediaTracking below, consumed by
 * the podcast-player and video-story blocks.
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

/**
 * Registers a decorated block with the data layer: a component entry in the
 * dictionary section 1.6 map shape, then the paired cmp:show event. The
 * flagship prototype defers this pair behind a 40 percent
 * IntersectionObserver; the Journal pushes at decoration time instead (its
 * blocks already decorate lazily, section by section, and it has no
 * below-the-fold rails worth gating). Documented in the dictionary's Journal
 * appendix, section 1.1a. Every Journal block calls this, header and footer
 * included, so each block registers exactly once per page view.
 * @param {Element} element the block element; gains the id (defaults to type)
 *   and the data-cmp marker, mirroring the flagship's markup convention
 * @param {string} type the block name, e.g. "hero"
 * @param {string} title human label for this component instance
 */
export function registerComponent(element, type, title = '') {
  if (!element.id) element.id = type;
  element.dataset.cmp = type;
  if (title) element.dataset.cmpTitle = title;
  const { id } = element;
  stub().push({
    component: {
      [id]: { '@type': `slalomair/components/${type}`, title },
    },
  });
  pushEvent('cmp:show', { id, type });
}

/* ------------------------------------------------------------------ */
/* media:* events (task E4-2, dictionary section 2 Journal rows)       */
/* ------------------------------------------------------------------ */

/** Progress milestones, in percent of duration, each fired at most once. */
const MILESTONES = [25, 50, 75];

/**
 * Wires the four Journal media events onto an audio or video element.
 * Contract (dictionary section 2, Journal-only rows):
 *   media:start     first successful playback start, once per page view
 *   media:pause     visitor pauses playback (never the automatic pause the
 *                   browser fires at the end of the media; that moment
 *                   belongs to media:complete)
 *   media:progress  the playhead crosses 25, 50, 75 percent of duration,
 *                   each milestone once per page view, whether reached by
 *                   playback or by seeking; payload adds { milestone }
 *   media:complete  playback reaches the end, once per page view
 * Every payload carries { mediaType, mediaId, title, duration, position }
 * with duration and position in whole seconds.
 *
 * mediaId is the host article's slug: the Journal's media is one piece per
 * article document, so the document name is the media identity even when
 * the underlying file is shared footage (see eds-blog/README.md).
 *
 * @param {HTMLMediaElement} media the audio or video element
 * @param {object} info { mediaType: "audio"|"video", mediaId, title }
 */
export function attachMediaTracking(media, { mediaType, mediaId, title }) {
  const fired = new Set();
  const seconds = (value) => (Number.isFinite(value) ? Math.round(value) : 0);
  const payload = (position) => ({
    mediaType,
    mediaId,
    title,
    duration: seconds(media.duration),
    position: seconds(position),
  });

  media.addEventListener('playing', () => {
    if (fired.has('start')) return;
    fired.add('start');
    pushEvent('media:start', payload(media.currentTime));
  });

  media.addEventListener('pause', () => {
    if (media.ended) return;
    pushEvent('media:pause', payload(media.currentTime));
  });

  media.addEventListener('timeupdate', () => {
    if (!Number.isFinite(media.duration) || media.duration <= 0) return;
    const pct = (media.currentTime / media.duration) * 100;
    MILESTONES.forEach((milestone) => {
      if (pct >= milestone && !fired.has(milestone)) {
        fired.add(milestone);
        pushEvent('media:progress', { ...payload(media.currentTime), milestone });
      }
    });
  });

  media.addEventListener('ended', () => {
    if (fired.has('complete')) return;
    fired.add('complete');
    pushEvent('media:complete', payload(media.duration));
  });
}
