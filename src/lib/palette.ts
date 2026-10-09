import {A, chordIndexAt, smoothstep} from './timeline';

export type RGB = [number, number, number];
export type Palette = {
	top: RGB; // sky gradient
	mid: RGB;
	bottom: RGB;
	petal: RGB; // main flower fill
	petalDeep: RGB; // flower shading / inner layers
	accent: RGB; // complementary highlight (contours, glints)
	leaf: RGB; // foliage
};

const hex = (h: string): RGB => [
	parseInt(h.slice(1, 3), 16),
	parseInt(h.slice(3, 5), 16),
	parseInt(h.slice(5, 7), 16),
];

const P = (top: string, mid: string, bottom: string, petal: string, petalDeep: string, accent: string, leaf: string): Palette => ({
	top: hex(top),
	mid: hex(mid),
	bottom: hex(bottom),
	petal: hex(petal),
	petalDeep: hex(petalDeep),
	accent: hex(accent),
	leaf: hex(leaf),
});

// One mood per chord the track uses. Every sky stays inside the pink / lilac family;
// the complementary colour (mint, butter, peach, periwinkle) lives in the accent + petals.
const BY_CHORD: Record<string, Palette> = {
	Am: P('#F7C8DC', '#E3A9D3', '#A98AD8', '#FFC2DA', '#F08DBA', '#B9F3E4', '#9FD9C0'), // blush rose + mint
	Em: P('#E3CFFB', '#C9A8EC', '#8E80D6', '#E2C6FF', '#B18CF0', '#FFF1A6', '#A8DCC6'), // lilac + butter
	G: P('#D9F3EA', '#EBC3DF', '#B49BE0', '#BFF2DE', '#7FD9B8', '#FFC6DE', '#8FD6B4'), // mint garden + pink
	F: P('#FFDCCB', '#F2B9D2', '#C49FE0', '#FFCDB8', '#F8A28C', '#BCCBFF', '#A6DCB8'), // peach blossom + periwinkle
	C: P('#FFF2CF', '#F6C8DD', '#C6A6EC', '#FFEDA8', '#F6CF6A', '#D4B4FF', '#B3E0B0'), // butter light + lilac
	Dm: P('#D5DEFF', '#D2B9F2', '#E5A9CD', '#C2CCFF', '#8E9DF2', '#FFD1B6', '#A2D8C8'), // periwinkle + peach
	E: P('#FAD0F0', '#E1A7E6', '#9D8BE6', '#F6B2E6', '#E07CCB', '#AEF2DA', '#93D9BE'), // orchid + mint
	Bm: P('#E8CDE3', '#C6A4D6', '#8E80C7', '#E6B9D8', '#C584B5', '#CBEBC9', '#9CCDB2'), // mauve dusk + sage
};
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FALLBACK = BY_CHORD.Em;

const paletteOfChord = (i: number): Palette => {
	const c = A.chords[i];
	if (!c) return FALLBACK;
	const name = NAMES[c[2]] + (c[3] === 'min' ? 'm' : '');
	return BY_CHORD[name] ?? FALLBACK;
};

export const mix = (a: RGB, b: RGB, t: number): RGB => [
	a[0] + (b[0] - a[0]) * t,
	a[1] + (b[1] - a[1]) * t,
	a[2] + (b[2] - a[2]) * t,
];

// --- OKLab blending for chord crossfades. A straight RGB fade between complementary
// pastels (peach -> mint) goes beige, and a hue sweep passes through off-palette hues;
// an OKLab fade that keeps its chroma (plus a small lift in lightness) stays pastel.
const toLin = (c: number) => {
	const v = c / 255;
	return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const toSrgb = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(0, v), 1 / 2.4) - 0.055);
const toOklab = ([r8, g8, b8]: RGB): RGB => {
	const r = toLin(r8);
	const g = toLin(g8);
	const b = toLin(b8);
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
	];
};
const fromOklab = ([L, A, B]: RGB): RGB => {
	const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
	const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
	const s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);
	const c = (v: number) => Math.min(255, Math.max(0, toSrgb(v)));
	return [
		c(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
		c(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
		c(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
	];
};
export const mixLab = (a: RGB, b: RGB, t: number): RGB => {
	const x = toOklab(a);
	const y = toOklab(b);
	const lift = 0.06 * Math.sin(Math.PI * t);
	let A = x[1] + (y[1] - x[1]) * t;
	let B = x[2] + (y[2] - x[2]) * t;
	// keep the chroma of the endpoints so the midpoint stays a pastel, not a grey
	const want = Math.hypot(x[1], x[2]) * (1 - t) + Math.hypot(y[1], y[2]) * t;
	const got = Math.hypot(A, B);
	if (got > 0.008) {
		const k = Math.min(want / got, 3);
		A *= k;
		B *= k;
	}
	return fromOklab([Math.min(0.99, x[0] + (y[0] - x[0]) * t + lift), A, B]);
};
export const rgb = (c: RGB, alpha = 1) =>
	`rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${alpha.toFixed(3)})`;
export const lighten = (c: RGB, t: number): RGB => mix(c, [255, 255, 255], t);

const mixPalette = (a: Palette, b: Palette, t: number): Palette => ({
	top: mixLab(a.top, b.top, t),
	mid: mixLab(a.mid, b.mid, t),
	bottom: mixLab(a.bottom, b.bottom, t),
	petal: mixLab(a.petal, b.petal, t),
	petalDeep: mixLab(a.petalDeep, b.petalDeep, t),
	accent: mixLab(a.accent, b.accent, t),
	leaf: mixLab(a.leaf, b.leaf, t),
});

const LEAD = 0.12; // seconds the colour starts moving before the chord lands
const CROSSFADE = 0.45;

/** Palette at time t: crossfades into each new chord's colours as it starts. */
export const paletteAt = (t: number): Palette => {
	const k = chordIndexAt(t + LEAD);
	const cur = paletteOfChord(k);
	if (k === 0) return cur;
	const start = A.chords[k][0];
	const f = smoothstep(start - LEAD, start - LEAD + CROSSFADE, t);
	return f >= 1 ? cur : mixPalette(paletteOfChord(k - 1), cur, f);
};

/** Palette frozen at a moment (e.g. the colour a blossom had when it opened). */
export const paletteFrozen = (t: number): Palette => paletteOfChord(chordIndexAt(t));
