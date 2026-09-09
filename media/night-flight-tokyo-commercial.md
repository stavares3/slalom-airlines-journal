# Night flight to Tokyo: the 40 second commercial

The film on `/articles/night-flight-tokyo` is a commercial for the Seattle to Tokyo nonstop: fun, friendly, warm, with music throughout and people talking now and then. It is cut from eight 5 second clips generated in Adobe Firefly on the Slalom Airlines aircraft, cabin, seats and crew the site already shows, with the voice lines, title cards, a music bed and the Slalom Airlines logo card added in the edit. The page's "Book your trip to Tokyo now" call to action rises over the logo card, so the spot ends on the brand and hands straight to booking.

This document is the production brief: what to type into Firefly, in what order, which reference stills to attach so every shot shows the same airline, what to record for the voices, and what to send back. `eds-blog/tools/assemble-film.py` turns the clips, the voice files and the music into the finished film.

## Ground rules (from HANDOFF.md, non-negotiable)

- Fictional brand. No real airline livery, logo, aircraft registration or airport signage. If Firefly puts a real carrier's colours on the aircraft, regenerate.
- The aircraft is the site's aircraft, every time: a near-future electric widebody, deep midnight navy upper fuselage, ivory lower third, the Horizon Spectrum swoosh (blue, cyan, mint, amber) carved up the tail fin only, plain navy and ivory raked split wingtips, serif SLALOM titles on the forward fuselage. Clean paint, no glowing strips, no neon lines, no pods hanging under the wing. `hero-aircraft-alpenglow.jpg` (and its mobile crop) is the only aircraft canon on the site. Do not use `tail-livery-closeup.jpg` (the swoosh painted on a winglet) or `ground-crew-dawn.jpg` (a white and grey tail, no titles, a podded engine) as references; each is a different aircraft. If a shot needs the aircraft on the ground, generate that still in Text to image from the in-flight image first.
- The cabin is the site's cabin: the navy and ivory seats with the thin cyan seam, warm amber reading light, the wide oval windows from `cabin-premium.jpg` and `cabin-suite.jpg`.
- Crew wear the tailored midnight navy uniform with the small Horizon Spectrum scarf or pocket square from `crew-portrait-gate.jpg`. No readable name tags.
- Everyone on screen is synthetic. No real faces, no likeness prompts.
- No text in the generated frames. Firefly renders lettering badly; every title and the logo are added in the edit. Ask for "no text, no logos, no watermark" in every prompt. The SLALOM titles on the aircraft come from the reference still, not from the prompt.
- Copy register: real airline voice, light and kind. The tagline is exactly "Fly the world." and it appears once, on the logo card. No ski metaphors.
- Gradient restraint: the Horizon Spectrum belongs to the tail and to the dawn sky in shot 7, nowhere else. Everywhere else the palette is night blues, warm cabin amber and ivory.

## Reference stills (the consistency kit)

Firefly's Generate video takes a first frame (Image to video) and, in the current app, a style or composition reference for text to video. Use the site's own imagery so the aircraft, livery, seats and crew match the site:

| File | Use it for | Where |
|---|---|---|
| `hero-aircraft-alpenglow.jpg` | The aircraft in flight (shots 1 and 6): livery, wing shape, tail swoosh | `eds-blog/media/` and `prototype/public/assets/dam/media/` |
| `hero-aircraft-alpenglow-mobile.jpg` | The same aircraft filling the frame, SLALOM titles legible: the parked nose behind the gate window (shot 2) | `prototype/public/assets/dam/media/` |
| `cabin-premium.jpg` | The seats, seam colour and window shape (shots 3 and 5) | `eds-blog/media/` |
| `cabin-suite.jpg` | The dimmed cabin at night (shot 5) | `eds-blog/media/` |
| `crew-portrait-gate.jpg` | The crew uniform and the scarf accent (shots 2 and 5) | `eds-blog/media/` |
| `night-flight-tokyo-poster.jpg` | The window seat framing (shot 4) | `eds-blog/media/` |

Workflow per shot: generate a still first in Text to image with the shot prompt and the reference attached, pick the frame that matches the site, then run Image to video from that frame with the camera move. That keeps the livery and the seats stable, which text to video alone does not.

## Firefly settings

- Firefly web app, Generate video. The only still input is the First frame under Frames (the Composition and Motion boxes take video); use it for every shot that shows the aircraft, cabin or crew (shots 1 to 7), and leave Last empty. With a First frame set, Firefly hides the camera motion presets, so the camera move comes from the prompt. Text to video is fine for shot 8.
- Aspect ratio 16:9 (landscape). Highest resolution the plan allows; the assembler normalises everything to 1920 by 1080 at 24 frames per second.
- Duration: 5 seconds per shot. If the app offers longer clips, generate at 5 seconds anyway so the cut keeps its rhythm.
- Camera and style controls: set the shot size and camera motion from the shot list in the panel as well as in the prompt; Firefly honours the controls more reliably than prose.
- Generate three variations per shot and keep the one with the steadiest motion and no lettering. Slow, single-direction camera moves cut together best.
- People talking: Firefly does not lip-sync. Every spoken line lands on a shot where the speaker's mouth is not the point of the frame (over the shoulder, from behind, in profile at a distance, or off screen). The prompts below are written that way; keep it that way if you re-frame.
- Download as MP4 and name the files exactly as listed. Put all eight in one folder.

Confirm before relying on it: clip length, resolution, the reference image controls and the audio features named below are described from the Firefly app as it stood before this brief was written; check the current Generate video, Generate speech and Generate soundtrack panels, since those change between releases.

## Shot list

Runtime 40 seconds of footage plus a 3 second logo card: eight shots of 5 seconds joined with half second cross dissolves, the last shot dissolving into the logo card, the way a spot lands on its brand.

| # | Time | File name | Story beat | Camera |
|---|---|---|---|---|
| 1 | 0 to 5 | `01-seattle-dusk.mp4` | Seattle at dusk from the water, city lights coming on, the Slalom aircraft climbing out, tail swoosh catching the last light | Wide, slow push in |
| 2 | 5 to 10 | `02-gate-welcome.mp4` | The gate at night, a crew member in the navy uniform greeting a family, a small child waving at the aircraft nose outside the window | Medium wide, slow dolly right |
| 3 | 10 to 15 | `03-settling-in.mp4` | Inside the cabin, a traveller sinking into the navy and ivory seat with a grin, the child two rows ahead peeking over a seat back | Medium, slow push in |
| 4 | 15 to 20 | `04-window-seat.mp4` | The window seat after takeoff, the wing tilting over a field of city lights, the traveller in profile leaning to the glass | Medium close, handheld stillness |
| 5 | 20 to 25 | `05-cabin-night.mp4` | The dimmed cabin at cruise, a crew member from behind carrying two steaming bowls down the aisle, a few faces lit by small reading lights | Medium, slow dolly forward |
| 6 | 25 to 30 | `06-pacific-night.mp4` | The aircraft alone above the Pacific under a full field of stars, a thin moonlit cloud deck below | Wide, slow lateral drift |
| 7 | 30 to 35 | `07-dawn-fuji.mp4` | Dawn over Japan from the window, the Horizon Spectrum in the sky, Mount Fuji's silhouette, the traveller's hand on the glass | Medium, slow tilt down |
| 8 | 35 to 40 | `08-tokyo-arrival.mp4` | A Tokyo backstreet at golden hour, lanterns, the traveller walking into frame with a small bag, turning to wave someone over | Medium wide, slow dolly forward |
| card | 40 to 43 | (drawn by the assembler) | Slalom Airlines logo on the navy ground, "Fly the world." under it | Static |

## Prompts

Paste each one as written. The camera and style are repeated in the prose so the description and the controls agree. Where a reference still is named, attach it.

**Shot 1, `01-seattle-dusk.mp4`** (reference: `hero-aircraft-alpenglow.jpg`)

> Cinematic wide shot of Seattle at dusk seen from Elliott Bay, city lights switching on across the skyline, Mount Rainier faint on the horizon, a sleek near-future electric widebody airliner with deep navy upper fuselage, ivory lower fuselage and a blue to cyan to mint to amber swoosh painted up the tail climbing away over the water, the tail catching the last of the light, calm water with soft reflections, slow push in, photoreal, anamorphic, natural light, no text, no logos, no watermark.

**Shot 2, `02-gate-welcome.mp4`** (references: `crew-portrait-gate.jpg` for the uniform; `hero-aircraft-alpenglow-mobile.jpg` for the aircraft outside the window)

> Cinematic medium wide shot inside a modern airport gate at night, a flight attendant in a tailored midnight navy uniform with a small blue and amber scarf greeting a family with a warm laugh, seen from the side, a child of about six standing at the floor to ceiling window waving at the nose of an airliner in deep navy and ivory paint parked outside under warm ramp lights, terminal light against deep blue night glass, shallow depth of field, slow dolly right, photoreal, no text, no logos, no watermark.

**Shot 3, `03-settling-in.mp4`** (reference: `cabin-premium.jpg`)

> Cinematic medium shot inside a premium airliner cabin at boarding, deep navy seats with ivory headrests and a thin cyan seam, wide oval windows, a woman in her thirties in a dark wool coat dropping into a window seat with a big relieved grin and kicking her shoes off, two rows ahead a child peeking over a seat back and ducking down again, warm amber cabin light, slow push in, photoreal, no text, no logos, no watermark.

**Shot 4, `04-window-seat.mp4`** (reference: `night-flight-tokyo-poster.jpg`)

> Cinematic medium close shot from a window seat just after takeoff at night, the wing tilting gently as the aircraft banks, a wide field of city lights sliding beneath the wing, a woman in her thirties in profile leaning toward the glass with quiet wonder, dim warm amber cabin light on the window frame, photoreal, no text, no logos, no watermark.

**Shot 5, `05-cabin-night.mp4`** (references: `cabin-suite.jpg`, `crew-portrait-gate.jpg`)

> Cinematic medium shot down the aisle of a dimmed premium airliner cabin at night, deep navy seats with ivory headrests, a flight attendant in a midnight navy uniform seen from behind carrying two steaming bowls of noodles on a small tray, a few passengers lit by small warm reading lights, one laughing quietly, soft amber and deep blue light, slow dolly forward, photoreal, no text, no logos, no watermark.

**Shot 6, `06-pacific-night.mp4`** (reference: `hero-aircraft-alpenglow.jpg`)

> Cinematic wide shot of a sleek near-future electric widebody airliner in deep navy and ivory paint with a blue to cyan to mint to amber swoosh on the tail cruising alone high above the Pacific at night, a dense field of stars, a thin moonlit cloud deck far below, faint navigation lights, slow lateral camera drift, serene, photoreal, no text, no logos, no watermark.

**Shot 7, `07-dawn-fuji.mp4`**

> Cinematic medium shot from an airliner window at dawn over Japan, the horizon glowing from deep blue through cyan and pale mint to gold, the silhouette of Mount Fuji rising above a soft cloud layer, the wingtip in the lower corner, a woman's hand resting on the window frame, slow tilt down, photoreal, no text, no logos, no watermark.

**Shot 8, `08-tokyo-arrival.mp4`**

> Cinematic medium wide shot of a narrow Tokyo backstreet at golden hour, paper lanterns and small shopfronts, a woman in her thirties in a dark wool coat walking toward the camera with a small carry-on bag, looking around with delight, then turning back to wave someone over with a laugh, warm light, gentle bustle in the background, slow dolly forward, photoreal, no text, no logos, no watermark.

The traveller in shots 3, 4, 7 and 8 should read as the same person. Generate shot 3 first, keep the still you like, and use it as the reference for the other three. The crew member in shots 2 and 5 should read as the same person the same way.

## Voices (recorded separately, added in the edit)

Three voices: a warm narrator (the airline's voice, unhurried, a smile in it), the traveller (bright, a little cheeky), and the crew member (kind, calm). Each line is its own audio file in a `voices` folder beside the clips, named exactly as listed. The assembler places each file at its start time and ducks the music under it.

Where to make them: Firefly's Generate speech (in the Firefly app) or Adobe Express text to speech, one line per file, exported as MP3; or record a person. The podcasts in this Journal use synthesized narration and say so, and the same label applies here: the site's film metadata already notes that every voice is synthetic.

| Id | File | Start | Over shot | Voice | Line |
|---|---|---|---|---|---|
| v1 | `v1-narrator.mp3` | 1.0 | 1 | Narrator | Seattle, twenty to seven. Dinner reservation, Tokyo. Tomorrow. |
| v2 | `v2-crew.mp3` | 6.0 | 2 | Crew | Welcome aboard. We saved you the window. |
| v3 | `v3-traveller.mp3` | 11.5 | 3 | Traveller | Shoes off. Don't judge me. |
| v4 | `v4-traveller.mp3` | 16.5 | 4 | Traveller | Okay. That is a view. |
| v5 | `v5-crew.mp3` | 21.0 | 5 | Crew | Tea, or the good noodles? |
| v6 | `v6-traveller.mp3` | 23.0 | 5 | Traveller | The noodles. Obviously the noodles. |
| v7 | `v7-narrator.mp3` | 26.0 | 6 | Narrator | Ten and a half hours. One night the calendar never sees. |
| v8 | `v8-narrator.mp3` | 31.0 | 7 | Narrator | Good morning, Tokyo. |
| v9 | `v9-traveller.mp3` | 36.5 | 8 | Traveller | Told you I'd make dinner. |
| v10 | `v10-narrator.mp3` | 40.5 | card | Narrator | Slalom Airlines. Fly the world. |

Keep each line under 3 seconds when read; the assembler does not stretch the shots. A missing voice file is skipped with a note, so the spot can be cut before all ten exist.

## Title cards (drawn by the assembler)

Fraunces for the line, Inter for the small line, ivory on the footage with a soft shadow, lower third, each holding about 2.5 seconds. They sit where no one is speaking or double the narrator, never compete with a dialogue line.

| Time | Line | Small line |
|---|---|---|
| 2.0 to 4.5 | Seattle, 6:40 pm. | |
| 27.0 to 29.5 | Ten and a half hours. | One night the calendar never sees. |
| 32.5 to 34.5 | Tokyo, the next evening. | |

The logo card (40 to 43 seconds) carries the Slalom Airlines mark from `eds-blog/tools/assets/slalom-logo.png` (the site's header logo, rasterised) with "Fly the world." under it and "Seattle to Tokyo, nonstop, every day." in the small line. The Journal's booking call to action rises over it as the film ends.

## Music

- One bed of at least 43 seconds, warm and light: piano and pizzicato strings with soft brushed percussion, a lift into the dawn at 30 seconds, resolving under the logo card. Think a friendly travel spot, not a ballad.
- Where to get it: Adobe Stock audio or the Adobe Express library (royalty free, export MP3 or WAV), or Firefly's Generate soundtrack with a prompt such as "warm, light, optimistic travel commercial, piano and pizzicato strings, soft brushed percussion, 43 seconds, lift at 30 seconds, gentle resolve". Name it `music.mp3` and put it beside the clips.
- The assembler holds the music at 90 percent, ducks it to 30 percent for the length of each voice line, and fades it out over the last two seconds.
- Clip audio: Firefly clips carry no usable sound; the assembler drops it. Room tone and the small sounds (a seatbelt chime under shot 3, cabin air under shots 4 and 5) can come from Firefly's Generate sound effects or Adobe Stock; if you make them, name them `sfx-<id>.mp3` and list them in the `--sfx` option the same way as voices (see the assembler's help).

## Hand-off

Put the eight clips, the `voices` folder and `music.mp3` in one folder and either send them to me, or run:

```
python eds-blog/tools/assemble-film.py --clips <folder> --out eds-blog/media/night-flight-tokyo.mp4
```

The script needs Python 3 with `pip install pillow imageio-ffmpeg`. It writes the film and a fresh poster frame, and `node eds-blog/tools/validate.mjs` then checks the article still resolves both. Voice files it cannot find are listed and skipped, so a first cut with clips and music alone is fine.
