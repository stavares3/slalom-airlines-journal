#!/usr/bin/env python3
"""
assemble-film.py: cut the Night flight to Tokyo spot from six generated clips.

    python eds-blog/tools/assemble-film.py --clips <folder> [--out eds-blog/media/night-flight-tokyo.mp4]
                                           [--music <file>] [--no-titles] [--poster-at 14.2]

The folder holds the clips named in eds-blog/media/night-flight-tokyo-commercial.md
(01-seattle-dusk.mp4 ... 06-tokyo-arrival.mp4). Each is trimmed to its slot,
normalised to 1920x1080 at 24 fps, joined with half second cross dissolves,
overlaid with the brand title cards (Fraunces and Inter, drawn with Pillow),
mixed with an optional music bed that fades out over the last two seconds,
and written as H.264 with faststart. A poster frame is written beside the
film as <out stem>-poster.jpg.

Needs Python 3.9+ with `pip install pillow imageio-ffmpeg`. No other tooling.
"""
import argparse, json, os, subprocess, sys, tempfile
from pathlib import Path

try:
    import imageio_ffmpeg
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit("pip install pillow imageio-ffmpeg")

HERE = Path(__file__).resolve().parent
FONTS = HERE / "fonts"
W, H, FPS = 1920, 1080, 24
SLOT = 5.0          # seconds per shot
XFADE = 0.5         # cross dissolve length
TAIL_HOLD = 2.5     # the last shot holds its final frame under the closing title, so the cut runs 30.0s
CLIPS = ["01-seattle-dusk", "02-boarding", "03-window-seat", "04-pacific-night", "05-dawn-fuji", "06-tokyo-arrival"]
TITLES = [
    {"start": 1.0, "end": 3.5, "line": "Seattle, 6:40 pm.", "small": ""},
    {"start": 12.0, "end": 14.5, "line": "Ten and a half hours.", "small": "One night the calendar never sees."},
    {"start": 21.0, "end": 23.5, "line": "Tokyo, the next evening.", "small": ""},
    {"start": 26.5, "end": 29.5, "line": "Fly the world.", "small": "Seattle to Tokyo, nonstop, every day."},
]
IVORY = (244, 240, 232, 255)
MIST = (200, 208, 222, 255)

def ffmpeg():
    return imageio_ffmpeg.get_ffmpeg_exe()

def run(args):
    res = subprocess.run([ffmpeg(), "-hide_banner", "-loglevel", "error", "-y", *args], capture_output=True, text=True)
    if res.returncode != 0:
        sys.exit(f"ffmpeg failed:\n{res.stderr}")

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

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--clips", required=True)
    ap.add_argument("--out", default=str(HERE.parent / "media" / "night-flight-tokyo.mp4"))
    ap.add_argument("--music", default=None)
    ap.add_argument("--no-titles", action="store_true")
    ap.add_argument("--poster-at", type=float, default=14.2, help="second of the finished film used for the poster frame")
    a = ap.parse_args()
    folder = Path(a.clips)
    out = Path(a.out)
    music = Path(a.music) if a.music else (folder / "music.mp3" if (folder / "music.mp3").exists() else None)
    clips = [find_clip(folder, s) for s in CLIPS]

    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        # 1. normalise every clip: exact slot length, size, frame rate, no audio
        norm = []
        for i, c in enumerate(clips):
            n = tmp / f"n{i}.mp4"
            last = i == len(clips) - 1
            hold = f",tpad=stop_mode=clone:stop_duration={TAIL_HOLD}" if last else ""
            run(["-i", str(c), "-t", str(SLOT), "-an",
                 "-vf", f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,fps={FPS},format=yuv420p{hold}",
                 "-c:v", "libx264", "-preset", "medium", "-crf", "17", str(n)])
            norm.append(n)
        # 2. cross dissolve chain
        inputs = []
        for n in norm:
            inputs += ["-i", str(n)]
        chain, prev, offset = [], "[0:v]", 0.0
        for i in range(1, len(norm)):
            offset += SLOT - XFADE
            label = f"[x{i}]" if i < len(norm) - 1 else "[v]"
            chain.append(f"{prev}[{i}:v]xfade=transition=fade:duration={XFADE}:offset={offset:.3f}{label}")
            prev = label
        joined = tmp / "joined.mp4"
        run([*inputs, "-filter_complex", ";".join(chain), "-map", "[v]", "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", str(joined)])
        total = SLOT * len(norm) - XFADE * (len(norm) - 1) + TAIL_HOLD
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
        # 4. music bed and the final encode
        out.parent.mkdir(parents=True, exist_ok=True)
        if music:
            run(["-i", str(current), "-i", str(music), "-filter_complex", f"[1:a]atrim=0:{total:.3f},afade=t=in:st=0:d=1,afade=t=out:st={total-2:.3f}:d=2,volume=0.9[a]",
                 "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-shortest", str(out)])
        else:
            run(["-i", str(current), "-c:v", "copy", "-an", "-movflags", "+faststart", str(out)])
        # 5. poster frame
        poster = out.with_name(out.stem + "-poster.jpg")
        run(["-ss", str(a.poster_at), "-i", str(out), "-frames:v", "1", "-q:v", "3", str(poster)])
    print(f"wrote {out} ({total:.1f}s) and {poster}")

if __name__ == "__main__":
    main()
