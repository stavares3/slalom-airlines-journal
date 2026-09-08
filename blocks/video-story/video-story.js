/*
 * Journal video story. The authored table holds a poster image and one link
 * to an mp4 in /media/; decoration builds a full-width film frame that
 * NEVER autoplays: the poster shows with a play control, and footage only
 * moves on the visitor's own click (which is also how reduced-motion
 * preferences are respected: nothing animates until asked, for anyone).
 * Once playing, the native controls take over for pause and seek, and a
 * fullscreen affordance sits with the caption from the start.
 *
 * media:* events ride scripts/datalayer.js's attachMediaTracking, with
 * mediaId = the host article's slug (the article is the media identity), and
 * the edge bridge forwards them to the datastream as slalomair.media.*.
 * A film tagged with a destination ends on a booking call to action over
 * its brand end card, tracked as the video-cta component. All
 * metadata-derived text lands via textContent.
 */

import { getMetadata } from '../../scripts/aem.js';
import { registerComponent, attachMediaTracking, pushEvent } from '../../scripts/datalayer.js';
import { siteUrl } from '../../scripts/site-links.js';

/* Destination the film sells, from the document's slalomair:destination tag. */
const CITIES = { nrt: 'Tokyo', lhr: 'London', cdg: 'Paris', hnl: 'Honolulu', syd: 'Sydney', jfk: 'New York', den: 'Denver', sea: 'Seattle' };
// The call to action takes over the last frame: it appears when the film ends (or within the
// final quarter second, so the hand-off is clean on players that fire ended late).
const CTA_LEAD_SECONDS = 0.25;

function destinationFromTags() {
  const tag = getMetadata('article:tag').split(',').map((t) => t.trim()).find((t) => t.startsWith('slalomair:destination/'));
  const code = tag ? tag.split('/').pop().toLowerCase() : '';
  return code && CITIES[code] ? { code: code.toUpperCase(), city: CITIES[code] } : null;
}

/** The host document's slug, the media identity for this page's piece. */
function pageSlug() {
  const last = window.location.pathname.split('/').filter(Boolean).pop() || 'index';
  return last.replace(/\.html$/, '');
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/**
 * decorates the video story
 * @param {Element} block The video-story block element
 */
export default function decorate(block) {
  const authored = block.querySelector('a[href$=".mp4"]');
  const poster = block.querySelector('img');
  const src = authored ? authored.getAttribute('href') : '';
  block.textContent = '';
  if (!src) return;

  const title = getMetadata('og:title') || document.title;

  const video = document.createElement('video');
  video.src = src;
  video.preload = 'none';
  video.playsInline = true;
  if (poster) video.poster = poster.getAttribute('src');

  const play = el('button', 'video-story-play');
  play.type = 'button';
  play.setAttribute('aria-label', `Play film: ${title}`);
  const glyph = el('span', 'video-story-play-glyph');
  glyph.setAttribute('aria-hidden', 'true');
  play.append(glyph, el('span', 'video-story-play-text', 'Play film'));

  const frame = el('div', 'video-story-frame');
  frame.append(video, play);

  const caption = el('p', 'video-story-caption');
  caption.append(el('span', 'video-story-caption-text', poster && poster.getAttribute('alt') ? poster.getAttribute('alt') : title));

  const fullscreen = el('button', 'video-story-fullscreen');
  fullscreen.type = 'button';
  fullscreen.setAttribute('aria-label', 'Watch the film fullscreen');
  const corners = el('span', 'video-story-fullscreen-glyph');
  corners.setAttribute('aria-hidden', 'true');
  fullscreen.append(corners, el('span', 'video-story-fullscreen-text', 'Fullscreen'));

  const bar = el('div', 'video-story-bar');
  bar.append(caption, fullscreen);

  block.append(frame, bar);
  block.classList.add('video-story-idle');

  play.addEventListener('click', () => {
    video.controls = true;
    video.play();
  });

  video.addEventListener('play', () => {
    block.classList.remove('video-story-idle');
    video.controls = true;
  });

  fullscreen.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (video.requestFullscreen) video.requestFullscreen();
  });

  attachMediaTracking(video, { mediaType: 'video', mediaId: pageSlug(), title });

  registerComponent(block, 'video-story', title, { onVisible: true });

  // Call to action over the end card: "Book your trip to <city> now", shown
  // when the film reaches its brand card (or ends), hidden again on replay.
  // Tracked as its own component: a cmp:show the first time it appears and a
  // cmp:click per press, both carrying the destination and the film's id.
  const destination = destinationFromTags();
  if (destination) {
    const mediaId = pageSlug();
    const ctaId = `${block.id || 'video-story'}-cta`;
    const cta = el('div', 'video-story-cta');
    cta.id = ctaId;
    cta.hidden = true;
    cta.dataset.cmp = 'video-cta';
    cta.dataset.cmpTitle = `Book your trip to ${destination.city} now`;
    const panel = el('div', 'video-story-cta-panel');
    panel.append(el('span', 'video-story-cta-eyebrow', 'Slalom Airlines'));
    panel.append(el('p', 'video-story-cta-title', `Book your trip to ${destination.city} now`));
    panel.append(el('p', 'video-story-cta-text', `Nonstop from Seattle. Every fare held free for 24 hours.`));
    const actions = el('div', 'video-story-cta-actions');
    const book = el('a', 'button primary video-story-cta-book', `Book Seattle to ${destination.city}`);
    book.href = siteUrl('/book', { dest: destination.code, origin: 'SEA' });
    const replay = el('button', 'button secondary video-story-cta-replay', 'Watch again');
    replay.type = 'button';
    actions.append(book, replay);
    panel.append(actions);
    cta.append(panel);
    frame.append(cta);

    let shown = false;
    const reveal = () => {
      if (!cta.hidden) return;
      cta.hidden = false;
      if (!shown) {
        shown = true;
        window.adobeDataLayer.push({ component: { [ctaId]: { '@type': 'slalomair/components/video-cta', title: cta.dataset.cmpTitle } } });
        pushEvent('cmp:show', { id: ctaId, type: 'video-cta', destination: destination.code, mediaId });
      }
    };
    video.addEventListener('timeupdate', () => {
      if (Number.isFinite(video.duration) && video.duration > 0 && video.currentTime >= video.duration - CTA_LEAD_SECONDS) reveal();
    });
    video.addEventListener('ended', reveal);
    video.addEventListener('seeking', () => { if (video.currentTime < video.duration - CTA_LEAD_SECONDS) cta.hidden = true; });
    book.addEventListener('click', () => {
      pushEvent('cmp:click', { id: ctaId, type: 'video-cta', action: 'book', destination: destination.code, mediaId, position: Math.round(video.currentTime) });
    });
    replay.addEventListener('click', () => {
      pushEvent('cmp:click', { id: ctaId, type: 'video-cta', action: 'replay', destination: destination.code, mediaId });
      cta.hidden = true;
      video.currentTime = 0;
      video.play();
    });
  }
}
