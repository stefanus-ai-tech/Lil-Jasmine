# Lil Jasmine

An audio-reactive music video for *Lil Jasmine* (instrumental), built with [Remotion](https://www.remotion.dev).
It's 9:16 at 1080×1920 and 30 fps, for TikTok / Reels, with no text. The look is pastel pink and lilac with complementary mint, butter and peach.

## Run it

```bash
npm install
npm run dev        # Remotion Studio: scrub and preview with the audio
npm run render     # full song  -> out/lil-jasmine-mv.mp4
npx remotion render LilJasmineReel out/lil-jasmine-reel.mp4   # ~57 s cut (build -> drop 1)
```

There are two compositions:

| id | length | use |
|---|---|---|
| `LilJasmine` | 3:22, the full song | TikTok |
| `LilJasmineReel` | 0:57, from 0:45.8 (pre-drop build) to 1:43 | Reels (the 3-minute cap rules out the full song), Shorts |

## How the visuals follow the music

Everything is driven by `src/data/analysis.json`. `analysis/analyze_audio.py` generates it from the MP3.

| Musical feature | What the analysis found | What you see |
|---|---|---|
| **Melody** | lead line around C5–C6, tracked per frame | **Vine sections:** the stem's sideways position is the melody's pitch contour, so the vine literally draws the tune. White contour lines run alongside it.<br>**Bloom sections:** the petal tips sit at the current pitch, and the last bar of melody flows out to the petal edges. Comets orbit once per bar at a radius set by the pitch. |
| **Held melody notes** | about 200 note events | jasmine blossoms open on the vine |
| **Beat** | 129.05 BPM, a very steady grid | leaves sprout, flower-shaped contour rings ripple out, the camera leans in, and a pearl lights up on each beat |
| **Chord changes** | Am – G – F – Em (Andalusian cadence) plus Dm, C, E, Bm | each chord has its own palette, so the sky, petals and accents crossfade on every change. Blossoms keep the colour of the chord they opened in, and a wide accent-coloured ring marks each change. |
| **Hi-hats** | high-band onsets | glints twinkle |
| **Drops** | 0:07, 0:56, 1:52, 2:39 | a soft white bloom, a petal burst, and the kaleidoscope flower springs open |
| **Breakdowns** | 1:41, 2:29, 2:51 | the flower relaxes into a contour-only "ghost", and rings fall like dew on the melody notes |
| **Pre-drop builds** | last 2 bars before each drop | the rings contract inward (an inhale) |

Section map: intro → vine (A1, A2 with a mirrored twin vine, lift) → **bloom** (6 petals) → breakdown → **bloom** (8 petals) → breakdown → **bloom** (5 petals, jasmine) → breakdown → vine at dusk → fade.

## Re-running the analysis

```bash
python -m venv .venv && .venv/bin/pip install -r analysis/requirements.txt
.venv/bin/python analysis/analyze_audio.py "Lil Jasmine V6.mp3" src/data/analysis.json
```

## Layout

```
src/
  LilJasmine.tsx        main composition (layer stack + camera pulse)
  Root.tsx              compositions (full + reel cut)
  lib/timeline.ts       analysis access: beats, sections, chords, melody, drops
  lib/palette.ts        per-chord palettes + OKLab crossfades
  lib/vine.ts           vine geometry (melody -> stem path)
  components/           Background, Bokeh, Ripples, Vine, Jasmine, Mandala, Petals, Ferns, Overlay
analysis/analyze_audio.py
public/lil-jasmine.mp3  the track, as played by the video
```
