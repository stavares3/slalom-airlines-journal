/*
 * Journal masthead. Built directly in code rather than from a /nav fragment:
 * the Journal's chrome is three links and a wordmark, and keeping it here
 * means one less content fetch and nothing that can miss into the proxy.
 *
 * DEPLOY-TIME WIRING: the wordmark links to the Journal's own home ("/").
 * In production the Journal lives beside the flagship site and this href
 * becomes the flagship origin (Phase 7 cross-linking), which is deliberately
 * out of scope now; nothing else changes in this block when that lands.
 */

const SECTIONS = [
  ['Stories', '/#stories'],
  ['Podcasts', '/#podcasts'],
  ['Films', '/#films'],
];

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
  brand.append(el('span', 'header-brand-overline', 'Slalom Airlines'));
  const word = el('span', 'header-brand-word', 'Journal');
  const swoosh = el('span', 'header-swoosh');
  swoosh.setAttribute('aria-hidden', 'true');
  word.append(swoosh);
  brand.append(word);

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
  nav.append(list);

  inner.append(brand, nav);
  block.append(inner);
}
