# The Journal

Document-authored Edge Delivery Services blog for Slalom Airlines, the fictional premium carrier this repository demonstrates Adobe technology with. Six articles ship in issue one: three stories, two podcast episodes with synthesized narration, and one short film. Everything renders locally with no remote content source and no external requests.

## Run it

```bash
npm --prefix eds-blog run up        # aem dev server on http://localhost:3000
node eds-blog/tools/validate.mjs    # the phase gate, run from anywhere
```

`npm run up` first runs `tools/ensure-git-stub.mjs`, then `npx -y @adobe/aem-cli up --no-open --url https://journal-local-placeholder.aem.page`.

**The git stub.** The aem CLI refuses to serve a directory that is not a git repository with an `origin` remote, and it never walks up to the monorepo's real `.git`. Phase 4 forbids real remotes, and a nested repository would stop the monorepo from tracking these files. So the stub script writes a three file `.git` (HEAD, one ref, a config whose origin URL is `.`) that git itself does not consider a repository at all: no `objects/` directory means the parent repo keeps tracking `eds-blog/` normally. Full reasoning in the script header.

**The placeholder URL.** The stub's unparsable origin makes the CLI fall back to the `--url` flag for its proxy base. `journal-local-placeholder.aem.page` is a never provisioned host with no `ref--site--org` shape, so it cannot ever route; only the CLI's own startup probes and any request that misses every local file would touch it, and the Journal is built so nothing misses. Browser traffic is 100 percent localhost (asserted in acceptance via request capture).

**Windows orphan processes.** On Windows, stopping the `npm run up` wrapper (Ctrl+C in some shells, or killing the npm PID) can orphan the CLI's node child, which keeps holding port 3000 and keeps watching files. If a later boot reports the port in use, find and kill the listener by PID:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object -ExpandProperty OwningProcess
taskkill /PID <pid> /T /F
```

`/T` takes the process tree with it, which is the part plain kills miss.

## Authoring story

Content lives in `content/` as **da.live storage format HTML**, not markdown. The aem CLI (16.21.15) renders documents through the production helix-html-pipeline, which consumes this format; it is the same shape `aem content push` uploads to da.live, so the documents here are real authoring documents, just versioned in git instead of a content bus. (The phase plan's original markdown wording was amended for this on 2026-09-02; see `docs/superpowers/plans/2026-09-02-phase4-eds-blog.md`, AMENDED block.)

A document is a `<body>` with `<header></header>`, `<main>` holding section `<div>`s, and `<footer></footer>`. Rules the validator enforces:

- One `<h1>`, first heading in the document.
- Articles carry a `div.metadata` block as the last block, INSIDE a section div, with Title, Description, Author, Date (ISO), Template, and Tags rows. Optional rows: Read time, Narration. The pipeline turns rows into head metadata (`Tags` becomes one `article:tag` meta per value) and the blocks read them back via `getMetadata`.
- `Template` is `article`, `podcast`, or `film` (the index uses `journal-home`). A `podcast` document must embed a `podcast-player` block, a `film` document a `video-story` block.
- Tags are `slalomair:<facet>/<value>` ids on the known facets (`page-type`, `journey`, `product`, `destination`); every Journal page carries `slalomair:page-type/editorial`.
- No em or en dashes anywhere in reader files, no retired brand terms (the same bans as the prototype's verify).
- Every `/media/...` reference must resolve to a committed file, and `content/query-index.json` (hand maintained, the local stand-in for the EDS query index service) must mirror `content/articles/` exactly.

**Deploy path.** At deploy time the documents move to a real da.live org (or a Drive/SharePoint mountpoint) via `aem content push`, `fstab.yaml` gets the real mountpoint, and the code side goes to a GitHub repository with the AEM Code Sync app so aem.page/aem.live builds serve it. The blocks, scripts, and styles need no changes; the hand maintained `query-index.json` is replaced by the platform's generated index (the cards block already fetches it by relative URL). The flagship site links here already: the header nav, the footer and the home page's From the Journal cards read `content/query-index.json` at build time and point at `SLAIR_JOURNAL_URL` (default `http://localhost:3000`, the `aem up` preview), so deployment is a build-time variable, not a code change.

## Surface

The Journal renders on the flagship site's midnight ground (2026-09-07; the original ivory paper surface was retired on review so the two sites read as one brand). Everything is driven by the tokens at the top of `styles/styles.css`: `--background-color`, `--text-color`, `--muted-color`, `--rule-color`, `--plate-color` and the link colors. The masthead's last item returns to the flagship site; set `window.SLAIR_SITE_URL` before `scripts.js` in a deployed `head.html` to point it at the real origin (default: the local author).

## Blocks (7)

`header`, `footer`, `hero`, `cards`, `article-header`, `podcast-player`, `video-story`. Every block registers itself on the Adobe Client Data Layer at decoration (`registerComponent`: a section 1.6 component entry plus `cmp:show`), per the dictionary's Journal appendix (`docs/architecture/data-layer-dictionary.md` section 1.1a).

## Web SDK bridge (CJA)

`scripts/edge-bridge.js` turns the data layer into XDM ExperienceEvents on the flagship datastream: the page view, `cmp:show`, `cmp:click` and the four `media:*` events, `eventType` `slalomair.<event>` with the payload under `_slalomair`, the same mapping the site uses. Set `slair-datastream-id`, `slair-org-id`, optionally `slair-edge-domain`, and `slair-alloy-src` (the Web SDK library URL your organization standardizes on, or a self-hosted copy) in `head.html` for a deployed Journal; with them empty, as in the repo, nothing third-party loads and every record goes to the edge simulator (`window.slairEdge.sent`, and `console.debug("[slair edge-sim]")`) so a demo can show the exact payloads. The CJA metrics built on these are in `docs/architecture/cja-data-views.md` section 2.2.

## Film call to action

A film whose document carries a `slalomair:destination/<code>` tag ends on "Book your trip to <city> now" over its last frame (the `video-story` block reveals it as the film ends). The button deep-links the site's booking card with the destination preselected (`/book?dest=<code>&origin=SEA`); "Watch again" restarts the film. Tracking: component `video-story-cta` with `cmp:show` on first appearance and `cmp:click { action: "book" | "replay", destination, mediaId, position }` per press.

## media:* events

The two media blocks wire `attachMediaTracking` from `scripts/datalayer.js` onto their audio or video element. Contract (dictionary section 2, Journal-only rows, all Live):

| Event | When |
|---|---|
| `media:start` | First successful playback start, once per page view. Nothing autoplays, so this is always visitor initiated. |
| `media:pause` | Visitor pauses (player toggle or native controls). Never fired for the automatic pause at end of media. |
| `media:progress` | Playhead crosses 25, 50, 75 percent of duration, each once per page view, by playback or by seeking. Payload adds `milestone`. |
| `media:complete` | Playback reaches the end, once per page view. |

Shared payload: `{ mediaType: "audio"|"video", mediaId, title, duration, position }`, times in whole seconds. `mediaId` is the host article's slug, not the media file's basename: Journal media is one piece per article (the shipped film plays `night-flight-tokyo.mp4` as article `night-flight-tokyo`).

## Podcast audio

The two episodes are **synthesized demo narration** and are labeled as such on the player and in each article's Narration metadata row. Each was generated from the committed script beside it (`media/<slug>-narration.md`) with Microsoft neural TTS (edge voices AndrewMultilingual and EmmaMultilingual; previously Windows SAPI text to speech (System.Speech; David for `electric-quiet`, Zira for `crew-first-day`, rate -1) and converted from wav to mp3 with ffmpeg (`-codec:a libmp3lame -q:a 4`). Both run 83 to 84 seconds. To regenerate, re-run that pipeline against the narration script; keep the label.

## Media provenance

Imagery is copied from the prototype's DAM (`prototype/public/assets/dam/media/`), committed here rather than hotlinked across roots so the Journal stays self contained. The film, `night-flight-tokyo.mp4`, is a generated short (OpenArt, 2026-09-07; every person in it is synthetic, 30 seconds, no end card: the booking call to action is the ending); its poster `night-flight-tokyo-poster.jpg` is a frame from it and also lives in the prototype's DAM for the site's Journal cards. `brand-film-loop.mp4` stays as the home page's hero footage source.

The film's next version is a 40 second commercial cut from eight Adobe Firefly clips on the site's own aircraft, cabin, seats and crew (the brand stills are the Image to video references), with voice lines, a music bed and a closing Slalom Airlines logo card: the production brief with the shot list, prompts, reference kit, voice script, title cards and music direction is `media/night-flight-tokyo-commercial.md`, and `tools/assemble-film.py` (Python 3 with `pillow` and `imageio-ffmpeg`) turns the downloaded clips, the voice files and the music into the finished file and its poster frame (voices ducked under the music, a missing voice line skipped with a note). The title fonts it draws with are in `tools/fonts/` under the SIL Open Font License; the logo card is drawn from `tools/assets/slalom-logo.png`, the site's header mark rasterised.
