import raw from '../data/analysis.json';

export type Mode = 'vine' | 'mandala' | 'float';
export type Section = {name: string; start: number; end: number; mode: Mode};

type Analysis = {
	fps: number;
	duration: number;
	nFrames: number;
	beatPeriod: number;
	beatPhase: number;
	beats: number[];
	beatAmp: number[];
	sections: Section[];
	drops: number[];
	accents: number[];
	risers: [number, number][];
	chords: [number, number, number, 'maj' | 'min'][];
	notes: [number, number, number, number][]; // start, midi, duration, energy
	energy: number[];
	energySlow: number[];
	low: number[];
	high: number[];
	kick: number[];
	melody: number[];
	melodyConf: number[];
};

export const A = raw as unknown as Analysis;
export const FPS = A.fps;
export const BAR = A.beatPeriod * 4;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (e0: number, e1: number, x: number) => {
	const t = clamp01((x - e0) / (e1 - e0));
	return t * t * (3 - 2 * t);
};
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * clamp01(t)) - 1) / 2;
/** Damped spring 0 -> 1 with a little overshoot. */
export const springy = (t: number, damping = 6, freq = 9) =>
	t <= 0 ? 0 : 1 - Math.exp(-damping * t) * Math.cos(freq * t);

/** Linearly interpolated lookup into a per-video-frame curve at time t (s). */
export const curve = (arr: number[], t: number) => {
	const f = clamp(t * FPS, 0, arr.length - 1);
	const i = Math.floor(f);
	const j = Math.min(arr.length - 1, i + 1);
	return lerp(arr[i], arr[j], f - i);
};

// Gaussian-smoothed melody for drawing flowing lines (sigma in frames).
const smoothArr = (arr: number[], sigma: number) => {
	const r = Math.ceil(sigma * 3);
	const w: number[] = [];
	for (let k = -r; k <= r; k++) w.push(Math.exp(-(k * k) / (2 * sigma * sigma)));
	return arr.map((_, i) => {
		let s = 0;
		let ws = 0;
		for (let k = -r; k <= r; k++) {
			const j = i + k;
			if (j < 0 || j >= arr.length) continue;
			s += arr[j] * w[k + r];
			ws += w[k + r];
		}
		return s / ws;
	});
};
export const MELODY_SMOOTH = smoothArr(A.melody, 3.5);
export const MELODY_SOFT = smoothArr(A.melody, 9);
export const melodyAt = (t: number) => curve(MELODY_SMOOTH, t);
export const melodySoftAt = (t: number) => curve(MELODY_SOFT, t);
/** Melody mapped to -1..1 around the song's typical register. */
export const melodyNorm = (t: number, soft = false) =>
	clamp(((soft ? melodySoftAt(t) : melodyAt(t)) - 78.5) / 8, -1, 1);

// ---------------- sections / modes ----------------
export const sectionAt = (t: number) => {
	let s = A.sections[0];
	for (const sec of A.sections) if (t >= sec.start) s = sec;
	return s;
};

/** Crossfaded weight of each visual mode at time t. */
export const modeWeights = (t: number) => {
	const w: Record<Mode, number> = {vine: 0, mandala: 0, float: 0};
	A.sections.forEach((s, i) => {
		const prev = A.sections[i - 1];
		const next = A.sections[i + 1];
		// mode switches into a drop are near-instant; everything else breathes
		const fadeIn = !prev || prev.mode === s.mode ? 0 : s.mode === 'mandala' ? 0.12 : 1.2;
		const fadeOut = !next || next.mode === s.mode ? 0 : next.mode === 'mandala' ? 0.12 : 1.2;
		let v = 0;
		if (t >= s.start - fadeIn / 2 && t < s.end + fadeOut / 2) {
			const a = fadeIn ? smoothstep(s.start - fadeIn / 2, s.start + fadeIn / 2, t) : 1;
			const b = fadeOut ? 1 - smoothstep(s.end - fadeOut / 2, s.end + fadeOut / 2, t) : 1;
			v = Math.min(a, b);
		}
		w[s.mode] = Math.max(w[s.mode], v);
	});
	return w;
};

// ---------------- beats ----------------
export const beatIndexAt = (t: number) => Math.floor((t - A.beatPhase) / A.beatPeriod);
export const beatTime = (i: number) => A.beatPhase + i * A.beatPeriod;
/** Decaying pulse that fires on every beat, scaled by that beat's accent. */
export const beatPulse = (t: number, decay = 0.16) => {
	const i = beatIndexAt(t);
	let v = 0;
	for (let k = i; k >= Math.max(0, i - 3); k--) {
		const dt = t - beatTime(k);
		if (dt < 0) continue;
		v = Math.max(v, (A.beatAmp[k] ?? 0) * Math.exp(-dt / decay));
	}
	return v;
};
/** 0..1 position inside the current beat. */
export const beatPhase = (t: number) => {
	const x = (t - A.beatPhase) / A.beatPeriod;
	return x - Math.floor(x);
};

// ---------------- drops / risers ----------------
export const sinceLast = (times: number[], t: number) => {
	let best = Infinity;
	for (const x of times) if (t >= x) best = Math.min(best, t - x);
	return best;
};
export const dropFlash = (t: number) => {
	const d = sinceLast(A.drops, t);
	return d === Infinity ? 0 : Math.exp(-d / 0.35);
};
/** 0 -> 1 during the two bars leading into each drop (the "inhale"). */
export const preDrop = (t: number) => {
	let v = 0;
	for (const d of A.drops.slice(1)) {
		if (t < d && t > d - 2 * BAR) v = Math.max(v, (t - (d - 2 * BAR)) / (2 * BAR));
	}
	return v;
};
export const riserAt = (t: number) => {
	for (const [a, b] of A.risers) if (t >= a && t <= b + 0.6) return smoothstep(a, b, t) * (1 - smoothstep(b, b + 0.6, t));
	return 0;
};

// ---------------- notes ----------------
export type Note = {t: number; midi: number; dur: number; energy: number; i: number};
export const NOTES: Note[] = A.notes.map(([t, midi, dur, energy], i) => ({t, midi, dur, energy, i}));
export const notesBetween = (t0: number, t1: number) => NOTES.filter((n) => n.t >= t0 && n.t <= t1);
/** Notes worth a blossom: held long enough to read as a melodic event. */
export const BLOSSOM_NOTES = NOTES.filter((n, i) => {
	const prev = NOTES[i - 1];
	return n.dur >= 0.22 && (!prev || n.t - prev.t > 0.2);
});

// ---------------- chords ----------------
export const chordIndexAt = (t: number) => {
	let k = 0;
	for (let i = 0; i < A.chords.length; i++) if (t >= A.chords[i][0]) k = i;
	return k;
};
export const CHORD_CHANGES = A.chords.map((c) => c[0]).filter((x) => x > 0.5);
