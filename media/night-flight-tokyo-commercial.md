# Night flight to Tokyo: the 30 second spot

The film on `/articles/night-flight-tokyo` is a 30 second commercial for the Seattle to Tokyo nonstop, cut from six 5 second clips generated in Adobe Firefly, with title cards and a music bed added in the edit. The page's "Book your trip to Tokyo now" call to action is the ending, so the spot itself carries no end card, no logo lockup and no legal line.

This document is the production brief: what to type into Firefly, in what order, and what to send back. `eds-blog/tools/assemble-film.py` turns the six clips into the finished file.

## Ground rules (from HANDOFF.md, non-negotiable)

- Fictional brand. No real airline livery, logo, aircraft registration or airport signage. If Firefly puts a real carrier's colours on the aircraft, regenerate.
- Aircraft canon: a near-future electric airliner, clean deep navy and ivory paint, no glow lines, no fantasy shapes. Think a slightly smoother widebody.
- Everyone on screen is synthetic. No real faces, no likeness prompts.
- No text in the generated frames. Firefly renders lettering badly, and every title in the spot is added in the edit from the brand fonts. Ask for "no text, no logos, no watermark" in every prompt.
- Copy register: real airline voice. The tagline is exactly "Fly the world." and it appears once, on the last card. No ski metaphors.
- Gradient restraint: the Horizon Spectrum (blue through cyan and mint to gold) belongs to the sky at dawn in shot 5, nowhere else. Everywhere else the palette is night blues, warm cabin amber and ivory.

## Firefly settings

- Firefly web app, Generate video. Text to video for every shot; switch to Image to video for any shot where the first result drifts off brand, using a Firefly still of the same prompt as the keyframe.
- Aspect ratio 16:9 (landscape). Highest resolution the plan allows; the assembler normalises everything to 1920 by 1080 at 24 frames per second.
- Duration: the longest clip the app offers. The brief assumes 5 second clips; if the app now offers longer ones, generate the shots at 5 seconds anyway so the cut keeps its rhythm.
- Camera and style controls: set the shot size and camera motion the brief gives for each shot rather than only describing them in the prompt; Firefly honours the controls more reliably than prose.
- Generate three variations per shot and keep the one with the steadiest motion and no lettering. Slow, single-direction camera moves cut together better than anything busy.
- Download as MP4 and name the files exactly as listed. Put all six in one folder.

Confirm before relying on it: the clip length, resolution and camera controls above are described from the Firefly app as it stood before this brief was written; check the current Generate video panel, since those limits change between releases.

## Shot list

Runtime 30 seconds: six shots of 5 seconds joined with half second cross dissolves (27.5 seconds of footage), and the last shot holds its final frame for 2.5 seconds under the closing title, the way a spot lands on its line.

| # | Time | File name | Story beat | Camera |
|---|---|---|---|---|
| 1 | 0 to 5 | `01-seattle-dusk.mp4` | Seattle at dusk from the water, the city lights coming on, an airliner climbing out in the distance | Wide, slow push in |
| 2 | 5 to 10 | `02-boarding.mp4` | A traveller at the gate at night, boarding pass on the phone, calm and unhurried | Medium, slow dolly right |
| 3 | 10 to 15 | `03-window-seat.mp4` | The window seat after takeoff, wing tilting over a field of city lights, the cabin dim and warm | Medium close, handheld stillness |
| 4 | 15 to 20 | `04-pacific-night.mp4` | The aircraft alone above the Pacific under a full field of stars, a thin moonlit cloud deck below | Wide, slow lateral drift |
| 5 | 20 to 25 | `05-dawn-fuji.mp4` | Dawn breaking over Japan from the window, the Horizon Spectrum in the sky, Mount Fuji's silhouette | Medium, slow tilt down |
| 6 | 25 to 30 | `06-tokyo-arrival.mp4` | A Tokyo backstreet at golden hour, lanterns, the traveller walking into the frame with a small bag | Medium wide, slow dolly forward |

## Prompts

Paste each one as written. The camera and style are repeated in the prose so the description and the controls agree.

**Shot 1, `01-seattle-dusk.mp4`**

> Cinematic wide shot of Seattle at dusk seen from Elliott Bay, city lights switching on across the skyline, Mount Rainier faint on the horizon, a sleek near-future electric airliner with clean deep navy and ivory paint climbing away in the far distance, calm water with soft reflections, slow push in, photoreal, anamorphic, natural light, no text, no logos, no watermark.

**Shot 2, `02-boarding.mp4`**

> Cinematic medium shot inside a modern airport gate at night, a woman in her thirties in a dark wool coat holding a phone with a boarding pass on the screen, glancing up toward the jet bridge with a small smile, warm terminal light against deep blue night windows, an airliner nose in clean navy and ivory paint just visible outside, shallow depth of field, slow dolly right, photoreal, no text, no logos, no watermark.

**Shot 3, `03-window-seat.mp4`**

> Cinematic medium close shot from a window seat just after takeoff at night, the wing tilting gently as the aircraft banks, a wide field of city lights sliding beneath the wing, dim warm amber cabin light on the window frame, a hand resting near the window, quiet and still, photoreal, no text, no logos, no watermark.

**Shot 4, `04-pacific-night.mp4`**

> Cinematic wide shot of a sleek near-future electric airliner in clean deep navy and ivory paint cruising alone high above the Pacific at night, a dense field of stars, a thin moonlit cloud deck far below, faint navigation lights, slow lateral camera drift, serene, photoreal, no text, no logos, no watermark.

**Shot 5, `05-dawn-fuji.mp4`**

> Cinematic medium shot from an airliner window at dawn over Japan, the horizon glowing from deep blue through cyan and pale mint to gold, the silhouette of Mount Fuji rising above a soft cloud layer, the wingtip in the lower corner, slow tilt down, photoreal, no text, no logos, no watermark.

**Shot 6, `06-tokyo-arrival.mp4`**

> Cinematic medium wide shot of a narrow Tokyo backstreet at golden hour, paper lanterns and small shopfronts, a woman in her thirties in a dark wool coat walking toward the camera with a small carry-on bag, looking up and around with quiet delight, warm light, gentle bustle in the background, slow dolly forward, photoreal, no text, no logos, no watermark.

The traveller in shots 2 and 6 should read as the same person. Generate shot 2 first, keep the result you like, then describe her the same way in shot 6 (or use a Firefly still of her as the Image to video keyframe for both).

## Title cards (added in the edit, not in Firefly)

Fraunces for the line, Inter for the small line, ivory on the footage with a soft shadow, lower third, each holding about 2.5 seconds.

| Time | Line | Small line |
|---|---|---|
| 1.0 to 3.5 | Seattle, 6:40 pm. | |
| 12.0 to 14.5 | Ten and a half hours. | One night the calendar never sees. |
| 21.0 to 23.5 | Tokyo, the next evening. | |
| 26.5 to 29.5 | Fly the world. | Seattle to Tokyo, nonstop, every day. |

## Sound

- Music: one 30 second bed, slow and warm, strings or soft piano with a lift at the dawn shot. Firefly does not compose music; take a royalty free track from Adobe Stock audio or the Adobe Express library, export as MP3 or WAV, and name it `music.mp3` in the same folder. The assembler fades it out over the last two seconds.
- Voice: none. The title cards carry the words. If a voice is wanted later, the spot has room for one line under shot 4: "Some nights are worth crossing."
- Clip audio: Firefly clips have no usable sound; the assembler drops it.

## Hand-off

Put the six clips (and `music.mp3` if you have one) in one folder and either send them to me, or run:

```
python eds-blog/tools/assemble-film.py --clips <folder> --out eds-blog/media/night-flight-tokyo.mp4
```

The script needs Python 3 with `pip install pillow imageio-ffmpeg`. It writes the film and a fresh poster frame, and `node eds-blog/tools/validate.mjs` then checks the article still resolves both.
