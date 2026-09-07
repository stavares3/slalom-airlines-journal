/*
 * Journal masthead. Built directly in code rather than from a /nav fragment:
 * the Journal's chrome is three links and a wordmark, and keeping it here
 * means one less content fetch and nothing that can miss into the proxy.
 *
 * The wordmark links to the Journal's own home ("/"); the last nav item,
 * "Slalom Airlines", returns to the flagship site. That origin is the one
 * environment-specific value here: window.SLAIR_SITE_URL when a deployment
 * sets it (head.html or a script before this one), else the local author.
 */

import { registerComponent } from '../../scripts/datalayer.js';

const SECTIONS = [
  ['Stories', '/#stories'],
  ['Podcasts', '/#podcasts'],
  ['Films', '/#films'],
];
const SITE_URL = window.SLAIR_SITE_URL || 'http://localhost:4502/content/slalomair/us/en.html?wcmmode=disabled';

// The site's tail-fin mark (three livery bands up the fin) beside the
// wordmark, the same drawing the flagship header uses; JOURNAL takes the
// AIRLINES line. Static markup, no visitor data passes through it.
const LOGO = `<svg class="header-logo" viewBox="0 0 330 64" role="img" aria-hidden="true" focusable="false">
  <path d="M4 60 C 22 46, 38 28, 66 4 C 52 30, 36 48, 18 60 Z" fill="#4FC9E8"/>
  <path d="M20 60 C 36 50, 50 36, 72 16 C 62 36, 48 50, 32 60 Z" fill="#6FE3B0"/>
  <path d="M34 60 C 46 54, 56 46, 74 30 C 66 46, 56 56, 44 60 Z" fill="#F2A93B"/>
  <text x="86" y="36" class="header-logo-word" fill="currentColor">SLALOM</text>
  <text x="88" y="54" class="header-logo-sub" fill="#A8B3C7">JOURNAL</text>
</svg>`;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/**
 * decorates the header
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  block.textContent = '';

  const inner = el('div', 'header-inner');

  const brand = el('a', 'header-brand');
  brand.href = '/';
  brand.setAttribute('aria-label', 'Slalom Airlines Journal home');
  brand.innerHTML = LOGO;

  const nav = el('nav', 'header-nav');
  nav.setAttribute('aria-label', 'Journal sections');
  const list = el('ul', 'header-nav-list');
  SECTIONS.forEach(([label, href]) => {
    const item = el('li');
    const link = el('a', 'header-nav-link', label);
    link.href = href;
    item.append(link);
    list.append(item);
  });
  const site = el('li');
  const siteLink = el('a', 'header-nav-link header-nav-link-site', 'Slalom Airlines');
  siteLink.href = SITE_URL;
  siteLink.setAttribute('aria-label', 'Back to the Slalom Airlines site');
  site.append(siteLink);
  list.append(site);
  nav.append(list);

  inner.append(brand, nav);
  block.append(inner);

  registerComponent(block, 'header', 'Journal masthead');
}
