#!/usr/bin/env python3
"""
assemble-film.py: cut the Night flight to Tokyo commercial from eight generated clips.

    python eds-blog/tools/assemble-film.py --clips <folder> [--out eds-blog/media/night-flight-tokyo.mp4]
                                           [--voices <folder>] [--music <file>] [--sfx <file>@<sec>,...]
                                           [--no-titles] [--no-card] [--poster-at 17.0]

The folder holds the clips named in eds-blog/media/night-flight-tokyo-commercial.md
(01-seattle-dusk.mp4 ... 08-tokyo-arrival.mp4). Each is trimmed to its 5 second
slot, normalised to 1920x1080 at 24 fps with no audio, holds its last frame for
the half second cross dissolve into the next shot (so shot k runs from 5k to
5k+5 on the finished timeline, exactly as the brief says), and the last shot
dissolves into a 3 second logo card drawn from tools/assets/slalom-logo.png.
Title cards (Fraunces and Inter, drawn with Pillow) are overlaid at the times in
TITLES. The voice lines in VOICES are placed at their start times from the
voices folder (a missing line is skipped with a note), the music bed is held at
90 percent, ducked to 30 percent under every voice line and faded out over the
last two seconds, and the film is written as H.264 with faststart. A poster
frame is written beside it as <out stem>-poster.jpg.

Needs Python 3.9+ with `pip install pillow imageio-ffmpeg`. No other tooling.
"""
import argparse, re, subprocess, sys, tempfile
from pathlib import Path

try:
    import imageio_ffmpeg
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit("pip install pillow imageio-ffmpeg")

HERE = Path(__file__).resolve().parent
FONTS = HERE / "fonts"
LOGO = HERE / "assets" / "slalom-logo.png"
W, H, FPS = 1920, 1080, 24
SLOT = 5.0          # seconds per shot on the finished timeline
XFADE = 0.5         # cross dissolve length; each clip holds its last frame this long so the slot stays 5.0s
CARD = 3.0          # the logo card at the end
CLIPS = ["01-seattle-dusk", "02-gate-welcome", "03-settling-in", "04-window-seat",
         "05-cabin-night", "06-pacific-night", "07-dawn-fuji", "08-tokyo-arrival"]
TITLES = [
    {"start": 2.0, "end": 4.5, "line": "Seattle, 6:40 pm.", "small": ""},
    {"start": 27.0, "end": 29.5, "line": "Ten and a half hours.", "small": "One night the calendar never sees."},
    {"start": 32.5, "end": 34.5, "line": "Tokyo, the next evening.", "small": ""},
]
CARD_LINE, CARD_SMALL = "Fly the world.", "Seattle to Tokyo, nonstop, every day."
# id, start second; the file is <id>-*.mp3|wav|m4a in the voices folder
VOICES = [("v1", 1.0), ("v2", 6.0), ("v3", 11.5), ("v4", 16.5), ("v5", 21.0),
          ("v6", 23.0), ("v7", 26.0), ("v8", 31.0), ("v9", 36.5), ("v10", 40.5)]
MUSIC_LEVEL, DUCK_LEVEL = 0.9, 0.3
IVORY = (244, 240, 232, 255)
MIST = (200, 208, 222, 255)
SPACE = (6, 13, 31, 255)

def ffmpeg():
    return imageio_ffmpeg.get_ffmpeg_exe()

def run(args):
    res = subprocess.run([ffmpeg(), "-hide_banner", "-loglevel", "error", "-y", *args], capture_output=True, text=True)
    if res.returncode != 0:
        sys.exit(f"ffmpeg failed:\n{res.stderr}")

def duration(path: Path) -> float:
    """Seconds of media in the file, read from ffmpeg's own probe line (no ffprobe needed)."""
    res = subprocess.run([ffmpeg(), "-hide_banner", "-i", str(path)], capture_output=True, text=True)
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.?\d*)", res.stderr)
    if not m:
        sys.exit(f"could not read the duration of {path}")
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))

def find_clip(folder: Path, stem: str) -> Path:
    for ext in ("mp4", "mov", "webm", "m4v"):
        p = folder / f"{stem}.{ext}"
        if p.exists():
            return p
    # tolerate Firefly's own download names when the number prefix is kept
    for p in sorted(folder.iterdir()):
        if p.suffix.lower() in (".mp4", ".mov", ".webm", ".m4v") and p.name.startswith(stem[:2]):
            return p
    sys.exit(f"missing clip {stem}.mp4 in {folder}")

def find_voice(folder: Path, vid: str):
    if not folder.exists():
        return None
    for p in sorted(folder.iterdir()):
        if p.suffix.lower() in (".mp3", ".wav", ".m4a", ".aac") and (p.stem == vid or p.name.startswith(vid + "-")):
            return p
    return None

def title_card(spec, path: Path):
    """A transparent 1920x1080 PNG carrying one lower third title."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    big = ImageFont.truetype(str(FONTS / "fraunces.ttf"), 96)
    small = ImageFont.truetype(str(FONTS / "inter.ttf"), 34)
    x, y = 120, 780
    # soft shadow, then the line
    for dx, dy in ((0, 4), (2, 2)):
        d.text((x + dx, y + dy), spec["line"], font=big, fill=(6, 13, 31, 140))
    d.text((x, y), spec["line"], font=big, fill=IVORY)
    if spec.get("small"):
        d.text((x + 2, y + 122), spec["small"], font=small, fill=(6, 13, 31, 120))
        d.text((x, y + 120), spec["small"], font=small, fill=MIST)
    img.save(path)

def logo_card(path: Path):
    """The closing frame: the Slalom Airlines mark centred on the site's dark ground, the tagline under it."""
    img = Image.new("RGBA", (W, H), SPACE)
    d = ImageDraw.Draw(img)
    if LOGO.exists():
        logo = Image.open(LOGO).convert("RGBA")
        logo = logo.crop(logo.getbbox())
        scale = 820 / logo.width
        logo = logo.resize((int(logo.width * scale), int(logo.height * scale)), Image.LANCZOS)
        img.alpha_composite(logo, ((W - logo.width) // 2, 360))
    big = ImageFont.truetype(str(FONTS / "fraunces.ttf"), 84)
    small = ImageFont.truetype(str(FONTS / "inter.ttf"), 32)
    for text, font, y, fill in ((CARD_LINE, big, 600, IVORY), (CARD_SMALL, small, 712, MIST)):
        w = d.textlength(text, font=font)
        d.text(((W - w) / 2, y), text, font=font, fill=fill)
    # the thin accent rule the site draws under its headings
    d.rectangle((W // 2 - 36, 780, W // 2 + 36, 783), fill=(79, 201, 232, 255))
    img.convert("RGB").save(path)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--clips", required=True)
    ap.add_argument("--out", default=str(HERE.parent / "media" / "night-flight-tokyo.mp4"))
    ap.add_argument("--voices", default=None, help="folder with v1-*.mp3 ... v10-*.mp3 (default: <clips>/voices)")
    ap.add_argument("--music", default=None)
    ap.add_argument("--sfx", default="", help="comma separated <file>@<second> placements, e.g. chime.mp3@10.5")
    ap.add_argument("--no-titles", action="store_true")
    ap.add_argument("--no-card", action="store_true")
    ap.add_argument("--poster-at", type=float, default=17.0, help="second of the finished film used for the poster frame")
    a = ap.parse_args()
    folder = Path(a.clips)
    out = Path(a.out)
    voices_dir = Path(a.voices) if a.voices else folder / "voices"
    music = Path(a.music) if a.music else (folder / "music.mp3" if (folder / "music.mp3").exists() else None)
    clips = [find_clip(folder, s) for s in CLIPS]
    total = SLOT * len(clips) + (CARD if not a.no_card else XFADE)

    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        # 1. normalise every clip: exact slot length plus the dissolve hold, size, frame rate, no audio
        norm = []
        for i, c in enumerate(clips):
            n = tmp / f"n{i}.mp4"
            # -t before -i trims the input; after it, it would cut the output and drop the tpad hold
            run(["-t", str(SLOT), "-i", str(c), "-an",
                 "-vf", f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,fps={FPS},format=yuv420p,"
                        f"tpad=stop_mode=clone:stop_duration={XFADE}",
                 "-c:v", "libx264", "-preset", "medium", "-crf", "17", str(n)])
            norm.append(n)
        if not a.no_card:
            card_png = tmp / "card.png"
            logo_card(card_png)
            card = tmp / "card.mp4"
            run(["-loop", "1", "-i", str(card_png), "-t", str(CARD), "-vf", f"fps={FPS},format=yuv420p",
                 "-c:v", "libx264", "-preset", "medium", "-crf", "17", str(card)])
            norm.append(card)
        # 2. cross dissolve chain: shot k occupies [5k, 5k+5]; the dissolve eats the held last frame
        inputs = []
        for n in norm:
            inputs += ["-i", str(n)]
        chain, prev = [], "[0:v]"
        for i in range(1, len(norm)):
            offset = SLOT * i
            label = f"[x{i}]" if i < len(norm) - 1 else "[v]"
            chain.append(f"{prev}[{i}:v]xfade=transition=fade:duration={XFADE}:offset={offset:.3f}{label}")
            prev = label
        joined = tmp / "joined.mp4"
        run([*inputs, "-filter_complex", ";".join(chain), "-map", "[v]", "-t", f"{total:.3f}",
             "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", str(joined)])
        # 3. title cards
        current = joined
        if not a.no_titles:
            cards = []
            for i, t in enumerate(TITLES):
                p = tmp / f"t{i}.png"
                title_card(t, p)
                cards.append((p, t))
            inputs = ["-i", str(current)]
            for p, _ in cards:
                inputs += ["-loop", "1", "-i", str(p)]
            fc, prev = [], "[0:v]"
            for i, (_, t) in enumerate(cards):
                fade = 0.4
                # fade the card in and out through its alpha, then overlay only in its window
                fc.append(f"[{i+1}:v]format=rgba,fade=t=in:st={t['start']}:d={fade}:alpha=1,fade=t=out:st={t['end']-fade}:d={fade}:alpha=1[c{i}]")
                label = f"[o{i}]" if i < len(cards) - 1 else "[v]"
                fc.append(f"{prev}[c{i}]overlay=0:0:enable='between(t,{t['start']},{t['end']})'{label}")
                prev = label
            titled = tmp / "titled.mp4"
            run([*inputs, "-filter_complex", ";".join(fc), "-map", "[v]", "-t", f"{total:.3f}", "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", str(titled)])
            current = titled
        # 4. sound: voice lines and effects at their start times, the music bed ducked under the voices
        placed = []   # (path, start, length)
        for vid, start in VOICES:
            p = find_voice(voices_dir, vid)
            if p is None:
                print(f"note: no voice file for {vid} in {voices_dir}; skipped")
                continue
            placed.append((p, start, duration(p)))
        for item in [s for s in a.sfx.split(",") if s.strip()]:
            path, _, at = item.rpartition("@")
            p = Path(path)
            if not p.exists():
                sys.exit(f"sfx file not found: {p}")
            placed.append((p, float(at), duration(p)))
        out.parent.mkdir(parents=True, exist_ok=True)
        if music or placed:
            inputs, fc, mix = ["-i", str(current)], [], []
            idx = 1
            if music:
                inputs += ["-i", str(music)]
                duck = "".join(f",volume=enable='between(t,{s:.3f},{s+l:.3f})':volume={DUCK_LEVEL / MUSIC_LEVEL:.3f}" for _, s, l in placed)
                fc.append(f"[{idx}:a]atrim=0:{total:.3f},afade=t=in:st=0:d=1,afade=t=out:st={total-2:.3f}:d=2,volume={MUSIC_LEVEL}{duck}[m]")
                mix.append("[m]")
                idx += 1
            for p, s, _ in placed:
                inputs += ["-i", str(p)]
                ms = int(round(s * 1000))
                fc.append(f"[{idx}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay={ms}|{ms}[s{idx}]")
                mix.append(f"[s{idx}]")
                idx += 1
            fc.append(f"{''.join(mix)}amix=inputs={len(mix)}:normalize=0:duration=longest,atrim=0:{total:.3f}[a]")
            run([*inputs, "-filter_complex", ";".join(fc), "-map", "0:v", "-map", "[a]", "-c:v", "copy",
                 "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-t", f"{total:.3f}", str(out)])
        else:
            run(["-i", str(current), "-c:v", "copy", "-an", "-movflags", "+faststart", str(out)])
        # 5. poster frame
        poster = out.with_name(out.stem + "-poster.jpg")
        run(["-ss", str(a.poster_at), "-i", str(out), "-frames:v", "1", "-q:v", "3", str(poster)])
    print(f"wrote {out} ({total:.1f}s, {len(placed)} voice/sfx cue(s){', music' if music else ''}) and {poster}")

if __name__ == "__main__":
    main()
