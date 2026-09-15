/*
 * Journal call to action. The authored table holds one cell with an optional
 * eyebrow paragraph, a heading, a line of copy, and a link. It renders as the
 * closing band the flagship site's own Journal page ends on: centred type over
 * the page background, with the link as the single button.
 *
 * The link is left exactly as the boilerplate decorated it, so a paragraph
 * holding nothing but a link is already a button by the time this runs.
 */

import { registerComponent } from '../../scripts/datalayer.js';

/**
 * decorates the call to action band
 * @param {Element} block The cta block element
 */
export default function decorate(block) {
  const heading = block.querySelector('h1, h2, h3, h4');
  const paragraphs = [...block.querySelectorAll('p')];
  const actions = paragraphs.filter((p) => p.querySelector('a'));
  const text = paragraphs.filter((p) => !p.querySelector('a') && p.textContent.trim());

  const content = document.createElement('div');
  content.className = 'cta-content';

  // Any copy above the heading is the eyebrow; everything below it is body.
  const above = text.filter((p) => heading
    // eslint-disable-next-line no-bitwise
    && (heading.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_PRECEDING));
  const below = text.filter((p) => !above.includes(p));

  if (above.length) {
    above[0].className = 'cta-eyebrow';
    content.append(above[0]);
  }
  if (heading) {
    heading.className = 'cta-title';
    content.append(heading);
  }
  below.forEach((p) => {
    p.className = 'cta-text';
    content.append(p);
  });

  if (actions.length) {
    const wrap = document.createElement('div');
    wrap.className = 'cta-actions';
    actions.forEach((p) => wrap.append(p));
    content.append(wrap);
  }

  block.replaceChildren(content);

  registerComponent(block, 'cta', heading ? heading.textContent.trim() : 'Journal call to action');
}
