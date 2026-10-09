"""
Audio analysis for the Lil Jasmine MV.

Produces src/data/analysis.json, which drives every animation in the Remotion
composition: beat grid, per-beat accents, section map, chord sequence (for the
colour palette), a per-frame melody contour, and per-frame energy curves.

    python -m venv .venv && .venv/bin/pip install -r analysis/requirements.txt
    .venv/bin/python analysis/analyze_audio.py "Lil Jasmine V6.mp3" src/data/analysis.json
"""
import json
import sys
from collections import Counter

import librosa
import numpy as np
from scipy.ndimage import gaussian_filter1d, median_filter, uniform_filter1d

FPS = 30
SR = 22050
HOP = 256

# The track sits on a rock-steady grid (verified by fitting a constant period
# to the percussive onset envelope in 60 s windows: 129.02 / 129.07 / 129.06 BPM).
BEAT_PERIOD = 0.46495
BEAT_PHASE = 0.273

# Section map, hand-verified against the low-band / RMS / hi-hat curves.
# mode: vine = melody drawn as a climbing jasmine vine,
#       mandala = melody drawn as a kaleidoscope flower,
#       float = breakdown, petals drifting.
SECTIONS = [
    ("intro", 0.0, "vine"),
    ("A1", 7.0, "vine"),        # first impact
    ("A2", 22.591, "vine"),     # bass + full kit
    ("lift", 45.838, "vine"),   # bass drops out, pre-drop
    ("B", 56.067, "mandala"),   # drop 1
    ("break1", 100.702, "float"),
    ("C", 111.861, "mandala"),  # drop 2 (loudest)
    ("break2", 149.057, "float"),
    ("D", 159.286, "mandala"),  # drop 3
    ("break3", 170.7, "float"),
    ("outro", 178.2, "vine"),
]
ACCENTS = [11.43, 47.5, 179.7]  # smaller entries (bass in) worth a soft bloom
RISERS = [[24.71, 27.21], [63.9, 64.88], [119.95, 122.55], [138.21, 142.38], [164.95, 166.67]]


def norm01(v, lo=2, hi=98):
    a, b = np.percentile(v, lo), np.percentile(v, hi)
    return np.clip((v - a) / (b - a + 1e-9), 0, 1)


def melody_contour(yh):
    """Lead-line pitch via harmonic-summed CQT salience + Viterbi smoothing."""
    mhop = 512
    fmin = librosa.note_to_hz("B4")
    nb = 3 * 12 * 3  # 3 octaves, 1/3-semitone bins
    cq = np.abs(librosa.cqt(yh, sr=SR, hop_length=mhop, fmin=fmin, n_bins=nb, bins_per_octave=36))
    lin = np.maximum(librosa.amplitude_to_db(cq, ref=np.max), -50) + 50
    sal = lin.copy()
    for h, w in [(2, 0.6), (3, 0.4), (4, 0.25)]:
        sh = int(round(36 * np.log2(h)))
        sal[:-sh] += w * lin[sh:]
    sal = np.maximum(sal - 0.5 * median_filter(sal, size=(1, 61)), 0) + 1e-3  # drop static pads
    sal = uniform_filter1d(sal, 3, axis=1)
    sal *= np.clip(np.arange(nb) / 9.0, 0.35, 1.0)[:, None]  # keep the path off the bottom edge
    p = sal / sal.sum(0, keepdims=True)
    p = p ** 4
    p /= p.sum(0, keepdims=True)
    tr = 0.95 * librosa.sequence.transition_local(nb, 13, window="triangle") + 0.05 / nb
    path = librosa.sequence.viterbi(p, tr)
    t = librosa.times_like(cq, sr=SR, hop_length=mhop)
    midi = median_filter(librosa.hz_to_midi(fmin) + path / 3.0, 7)
    conf = sal[path, np.arange(sal.shape[1])]
    return t, midi, conf


def chord_sequence(yh, beats, dur):
    """Major/minor triads on a half-bar grid, HMM-smoothed, with a bass-root bonus."""
    ch = librosa.feature.chroma_cqt(y=yh, sr=SR, hop_length=512)
    cht = librosa.times_like(ch[0], sr=SR, hop_length=512)
    cb = np.abs(librosa.cqt(yh, sr=SR, hop_length=512, fmin=librosa.note_to_hz("C1"), n_bins=36))
    bass = np.zeros((12, cb.shape[1]))
    for i in range(36):
        bass[i % 12] += cb[i]
    templ, labels = [], []
    for r in range(12):
        for q, iv in [("maj", [0, 4, 7]), ("min", [0, 3, 7])]:
            v = np.zeros(12)
            v[[(r + i) % 12 for i in iv]] = 1
            v[r] += 0.5
            templ.append(v / np.linalg.norm(v))
            labels.append((r, q))
    templ = np.array(templ)
    seg = list(beats[::2]) + [dur]
    obs = []
    for i in range(len(seg) - 1):
        m = (cht >= seg[i]) & (cht < seg[i + 1])
        v = ch[:, m].mean(1) if m.any() else np.ones(12)
        bv = bass[:, m].mean(1) if m.any() else np.ones(12)
        v /= np.linalg.norm(v) + 1e-9
        bv /= np.linalg.norm(bv) + 1e-9
        obs.append(templ @ v + 0.35 * np.array([bv[r] for r, _ in labels]))
    po = np.exp(np.array(obs).T * 12)
    po /= po.sum(0, keepdims=True)
    trans = np.full((24, 24), 0.12 / 23)
    np.fill_diagonal(trans, 0.88)
    chords = []
    for i, c in enumerate(librosa.sequence.viterbi(po, trans)):
        r, q = labels[c]
        if chords and chords[-1][2] == r and chords[-1][3] == q:
            chords[-1][1] = round(float(seg[i + 1]), 3)
        else:
            chords.append([round(float(seg[i]), 3), round(float(seg[i + 1]), 3), r, q])
    return chords


def main(path, out):
    y, _ = librosa.load(path, sr=SR, mono=True)
    dur = len(y) / SR
    n_frames = int(np.ceil(dur * FPS))
    ft = np.arange(n_frames) / FPS
    yh, yp = librosa.effects.hpss(y, margin=1.5)
    beats = np.arange(BEAT_PHASE, dur, BEAT_PERIOD)

    s = np.abs(librosa.stft(y, n_fft=2048, hop_length=HOP))
    sp = np.abs(librosa.stft(yp, n_fft=2048, hop_length=HOP))
    fr = librosa.fft_frequencies(sr=SR, n_fft=2048)
    tt = librosa.times_like(s[0], sr=SR, hop_length=HOP)

    def flux(m, lo, hi):
        b = np.log1p(10 * m[(fr >= lo) & (fr < hi)])
        return np.maximum(0, np.diff(b, axis=1, prepend=b[:, :1])).sum(0)

    def per_frame(v):
        return np.interp(ft, tt, v)

    kick = flux(sp, 30, 140)
    hat = flux(sp, 5000, 11000)
    rms = librosa.feature.rms(y=y, hop_length=HOP)[0]
    low = s[(fr > 25) & (fr < 150)].sum(0)

    energy = per_frame(norm01(gaussian_filter1d(rms, 5)))
    energy_slow = per_frame(norm01(gaussian_filter1d(rms, 170)))
    low_f = per_frame(norm01(gaussian_filter1d(low, 8)))
    high_f = per_frame(norm01(gaussian_filter1d(hat, 2), 5, 99.5))
    kick_f = per_frame(norm01(gaussian_filter1d(kick, 1.2), 5, 99.5))

    def peak_near(env, t, w=0.05):
        m = (tt >= t - w) & (tt <= t + w)
        return env[m].max() if m.any() else 0.0

    beat_kick = norm01(np.array([peak_near(kick, b) for b in beats]))
    beat_amp = np.clip(0.55 * beat_kick + 0.45 * np.interp(beats, ft, energy), 0, 1)

    mt, midi, conf = melody_contour(yh)
    conf = norm01(gaussian_filter1d(conf, 2))
    mel_f = np.interp(ft, mt, gaussian_filter1d(midi, 1.5))
    conf_f = np.interp(ft, mt, conf)
    notes, cur, st = [], midi[0], mt[0]
    for i in range(1, len(mt)):
        if abs(midi[i] - cur) >= 0.67 or i == len(mt) - 1:
            d = mt[i] - st
            if d >= 0.1:
                notes.append([round(float(st), 3), round(float(cur), 2), round(float(d), 3),
                              round(float(np.interp(st, ft, energy)), 3)])
            cur, st = midi[i], mt[i]

    chords = chord_sequence(yh, beats, dur)
    names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    print("chords:", Counter(names[c[2]] + ("" if c[3] == "maj" else "m") for c in chords).most_common())

    sections = []
    for i, (name, start, mode) in enumerate(SECTIONS):
        end = SECTIONS[i + 1][1] if i + 1 < len(SECTIONS) else dur
        sections.append(dict(name=name, start=start, end=round(end, 3), mode=mode))
    drops = [sec[1] for sec in SECTIONS if sec[0] in ("A1", "B", "C", "D")]

    r3 = lambda a, n=3: [round(float(x), n) for x in a]
    data = dict(
        fps=FPS, duration=round(dur, 3), nFrames=n_frames,
        beatPeriod=BEAT_PERIOD, beatPhase=BEAT_PHASE,
        beats=r3(beats), beatAmp=r3(beat_amp),
        sections=sections, drops=drops, accents=ACCENTS, risers=RISERS,
        chords=chords, notes=notes,
        energy=r3(energy), energySlow=r3(energy_slow), low=r3(low_f), high=r3(high_f), kick=r3(kick_f),
        melody=r3(mel_f, 2), melodyConf=r3(conf_f),
    )
    with open(out, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print(f"wrote {out}: {n_frames} frames, {len(beats)} beats, {len(notes)} notes, {len(chords)} chords")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
