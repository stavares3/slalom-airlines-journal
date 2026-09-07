/*
 * Journal podcast player. The authored table holds one link to an mp3 in
 * /media/; decoration replaces it with the Journal's own audio UI: a
 * play/pause toggle, a seek slider, elapsed and total readouts, and the
 * standing "Synthesized demo narration" label (the narration is Windows
 * TTS reading a committed script, and the player says so, per the demo
 * safety constraint). No autoplay, ever. The toggle is a real button and
 * the scrubber is a native range input, so the whole player is keyboard
 * operable with no extra key handling.
 *
 * media:* events ride scripts/datalayer.js's attachMediaTracking, with
 * mediaId = the host article's slug (Journal media is one piece per
 * document). All metadata-derived text lands via textContent.
 */

import { getMetadata } from '../../scripts/aem.js';
import { registerComponent, attachMediaTracking } from '../../scripts/datalayer.js';

/** The host document's slug, the media identity for this page's piece. */
function pageSlug() {
  const last = window.location.pathname.split('/').filter(Boolean).pop() || 'index';
  return last.replace(/\.html$/, '');
}

/** m:ss readout for a whole-second count. */
function clock(totalSeconds) {
  if (!Number.isFinite(totalSeconds)) return '0:00';
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/**
 * decorates the podcast player
 * @param {Element} block The podcast-player block element
 */
export default function decorate(block) {
  const authored = block.querySelector('a[href$=".mp3"]');
  const src = authored ? authored.getAttribute('href') : '';
  block.textContent = '';
  if (!src) return;

  const title = getMetadata('og:title') || document.title;

  const audio = document.createElement('audio');
  audio.src = src;
  audio.preload = 'metadata';

  const toggle = el('button', 'podcast-player-toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-label', `Play episode: ${title}`);
  const glyph = el('span', 'podcast-player-glyph');
  glyph.setAttribute('aria-hidden', 'true');
  toggle.append(glyph);

  const heading = el('p', 'podcast-player-heading', 'Listen to this story');
  const label = el('p', 'podcast-player-label', 'Synthesized demo narration');

  const scrubber = document.createElement('input');
  scrubber.type = 'range';
  scrubber.className = 'podcast-player-scrubber';
  scrubber.min = '0';
  scrubber.max = '100';
  scrubber.step = '1';
  scrubber.value = '0';
  scrubber.setAttribute('aria-label', 'Seek within the episode');

  const elapsed = el('span', 'podcast-player-elapsed', '0:00');
  const total = el('span', 'podcast-player-total', '0:00');
  const divider = el('span', 'podcast-player-divider', '/');
  divider.setAttribute('aria-hidden', 'true');
  const time = el('p', 'podcast-player-time');
  time.append(elapsed, divider, total);

  const controls = el('div', 'podcast-player-controls');
  const rail = el('div', 'podcast-player-rail');
  rail.append(scrubber, time);
  const text = el('div', 'podcast-player-text');
  text.append(heading, label);
  controls.append(toggle, rail);
  block.append(text, controls, audio);
  block.classList.add('podcast-player-idle');

  const syncToggle = () => {
    const playing = !audio.paused && !audio.ended;
    block.classList.toggle('podcast-player-playing', playing);
    block.classList.toggle('podcast-player-idle', !playing);
    toggle.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} episode: ${title}`);
  };

  toggle.addEventListener('click', () => {
    if (audio.paused || audio.ended) audio.play();
    else audio.pause();
  });

  audio.addEventListener('loadedmetadata', () => {
    total.textContent = clock(audio.duration);
  });

  let scrubbing = false;
  audio.addEventListener('timeupdate', () => {
    elapsed.textContent = clock(audio.currentTime);
    if (!scrubbing && Number.isFinite(audio.duration) && audio.duration > 0) {
      scrubber.value = String(Math.round((audio.currentTime / audio.duration) * 100));
    }
  });

  scrubber.addEventListener('pointerdown', () => { scrubbing = true; });
  scrubber.addEventListener('pointerup', () => { scrubbing = false; });
  scrubber.addEventListener('input', () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = (Number(scrubber.value) / 100) * audio.duration;
    }
  });

  ['play', 'pause', 'ended'].forEach((name) => audio.addEventListener(name, syncToggle));

  attachMediaTracking(audio, { mediaType: 'audio', mediaId: pageSlug(), title });

  registerComponent(block, 'podcast-player', title, { onVisible: true });
}
