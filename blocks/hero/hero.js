/*
 * Journal hero. Decorates the authored hero table (one cell holding an
 * image, an eyebrow paragraph, the title heading, and an optional standfirst
 * paragraph) into the site's hero grammar: the image fills the block behind
 * one SOLID midnight scrim with ivory type on top. No gradient anywhere in
 * this block, in the scrim or in the text; the masthead swoosh stays the
 * Journal's single gradient moment.
 */

import { registerComponent } from '../../scripts/datalayer.js';

/**
 * decorates the hero
 * @param {Element} block The hero block element
 */
export default function decorate(block) {
  const media = block.querySelector('picture') || block.querySelector('img');
  const title = block.querySelector('h1, h2, h3');
  const paragraphs = [...block.querySelectorAll('p')]
    .filter((p) => !p.querySelector('picture, img') && p.textContent.trim());

  const before = [];
  const after = [];
  paragraphs.forEach((p) => {
    // eslint-disable-next-line no-bitwise
    if (title && (title.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_PRECEDING)) {
      before.push(p);
    } else {
      after.push(p);
    }
  });

  const mediaWrap = document.createElement('div');
  mediaWrap.className = 'hero-media';
  if (media) {
    const img = media.tagName === 'IMG' ? media : media.querySelector('img');
    if (img) {
      img.setAttribute('loading', 'eager');
      img.setAttribute('fetchpriority', 'high');
    }
    mediaWrap.append(media);
  }

  const scrim = document.createElement('div');
  scrim.className = 'hero-scrim';

  const content = document.createElement('div');
  content.className = 'hero-content';
  if (before.length) {
    const eyebrow = before[0];
    eyebrow.className = 'hero-eyebrow';
    content.append(eyebrow);
  }
  if (title) content.append(title);
  after.forEach((p) => {
    p.className = 'hero-standfirst';
    content.append(p);
  });

  block.replaceChildren(mediaWrap, scrim, content);

  registerComponent(block, 'hero', title ? title.textContent.trim() : 'Journal hero');
}
