#!/usr/bin/env node
/**
 * firefly-generate.mjs: generate the eight Night flight to Tokyo clips through the
 * Firefly Services API instead of the Firefly web app, one job per shot, straight
 * into the file names the assembler expects.
 *
 *   node eds-blog/tools/firefly-generate.mjs --out <folder> [--stills <folder>] [--only 1,2] [--dry-run]
 *
 * Credentials come from the environment, never from a file in the repository:
 *   FIREFLY_CLIENT_ID      an Adobe Developer Console project with Firefly Services
 *   FIREFLY_CLIENT_SECRET  its OAuth server-to-server secret
 *
 * The shot list, prompts and first-frame stills are the ones in
 * eds-blog/media/night-flight-tokyo-commercial.md (and the run sheet). Stills are
 * read from --stills (default prototype/public/assets/dam/media); traveller.png,
 * the screenshot from shot 3 that keeps the traveller consistent, is read from
 * the output folder when it exists.
 *
 * CONFIRM BEFORE RELYING ON IT. The endpoints and payload shapes below are
 * written from memory of Firefly Services as it stood before this script was
 * written; Adobe's egress was blocked where it was written, so nothing here has
 * run against the live API. Check the current Firefly Services reference for
 * the video generation and image upload calls, adjust the three constants and
 * the payload builder, then run with --dry-run first: it prints every request
 * it would make and touches nothing.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");

// --- the three things to confirm against the current Firefly Services reference ---
const IMS_TOKEN_URL = "https://ims-na1.adobelogin.com/ims/token/v3";
const UPLOAD_URL = "https://firefly-api.adobe.io/v2/storage/image";      // returns { images: [{ id }] }
const VIDEO_URL = "https://firefly-api.adobe.io/v3/videos/generate";     // async: 202 with a status URL to poll
const SCOPES = "openid,AdobeID,firefly_api,ff_apis";

const SHOTS = [
  { n: 1, file: "01-seattle-dusk.mp4", still: "hero-aircraft-alpenglow.jpg",
    prompt: "Cinematic wide shot of Seattle at dusk seen from Elliott Bay, city lights switching on across the skyline, Mount Rainier faint on the horizon, a sleek near-future electric widebody airliner with deep navy upper fuselage, ivory lower fuselage and a blue to cyan to mint to amber swoosh painted up the tail climbing away over the water, the tail catching the last of the light, calm water with soft reflections, slow push in, photoreal, anamorphic, natural light, no text, no logos, no watermark." },
  { n: 2, file: "02-gate-welcome.mp4", still: "crew-portrait-gate.jpg",
    prompt: "Cinematic medium wide shot inside a modern airport gate at night, a flight attendant in a tailored midnight navy uniform with a small blue and amber scarf greeting a family with a warm laugh, seen from the side, a child of about six standing at the floor to ceiling window waving at the nose of an airliner in deep navy and ivory paint parked outside under warm ramp lights, terminal light against deep blue night glass, shallow depth of field, slow dolly right, photoreal, no text, no logos, no watermark." },
  { n: 3, file: "03-settling-in.mp4", still: "cabin-premium.jpg",
    prompt: "Cinematic medium shot inside a premium airliner cabin at boarding, deep navy seats with ivory headrests and a thin cyan seam, wide oval windows, a woman in her thirties in a dark wool coat dropping into a window seat with a big relieved grin and kicking her shoes off, two rows ahead a child peeking over a seat back and ducking down again, warm amber cabin light, slow push in, photoreal, no text, no logos, no watermark." },
  { n: 4, file: "04-window-seat.mp4", still: "traveller.png", fallback: "night-flight-tokyo-poster.jpg",
    prompt: "Cinematic medium close shot from a window seat just after takeoff at night, the wing tilting gently as the aircraft banks, a wide field of city lights sliding beneath the wing, a woman in her thirties in profile leaning toward the glass with quiet wonder, dim warm amber cabin light on the window frame, photoreal, no text, no logos, no watermark." },
  { n: 5, file: "05-cabin-night.mp4", still: "cabin-suite.jpg",
    prompt: "Cinematic medium shot down the aisle of a dimmed premium airliner cabin at night, deep navy seats with ivory headrests, a flight attendant in a midnight navy uniform seen from behind carrying two steaming bowls of noodles on a small tray, a few passengers lit by small warm reading lights, one laughing quietly, soft amber and deep blue light, slow dolly forward, photoreal, no text, no logos, no watermark." },
  { n: 6, file: "06-pacific-night.mp4", still: "hero-aircraft-alpenglow.jpg",
    prompt: "Cinematic wide shot of a sleek near-future electric widebody airliner in deep navy and ivory paint with a blue to cyan to mint to amber swoosh on the tail cruising alone high above the Pacific at night, a dense field of stars, a thin moonlit cloud deck far below, faint navigation lights, slow lateral camera drift, serene, photoreal, no text, no logos, no watermark." },
  { n: 7, file: "07-dawn-fuji.mp4", still: "traveller.png", fallback: null,
    prompt: "Cinematic medium shot from an airliner window at dawn over Japan, the horizon glowing from deep blue through cyan and pale mint to gold, the silhouette of Mount Fuji rising above a soft cloud layer, the wingtip in the lower corner, a woman's hand resting on the window frame, slow tilt down, photoreal, no text, no logos, no watermark." },
  { n: 8, file: "08-tokyo-arrival.mp4", still: "traveller.png", fallback: null,
    prompt: "Cinematic medium wide shot of a narrow Tokyo backstreet at golden hour, paper lanterns and small shopfronts, a woman in her thirties in a dark wool coat walking toward the camera with a small carry-on bag, looking around with delight, then turning back to wave someone over with a laugh, warm light, gentle bustle in the background, slow dolly forward, photoreal, no text, no logos, no watermark." },
];

function args() {
  const a = process.argv.slice(2);
  const get = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
  return {
    out: get("--out"),
    stills: get("--stills") || path.join(REPO, "prototype", "public", "assets", "dam", "media"),
    only: (get("--only") || "").split(",").map((s) => parseInt(s, 10)).filter(Boolean),
    dryRun: a.includes("--dry-run"),
  };
}

const log = (m) => console.log(m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function token(id, secret) {
  const body = new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret, scope: SCOPES });
  const r = await fetch(IMS_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!r.ok) throw new Error(`IMS token: HTTP ${r.status} ${await r.text()}`);
  return (await r.json()).access_token;
}

async function upload(auth, file) {
  const type = file.endsWith(".png") ? "image/png" : "image/jpeg";
  const r = await fetch(UPLOAD_URL, { method: "POST", headers: { ...auth, "Content-Type": type }, body: readFileSync(file) });
  if (!r.ok) throw new Error(`upload ${path.basename(file)}: HTTP ${r.status} ${await r.text()}`);
  const j = await r.json();
  return j.images?.[0]?.id || j.id;
}

/** The generate-video request body. Adjust to the current reference if a field is rejected. */
function payload(shot, imageId) {
  const body = {
    prompt: shot.prompt,
    sizes: [{ width: 1920, height: 1080 }],
    video: { duration: 5, fps: 24 },
    output: { format: "mp4" },
  };
  if (imageId) body.image = { conditions: [{ source: { uploadId: imageId }, placement: { position: 0 } }] };
  return body;
}

async function generate(auth, shot, imageId) {
  const r = await fetch(VIDEO_URL, { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify(payload(shot, imageId)) });
  if (!r.ok) throw new Error(`generate shot ${shot.n}: HTTP ${r.status} ${await r.text()}`);
  const j = await r.json();
  const statusUrl = j.statusUrl || j.links?.status?.href || r.headers.get("location");
  if (!statusUrl) throw new Error(`generate shot ${shot.n}: no status URL in ${JSON.stringify(j).slice(0, 300)}`);
  for (let i = 0; i < 120; i++) {
    await sleep(5000);
    const s = await fetch(statusUrl, { headers: auth });
    if (!s.ok) throw new Error(`status shot ${shot.n}: HTTP ${s.status}`);
    const sj = await s.json();
    const state = (sj.status || sj.state || "").toLowerCase();
    if (state === "succeeded" || state === "completed") {
      const url = sj.result?.outputs?.[0]?.video?.url || sj.outputs?.[0]?.video?.url;
      if (!url) throw new Error(`shot ${shot.n}: finished without an output URL: ${JSON.stringify(sj).slice(0, 300)}`);
      return url;
    }
    if (state === "failed" || state === "cancelled") throw new Error(`shot ${shot.n}: ${state} ${JSON.stringify(sj).slice(0, 300)}`);
    if (i % 6 === 5) log(`    shot ${shot.n}: ${state || "pending"}`);
  }
  throw new Error(`shot ${shot.n}: still running after 10 minutes`);
}

async function main() {
  const a = args();
  if (!a.out) { console.error("usage: node eds-blog/tools/firefly-generate.mjs --out <folder> [--stills <folder>] [--only 1,2] [--dry-run]"); process.exit(2); }
  mkdirSync(a.out, { recursive: true });
  const shots = SHOTS.filter((s) => !a.only.length || a.only.includes(s.n));
  const id = process.env.FIREFLY_CLIENT_ID, secret = process.env.FIREFLY_CLIENT_SECRET;
  if (!a.dryRun && (!id || !secret)) { console.error("set FIREFLY_CLIENT_ID and FIREFLY_CLIENT_SECRET in the environment (never in a file)"); process.exit(2); }

  const plan = shots.map((s) => {
    const target = path.join(a.out, s.file);
    const inOut = path.join(a.out, s.still);
    const inStills = path.join(a.stills, s.still);
    let still = existsSync(inOut) ? inOut : existsSync(inStills) ? inStills : null;
    if (!still && s.fallback) { const f = path.join(a.stills, s.fallback); if (existsSync(f)) still = f; }
    return { ...s, target, still, exists: existsSync(target) };
  });
  log(`Firefly Services: ${plan.length} shot(s) -> ${a.out}${a.dryRun ? " (dry run, nothing sent)" : ""}`);
  for (const p of plan) log(`  ${p.file.padEnd(24)} first frame ${p.still ? path.basename(p.still) : "none (text to video)"}${p.exists ? "  [exists, skipped]" : ""}`);
  if (a.dryRun) { log("\nFirst request would be:"); log(JSON.stringify(payload(plan[0], plan[0].still ? "<uploadId>" : null), null, 2)); return; }

  const auth = { Authorization: `Bearer ${await token(id, secret)}`, "x-api-key": id };
  const uploads = new Map();
  for (const p of plan) {
    if (p.exists) continue;
    let imageId = null;
    if (p.still) {
      if (!uploads.has(p.still)) { log(`  uploading ${path.basename(p.still)}`); uploads.set(p.still, await upload(auth, p.still)); }
      imageId = uploads.get(p.still);
    }
    log(`  generating shot ${p.n} (${p.file})`);
    const url = await generate(auth, p, imageId);
    const r = await fetch(url);
    if (!r.ok) throw new Error(`download shot ${p.n}: HTTP ${r.status}`);
    writeFileSync(p.target, Buffer.from(await r.arrayBuffer()));
    log(`  wrote ${p.target}`);
  }
  log("\nDone. Next: the voices folder and music.mp3, then python eds-blog/tools/assemble-film.py --clips " + a.out);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
