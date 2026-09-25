/*
 * Journal boot, modeled on adobe/aem-boilerplate scripts/scripts.js
 * (revision 680f7f8b7fc59d34a08a8814b0b27f08715be7cb): decorateMain plus the
 * loadEager / loadLazy / loadDelayed phases. Local deviations, on purpose:
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

// Trusted types, vendored from the boilerplate's own bootstrap. This is the
// other half of the Content-Security-Policy in head.html: that policy sets
// require-trusted-types-for 'script', which makes every innerHTML assignment
// and every script.src assignment throw unless a default policy exists to
// convert the string. The two ship together and neither works alone.
//
// The policy is a compatibility shim rather than a hardening measure. It
// passes values through, stripping only an iframe srcdoc and any script
// element arriving through a fragment sink. The hardening is the CSP itself.
if (window.trustedTypes && window.trustedTypes.createPolicy) {
  const innerTT = window.trustedTypes.createPolicy('tt-inner', {
    createHTML: (s) => s, // avoid stack overflow
  });

  window.trustedTypes.createPolicy('default', {
    createHTML: (input, type, sink) => {
      let processedInput = input;
      if (/srcdoc\s*=/i.test(processedInput)) {
        const doc = new DOMParser().parseFromString(innerTT.createHTML(processedInput), 'text/html');
        doc.querySelectorAll('iframe[srcdoc]').forEach((el) => el.removeAttribute('srcdoc'));
        processedInput = doc.body.innerHTML;
      }
      if (sink.includes('createContextualFragment') || sink.includes('Document write')) {
        const doc = new DOMParser().parseFromString(innerTT.createHTML(processedInput), 'text/html');
        doc.querySelectorAll('script').forEach((el) => el.remove());
        processedInput = doc.body.innerHTML;
      }
      return processedInput;
    },
    createScriptURL: (input) => input,
    createScript: (input) => input,
  });
}

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
