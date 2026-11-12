/*
 * Journal footer: the flagship site's footer, so a reader moving between the
 * Journal and the site sees one footer. The brand mark, tagline, four link
 * columns and the copyright line mirror the prototype's footer columns in the
 * monorepo (prototype/lib/chrome.mjs), with every site link resolved
 * through scripts/site-links.js and the Journal's own link kept local. Built
 * in code for the same reason as the header: chrome, zero content fetches.
 * All strings are static and set via textContent.
 */

import { registerComponent } from '../../scripts/datalayer.js';
import { siteUrl } from '../../scripts/site-links.js';

const TAGLINE = 'Fly the world.';

// The site footer's columns. A "/journal/" href stays on the Journal; every
// other href is a site page path, resolved against the deployed site root.
const COLUMNS = [
  ['Company', [['About this demo', '/legal'], ['The Journal', '/journal/'], ['Contact us', '/help/contact'], ['Help center', '/help']]],
  ['Travel', [['Deals', '/deals'], ['Flight status', '/fly/status'], ['Travel policies', '/travel/baggage#policies']]],
  ['Loyalty', [['Slalom Peaks', '/peaks'], ['My account', '/account'], ['Credit cards', '/cards']]],
  ['Legal', [
    ['Privacy', '/legal#privacy'],
    ['Terms', '/legal#terms'],
    ['Cookie policy', '/legal#cookies'],
    ['Manage email communications', '/communication-preferences'],
    ['Manage SMS communications', '/sms-preferences'],
    ['Do not sell or share my personal information', '/legal#privacy'],
  ]],
];

const COPYRIGHT = `© ${new Date().getFullYear()} Slalom Airlines. Slalom Airlines is a fictional demonstration brand built by Slalom for Adobe Experience Cloud enablement.`;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** A site page path with an optional fragment, as an absolute site URL. */
function hrefFor(path) {
  if (path === '/journal/') return '/';
  const [page, fragment] = path.split('#');
  return `${siteUrl(page)}${fragment ? `#${fragment}` : ''}`;
}

function logo() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'footer-logo');
  svg.setAttribute('viewBox', '0 0 330 64');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Slalom Airlines');
  const bands = [
    ['M4 60 C 22 46, 38 28, 66 4 C 52 30, 36 48, 18 60 Z', '#4FC9E8'],
    ['M20 60 C 36 50, 50 36, 72 16 C 62 36, 48 50, 32 60 Z', '#6FE3B0'],
    ['M34 60 C 46 54, 56 46, 74 30 C 66 46, 56 56, 44 60 Z', '#F2A93B'],
  ];
  bands.forEach(([d, fill]) => {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', fill);
    svg.append(path);
  });
  const word = document.createElementNS(ns, 'text');
  word.setAttribute('x', '86');
  word.setAttribute('y', '36');
  word.setAttribute('class', 'footer-wordmark-text');
  word.setAttribute('fill', 'currentColor');
  word.textContent = 'SLALOM';
  const sub = document.createElementNS(ns, 'text');
  sub.setAttribute('x', '88');
  sub.setAttribute('y', '54');
  sub.setAttribute('class', 'footer-wordmark-sub');
  sub.setAttribute('fill', '#A8B3C7');
  sub.textContent = 'AIRLINES';
  svg.append(word, sub);
  return svg;
}

/**
 * decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  block.textContent = '';

  const top = el('div', 'footer-top');

  const brand = el('div', 'footer-brand');
  brand.append(logo());
  brand.append(el('p', 'footer-tagline', TAGLINE));
  brand.append(el('hr', 'footer-rule'));

  const columns = el('div', 'footer-columns');
  COLUMNS.forEach(([title, links]) => {
    const col = el('div', 'footer-col');
    col.append(el('h2', null, title));
    const list = el('ul');
    links.forEach(([label, path]) => {
      const item = el('li');
      const link = el('a', null, label);
      link.href = hrefFor(path);
      item.append(link);
      list.append(item);
    });
    col.append(list);
    columns.append(col);
  });

  top.append(brand, columns);

  const bottomBar = el('div', 'footer-bottom-bar');
  const bottom = el('div', 'footer-bottom');
  bottom.append(el('p', null, COPYRIGHT));
  // Reopens the cookie banner with the preferences showing (scripts/consent.js).
  const prefs = el('button', 'footer-consent', 'Cookie preferences');
  prefs.type = 'button';
  prefs.addEventListener('click', async () => {
    const { openConsentPreferences } = await import('../../scripts/consent.js');
    openConsentPreferences();
  });
  bottom.append(prefs);
  bottomBar.append(bottom);

  block.append(top, bottomBar);

  registerComponent(block, 'footer', 'Global footer');
}
