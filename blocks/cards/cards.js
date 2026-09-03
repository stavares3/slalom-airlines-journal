/*
 * Journal cards: the article index grid. The authored table names the feed
 * (a link to /query-index.json, the hand-maintained index that mirrors
 * content/articles/); the block fetches it relative to the page origin, so
 * the same markup works under `npm run up` today and on a deployed .page
 * host later. Entries render newest first as linked cards carrying image,
 * eyebrow (the article template as a section label), title, description,
 * and date. Everything metadata-derived lands via textContent.
 */

import { createOptimizedPicture } from '../../scripts/aem.js';
import { registerComponent } from '../../scripts/datalayer.js';

const TEMPLATE_LABELS = { article: 'Story', podcast: 'Podcast', film: 'Film' };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/** Formats an ISO date without ever leaving the authored calendar day. */
function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso || '';
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

async function fetchIndex(source) {
  try {
    const resp = await fetch(source);
    if (!resp.ok) return [];
    const json = await resp.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch (e) {
    return [];
  }
}

/**
 * decorates the cards grid
 * @param {Element} block The cards block element
 */
export default async function decorate(block) {
  const authored = block.querySelector('a[href$=".json"]');
  const source = authored ? authored.getAttribute('href') : '/query-index.json';
  block.textContent = '';

  const entries = (await fetchIndex(source))
    .filter((entry) => entry.path && entry.title)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'cards-empty';
    empty.textContent = 'New stories are boarding shortly.';
    block.append(empty);
    registerComponent(block, 'cards', 'Journal stories');
    return;
  }

  const list = document.createElement('ul');
  list.className = 'cards-list';

  entries.forEach((entry) => {
    const item = document.createElement('li');
    item.className = 'cards-card';

    const link = document.createElement('a');
    link.className = 'cards-card-link';
    link.href = entry.path;

    const imageWrap = document.createElement('div');
    imageWrap.className = 'cards-card-image';
    if (entry.image) {
      imageWrap.append(createOptimizedPicture(entry.image, '', false, [{ width: '750' }]));
    }

    const body = document.createElement('div');
    body.className = 'cards-card-body';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'cards-card-eyebrow';
    eyebrow.textContent = TEMPLATE_LABELS[entry.template] || TEMPLATE_LABELS.article;

    const title = document.createElement('h3');
    title.className = 'cards-card-title';
    title.textContent = entry.title;

    const description = document.createElement('p');
    description.className = 'cards-card-description';
    description.textContent = entry.description || '';

    const date = document.createElement('p');
    date.className = 'cards-card-date';
    const time = document.createElement('time');
    time.dateTime = entry.date || '';
    time.textContent = formatDate(entry.date);
    date.append(time);

    body.append(eyebrow, title, description, date);
    link.append(imageWrap, body);
    item.append(link);
    list.append(item);
  });

  block.append(list);

  registerComponent(block, 'cards', 'Journal stories');
}
