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
 * mediaId = the host article's slug (the footage file may be shared DAM
 * stock; the article is the media identity). All metadata-derived text
 * lands via textContent.
 */

import { getMetadata } from '../../scripts/aem.js';
import { registerComponent, attachMediaTracking } from '../../scripts/datalayer.js';

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

  registerComponent(block, 'video-story', title);
}
