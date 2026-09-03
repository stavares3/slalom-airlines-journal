/*
 * Article header: byline, date, read time, and topic tags under the title.
 * The authored table is a placement marker only; every rendered value comes
 * from the document's own metadata table, which the pipeline turns into head
 * metadata and aem.js getMetadata reads back (Author, Date, Read time as
 * read-time, Tags as article:tag). Read time falls back to a word count when
 * the row is not authored. All metadata-derived text lands via textContent.
 */

import { getMetadata } from '../../scripts/aem.js';
import { registerComponent } from '../../scripts/datalayer.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/** Formats an ISO date without ever leaving the authored calendar day. */
function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso || '';
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

/** The document's taxonomy tag ids, from the rendered article:tag metadata. */
function readTags() {
  return getMetadata('article:tag')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/**
 * Print label for a slalomair taxonomy id: the leaf value in the copy
 * register (destination codes stay uppercase, other leaves read as words).
 */
function tagLabel(tag) {
  const leaf = tag.split('/').pop() || tag;
  if (tag.includes(':destination/')) return leaf.toUpperCase();
  const words = leaf.replaceAll('-', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Fallback read time from the rendered article body, about 200 wpm. */
function estimateReadTime() {
  const main = document.querySelector('main');
  const words = main ? main.textContent.trim().split(/\s+/).length : 0;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

function metaPart(className, text) {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

/**
 * decorates the article header
 * @param {Element} block The article-header block element
 */
export default function decorate(block) {
  block.textContent = '';

  const author = getMetadata('author');
  const date = getMetadata('date');
  const readTime = getMetadata('read-time') || estimateReadTime();
  const tags = readTags();

  const meta = document.createElement('p');
  meta.className = 'article-header-meta';

  const parts = [];
  if (author) parts.push(metaPart('article-header-byline', `By ${author}`));
  if (date) {
    const time = document.createElement('time');
    time.className = 'article-header-date';
    time.dateTime = date;
    time.textContent = formatDate(date);
    parts.push(time);
  }
  if (readTime) parts.push(metaPart('article-header-readtime', readTime));

  parts.forEach((part, i) => {
    if (i > 0) {
      const dot = metaPart('article-header-dot', '·');
      dot.setAttribute('aria-hidden', 'true');
      meta.append(dot);
    }
    meta.append(part);
  });
  block.append(meta);

  if (tags.length) {
    const list = document.createElement('ul');
    list.className = 'article-header-tags';
    list.setAttribute('aria-label', 'Topics');
    tags.forEach((tag) => {
      const item = document.createElement('li');
      item.className = 'article-header-tag';
      item.dataset.tag = tag;
      item.textContent = tagLabel(tag);
      list.append(item);
    });
    block.append(list);
  }

  registerComponent(block, 'article-header', getMetadata('og:title') || document.title);
}
