/*
 * Journal footer: wordmark, tagline, section links, and the demo disclosure.
 * Built in code for the same reason as the header: three lines of chrome,
 * zero content fetches. All strings are static and set via textContent.
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
 * decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  block.textContent = '';

  const inner = el('div', 'footer-inner');

  const brandCol = el('div', 'footer-brand');
  brandCol.append(el('p', 'footer-wordmark', 'Slalom Airlines Journal'));
  brandCol.append(el('p', 'footer-tagline', 'Fly the world.'));

  const nav = el('nav', 'footer-nav');
  nav.setAttribute('aria-label', 'Journal sections');
  const list = el('ul', 'footer-nav-list');
  SECTIONS.forEach(([label, href]) => {
    const item = el('li');
    const link = el('a', 'footer-nav-link', label);
    link.href = href;
    item.append(link);
    list.append(item);
  });
  nav.append(list);

  const legal = el('div', 'footer-legal');
  legal.append(el('p', null, `Slalom Airlines is a fictional carrier created for an Adobe Experience Cloud demonstration. Copyright ${new Date().getFullYear()} Slalom Airlines.`));

  inner.append(brandCol, nav, legal);
  block.append(inner);
}
