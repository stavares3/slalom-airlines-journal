/*
 * Journal boot, modeled on adobe/aem-boilerplate scripts/scripts.js
 * (revision d75bfd2cf0d91284b1e26c65e15cdf46820d6a4b): decorateMain plus the
 * loadEager / loadLazy / loadDelayed phases. Local deviations, on purpose:
 *  - no Content-Security-Policy meta and no trusted-types bootstrap: the
 *    boilerplate pair (CSP meta + default policy shim) exists for edge
 *    delivery; locally it fights the aem-cli livereload injection and the
 *    inline RUM-off switch. The 404.html shipped by the boilerplate itself
 *    omits require-trusted-types-for the same way.
 *  - no fragment/widget auto-blocking yet (no such blocks in the Journal).
 *  - the Adobe Client Data Layer boots first, per the platform dictionary:
 *    page + user pushes, then page:loaded, before first paint work starts.
 */

import {
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  getMetadata,
} from './aem.js';
import { initDataLayer } from './datalayer.js';
import { initEdgeBridge, connectEdge } from './edge-bridge.js';

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * The Journal has none yet; the hook stays so later tasks slot in cleanly.
 * @param {Element} main The container element
 */
// eslint-disable-next-line no-unused-vars
function buildAutoBlocks(main) {
  try {
    // No auto blocks yet. main is the container later hooks will decorate.
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
}

/**
 * Seeds the data layer from the rendered head. The metadata block in each
 * document becomes meta tags at render time; this reads them back out. Tags
 * ride the document's metadata Tags row, which the pipeline renders as one
 * article:tag meta per value; getMetadata joins them back with ", ".
 */
function bootDataLayer() {
  const tags = getMetadata('article:tag')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  initDataLayer({
    pageName: getMetadata('og:title') || document.title,
    template: getMetadata('template') || 'journal-home',
    subSection: window.location.pathname.startsWith('/articles/') ? 'articles' : 'journal',
    date: getMetadata('date'),
    tags,
  });
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  bootDataLayer();
  initEdgeBridge();
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  loadHeader(doc.querySelector('body > header'));

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('body > footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later, without impacting the user
 * experience. The edge bridge connects here; media analytics helpers arrive with
 * the player blocks and stay local either way.
 */
function loadDelayed() {
  // The Web SDK connection attaches here, after LCP and the lazy sections;
  // everything queued since loadEager flushes then.
  connectEdge();
  // Adobe Tags, from the slair-tags-library meta in head.html. Off unless a
  // deployment sets it. The import is dynamic, as in the boilerplate's own
  // loadDelayed, so delayed.js is a separate chunk fetched after the page is
  // interactive rather than parsed as part of the eager module graph.
  import('./delayed.js').then(({ loadTags }) => loadTags());
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
