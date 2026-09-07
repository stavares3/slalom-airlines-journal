/*
 * Web SDK bridge for the Journal: the data layer's events become XDM
 * ExperienceEvents on the same datastream the flagship site uses, so media
 * engagement on the Journal reports in Customer Journey Analytics beside
 * the site's own events.
 *
 * Two halves:
 *  - initEdgeBridge() runs early (loadEager, right after the data layer
 *    boots). It replays the entries already on window.adobeDataLayer, then
 *    wraps push so every later { event, eventInfo } for a forwarded event
 *    name is mapped to XDM (same rule as the prototype's xdm.js: eventType
 *    "slalomair.<name with : as .>", payload spread into _slalomair) and
 *    queued.
 *  - connectEdge() runs late (loadDelayed). With a datastream configured
 *    it loads the Web SDK library from the URL the deployment names,
 *    configures it, and flushes the queue through alloy("sendEvent");
 *    without one (every local preview) it flushes to the edge simulator:
 *    window.slairEdge.sent holds every XDM record and each is logged with
 *    console.debug("[slair edge-sim]"), so a demo can show the exact
 *    payloads CJA would receive.
 *
 * Configuration comes from head.html meta tags, all empty in the repo:
 *   slair-datastream-id, slair-org-id, slair-edge-domain (optional),
 *   slair-alloy-src (the Web SDK library URL, or a self-hosted copy).
 * Nothing here loads a third-party script unless those are set.
 */

const FORWARD = new Set(['cmp:show', 'cmp:click', 'media:start', 'media:pause', 'media:progress', 'media:complete', 'media:unload']);
const meta = (name) => document.head.querySelector(`meta[name="${name}"]`)?.content?.trim() || '';

const queue = [];
let connected = false;
let sender = null;
let pageState = null;

function stamp() { return new Date().toISOString(); }

function pageDetails() {
  return {
    web: {
      webPageDetails: {
        URL: window.location.href,
        name: pageState?.pageName || document.title,
      },
    },
  };
}

export function xdmFromPage(page) {
  return {
    eventType: 'web.webpagedetails.pageViews',
    timestamp: stamp(),
    ...pageDetails(),
    _slalomair: {
      template: page.template, language: page.language, currency: page.currency, tags: page.tags, siteSection: page.siteSection,
    },
  };
}

export function xdmFromEvent(event, info = {}) {
  return {
    eventType: `slalomair.${event.replaceAll(':', '.')}`,
    timestamp: stamp(),
    ...pageDetails(),
    _slalomair: { ...info, siteSection: 'journal' },
  };
}

function dispatch(xdm) {
  if (sender) sender(xdm);
  else queue.push(xdm);
}

function consider(entry) {
  if (!entry || typeof entry !== 'object') return;
  if (entry.page) {
    pageState = entry.page;
    dispatch(xdmFromPage(entry.page));
    return;
  }
  if (entry.event && FORWARD.has(entry.event)) dispatch(xdmFromEvent(entry.event, entry.eventInfo));
}

export function initEdgeBridge() {
  window.adobeDataLayer = window.adobeDataLayer || [];
  const dl = window.adobeDataLayer;
  dl.forEach(consider);
  const original = dl.push.bind(dl);
  dl.push = (...entries) => {
    const result = original(...entries);
    entries.forEach(consider);
    return result;
  };
}

function simulator() {
  window.slairEdge = window.slairEdge || { mode: 'simulator', sent: [] };
  return (xdm) => {
    window.slairEdge.sent.push(xdm);
    // eslint-disable-next-line no-console
    console.debug('[slair edge-sim]', xdm.eventType, xdm);
  };
}

function loadAlloy(src) {
  return new Promise((resolve, reject) => {
    // The Web SDK's standard command queue: "alloy" collects calls until the library arrives.
    if (!window.alloy) {
      window.__alloyNS = window.__alloyNS || [];
      window.__alloyNS.push('alloy');
      window.alloy = function alloyQueue(...args) {
        return new Promise((res, rej) => { (window.alloy.q = window.alloy.q || []).push([res, rej, args]); });
      };
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Web SDK library did not load from ${src}`));
    document.head.append(script);
  });
}

export async function connectEdge() {
  if (connected) return;
  connected = true;
  const datastreamId = meta('slair-datastream-id');
  const orgId = meta('slair-org-id');
  const edgeDomain = meta('slair-edge-domain');
  const alloySrc = meta('slair-alloy-src');
  let send = null;
  if (datastreamId && orgId && alloySrc) {
    try {
      await loadAlloy(alloySrc);
      const config = { datastreamId, orgId, defaultConsent: 'in' };
      if (edgeDomain) config.edgeDomain = edgeDomain;
      await window.alloy('configure', config);
      window.slairEdge = { mode: 'web-sdk', datastreamId, sent: [] };
      send = (xdm) => { window.slairEdge.sent.push(xdm); window.alloy('sendEvent', { xdm }).catch(() => {}); };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[slair edge] falling back to the simulator:', e.message);
    }
  }
  sender = send || simulator();
  queue.splice(0).forEach(sender);
}
