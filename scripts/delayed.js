/*
 * Adobe Tags (Launch) loader for the Journal.
 *
 * The flagship AEM site renders its Tags script server side, from an
 * environment variable read by TagsEmbedModel. Edge Delivery has no server
 * side render and no Cloud Manager pipeline, so nothing injects it here.
 * This module is the Journal's equivalent: the library URL is configuration
 * in head.html, not a hardcoded script tag, so moving between Launch
 * environments is a one line content change rather than a code change.
 *
 * Configuration, empty in the repository so nothing third party loads until
 * a deployment sets it:
 *   <meta name="slair-tags-library" content="https://assets.adobedtm.com/.../launch-....min.js"/>
 *
 * The URL is validated by the same rule the Java model applies, deliberately
 * kept identical so the two surfaces cannot drift: a same origin path, or an
 * https URL whose host ends .adobedtm.com. A pasted script tag, a stray
 * quote, a protocol relative URL or an unsubstituted placeholder all fail it
 * and the embed stays off, which is the safe outcome for a value that becomes
 * a script src.
 *
 * Loading happens in the delayed phase, after LCP and the lazy sections, so
 * the tag manager cannot cost the Journal its Core Web Vitals. Adobe's own
 * Edge Delivery guidance on where to load tag managers should be confirmed
 * before this pattern goes into client material: it could not be checked from
 * the build environment, which cannot reach aem.live.
 */

const META_NAME = 'slair-tags-library';
const ADOBE_HOST_SUFFIX = '.adobedtm.com';
const HTTPS = 'https://';

let loaded = false;

/**
 * A same origin path, or an https URL on an Adobe Data Collection host.
 * Nothing else may become a script src on these pages. Mirrors
 * TagsEmbedModel.isAllowed in aem/core.
 * @param {string} value the configured library URL
 * @returns {boolean} true when it is safe to load
 */
export function isAllowed(value) {
  if (!value || !value.trim()) return false;
  const candidate = value.trim();
  if (candidate.startsWith('//') || candidate.includes('"') || candidate.includes('<')) return false;
  if (candidate.startsWith('/')) return true;
  if (!candidate.toLowerCase().startsWith(HTTPS)) return false;
  const remainder = candidate.slice(HTTPS.length);
  const slash = remainder.indexOf('/');
  const host = (slash < 0 ? remainder : remainder.slice(0, slash)).toLowerCase();
  if (!host || host.includes('@')) return false;
  return host.endsWith(ADOBE_HOST_SUFFIX);
}

/**
 * Reads the configured library URL from head.html and returns it only when it
 * passes isAllowed, so callers never see a value they should not load.
 * @returns {string} the validated URL, or the empty string
 */
export function tagsLibraryUrl() {
  const content = document.head.querySelector(`meta[name="${META_NAME}"]`)?.content?.trim() || '';
  return isAllowed(content) ? content : '';
}

/**
 * Appends the Tags library once, asynchronously. Does nothing when no library
 * is configured, when the configured value fails validation, or when it has
 * already run, so a second call from a block or a test is harmless.
 * @returns {boolean} true when a script element was appended by this call
 */
export function loadTags() {
  if (loaded) return false;
  const src = tagsLibraryUrl();
  if (!src) return false;
  loaded = true;
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  document.head.append(script);
  return true;
}
