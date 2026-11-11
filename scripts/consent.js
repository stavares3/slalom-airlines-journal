/*
 * Cookie consent for the Journal, the same contract as the flagship AEM site's
 * consent banner (aem/ui.frontend/.../consent-banner/consent-banner.js in the
 * slalom-airlines repository):
 *
 *  - the visitor's choice is stored in localStorage under "slair-consent" as
 *    { essential, analytics, personalization, advertising } booleans;
 *  - every choice is pushed to the data layer as consent:updated with
 *    { categories }. The Adobe Tags property listens for that event (rule
 *    "Consent decision") and calls the Web SDK's setConsent. Until it does,
 *    the Web SDK holds every event, because the property's defaultConsent is
 *    "pending".
 *
 * One difference from the flagship: a stored choice is pushed again on every
 * page load. Consent is per origin, and the Journal is a different origin from
 * the AEM publish host, so a choice made on one never reaches the other. Pushing
 * the stored choice on load means a returning reader's page view is released
 * without depending on what the Web SDK kept from the last visit.
 *
 * All strings are static and set through textContent.
 */

import { loadCSS } from './aem.js';
import { pushEvent } from './datalayer.js';

const KEY = 'slair-consent';
const CATEGORIES = [
  ['essential', 'Essential: always on'],
  ['analytics', 'Analytics: understand usage'],
  ['personalization', 'Personalization: tailored content'],
  ['advertising', 'Advertising: relevant offers'],
];

let banner = null;

/** The stored choice, or null when the reader has not decided. */
export function getConsent() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null');
    return value && typeof value === 'object' ? value : null;
  } catch (e) {
    return null;
  }
}

function save(categories) {
  try {
    localStorage.setItem(KEY, JSON.stringify(categories));
  } catch (e) {
    // Storage blocked: the choice still applies to this page view.
  }
  pushEvent('consent:updated', { categories });
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function button(label, action, kind) {
  const node = el('button', `button ${kind}`, label);
  node.type = 'button';
  node.dataset.consentAction = action;
  return node;
}

function build() {
  const root = el('section', 'consent-banner');
  root.id = 'consent-banner';
  root.setAttribute('aria-label', 'Cookie choices');
  root.hidden = true;

  const panel = el('div', 'consent-banner-panel');
  panel.append(el('h2', 'consent-banner-title', 'Your privacy, your altitude'));
  panel.append(el('p', null, 'We use cookies and similar technologies to run this site, measure how it performs, remember your preferences, and show offers that fit. Choose what you\'re comfortable with. Essential cookies keep the aircraft flying either way.'));

  const prefs = el('div', 'consent-banner-prefs');
  prefs.hidden = true;
  CATEGORIES.forEach(([key, label]) => {
    const row = el('label');
    const box = el('input');
    box.type = 'checkbox';
    box.dataset.consentCat = key;
    if (key === 'essential') { box.checked = true; box.disabled = true; }
    row.append(box, document.createTextNode(` ${label}`));
    prefs.append(row);
  });

  const actions = el('div', 'consent-banner-actions');
  const saveButton = button('Save choices', 'save', 'primary');
  saveButton.hidden = true;
  actions.append(
    button('Accept all', 'accept-all', 'primary'),
    button('Essential only', 'essential-only', 'secondary'),
    button('Preferences', 'preferences', 'secondary'),
    saveButton,
  );

  panel.append(prefs, actions);
  root.append(panel);

  root.addEventListener('click', (e) => {
    const { consentAction: action } = e.target.dataset;
    if (!action) return;
    const cats = {
      essential: true, analytics: false, personalization: false, advertising: false,
    };
    if (action === 'accept-all') Object.keys(cats).forEach((k) => { cats[k] = true; });
    if (action === 'preferences') {
      const stored = getConsent();
      prefs.querySelectorAll('[data-consent-cat]:not([disabled])').forEach((box) => {
        box.checked = !!stored?.[box.dataset.consentCat];
      });
      prefs.hidden = false;
      saveButton.hidden = false;
      e.target.hidden = true;
      prefs.querySelector('[data-consent-cat]:not([disabled])')?.focus();
      return;
    }
    if (action === 'save') {
      prefs.querySelectorAll('[data-consent-cat]').forEach((box) => {
        cats[box.dataset.consentCat] = box.checked || box.dataset.consentCat === 'essential';
      });
    }
    save(cats);
    root.hidden = true;
  });

  document.body.append(root);
  return root;
}

/** Opens the banner with the preferences showing, for a "Cookie preferences" link. */
export function openConsentPreferences() {
  loadCSS(`${window.hlx.codeBasePath}/styles/consent.css`);
  if (!banner) banner = build();
  banner.hidden = false;
  banner.querySelector('[data-consent-action="preferences"]')?.click();
}

/**
 * Pushes a stored choice, or shows the banner to a reader who has not chosen.
 * Runs in the delayed phase, so the banner never competes with the page's
 * largest paint.
 */
export function initConsent() {
  loadCSS(`${window.hlx.codeBasePath}/styles/consent.css`);
  const stored = getConsent();
  if (stored) {
    pushEvent('consent:updated', { categories: stored });
    return;
  }
  banner = build();
  banner.hidden = false;
  banner.querySelector('[data-consent-action="accept-all"]')?.focus({ preventScroll: true });
}
