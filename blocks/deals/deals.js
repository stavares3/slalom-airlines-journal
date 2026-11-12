/*
 * Journal deals: the flagship site's deals, read live from the AEM publish
 * tier through two persisted GraphQL queries (slalomair/deals-all and
 * slalomair/destinations-all), the same Content Fragments the site's own
 * deal cards render. A deal Workfront creates appears here with nothing new
 * in the Journal. The second channel of fragment first, phase 2.
 *
 * The publish origin is the origin of window.SLAIR_SITE_URL (head.html), so
 * there is one value to change per environment. The authored table may name
 * how many deals to show (a number in its first cell, three by default).
 *
 * Until the queries answer (no GraphQL endpoint on publish, or the Journal's
 * origin not yet allowed by the publish tier's CORS rules), the block shows
 * one link to the site's deals page rather than an empty box. Expired deals
 * are left out. Everything from the response lands via textContent.
 */

import { registerComponent } from '../../scripts/datalayer.js';
import { siteRoot, siteUrl } from '../../scripts/site-links.js';

const DEFAULT_COUNT = 3;

/** The publish tier's persisted query URL for `name`. */
export function queryUrl(root, name) {
  return `${new URL(root).origin}/graphql/execute.json/slalomair/${name}`;
}

async function fetchItems(url, list) {
  try {
    const resp = await fetch(url, { credentials: 'omit' });
    if (!resp.ok) return null;
    const json = await resp.json();
    const items = json && json.data && json.data[list] && json.data[list].items;
    return Array.isArray(items) ? items : null;
  } catch (e) {
    return null;
  }
}

/** True when the deal has an expiry date before `today` (YYYY-MM-DD). */
export function isExpired(deal, today) {
  const ends = (deal.expires || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(ends) && ends < today;
}

/**
 * The cards to show: live deals in the query's order, each with its city
 * from the destination fragments, at most `count`.
 */
export function toCards(deals, destinations, count, today) {
  const cities = new Map((destinations || []).map((d) => [String(d.code || '').toUpperCase(), d.name]));
  return (deals || [])
    .filter((d) => d && d.slug && d.title && !isExpired(d, today))
    .slice(0, count)
    .map((d) => ({
      slug: d.slug,
      title: d.title,
      tag: d.tag || '',
      city: cities.get(String(d.dest || '').toUpperCase()) || d.dest || '',
      price: typeof d.price === 'number' ? d.price : null,
      blurb: d.blurb || '',
      path: d.detailPage ? `/deals/${d.slug}` : '/deals',
    }));
}

function fallback(block) {
  const p = document.createElement('p');
  p.className = 'deals-fallback';
  const link = document.createElement('a');
  link.href = siteUrl('/deals');
  link.textContent = 'See this week’s fares on the Slalom Airlines site';
  p.append(link);
  block.append(p);
}

/**
 * decorates the deals list
 * @param {Element} block The deals block element
 */
export default async function decorate(block) {
  const authored = parseInt(block.textContent.trim(), 10);
  const count = Number.isFinite(authored) && authored > 0 ? authored : DEFAULT_COUNT;
  block.textContent = '';

  const root = siteRoot();
  const [deals, destinations] = await Promise.all([
    fetchItems(queryUrl(root, 'deals-all'), 'dealList'),
    fetchItems(queryUrl(root, 'destinations-all'), 'destinationList'),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const cards = deals ? toCards(deals, destinations, count, today) : [];

  if (!cards.length) {
    fallback(block);
    registerComponent(block, 'deals', 'Fares from the site');
    return;
  }

  const list = document.createElement('ul');
  list.className = 'deals-list';
  cards.forEach((card) => {
    const item = document.createElement('li');
    item.className = 'deals-card';

    const link = document.createElement('a');
    link.className = 'deals-card-link';
    link.href = siteUrl(card.path);

    const eyebrow = document.createElement('p');
    eyebrow.className = 'deals-card-eyebrow';
    eyebrow.textContent = [card.tag, card.city].filter(Boolean).join(' · ');

    const title = document.createElement('h3');
    title.className = 'deals-card-title';
    title.textContent = card.title;

    const blurb = document.createElement('p');
    blurb.className = 'deals-card-blurb';
    blurb.textContent = card.blurb;

    link.append(eyebrow, title, blurb);
    if (card.price !== null) {
      const price = document.createElement('p');
      price.className = 'deals-card-price';
      price.textContent = `From $${card.price.toLocaleString('en-US')} round trip`;
      link.append(price);
    }
    item.append(link);
    list.append(item);
  });
  block.append(list);

  registerComponent(block, 'deals', 'Fares from the site');
}
