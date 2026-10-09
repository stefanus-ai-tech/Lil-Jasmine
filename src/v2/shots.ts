import {rand} from '../lib/geometry';
import {A, BAR, Mode, beatTime} from '../lib/timeline';

export type ShotKind = 'kaleido' | 'tunnel' | 'spiral' | 'ridges' | 'macro' | 'constellation' | 'radial';

export type Shot = {
	i: number;
	kind: ShotKind;
	start: number;
	end: number;
	mode: Mode;
	/** symmetry / petal count */
	sym: number;
	/** spin direction and speed multiplier */
	spin: number;
	/** camera: start/end zoom, framing offset, roll (degrees) */
	z0: number;
	z1: number;
	ox: number;
	oy: number;
	roll: number;
	/** which palette colour leads this shot */
	lead: 0 | 1 | 2;
	seed: number;
};

// Which visuals each part of the song may cut to.
const POOL: Record<Mode, ShotKind[]> = {
	vine: ['radial', 'ridges', 'constellation', 'spiral', 'macro', 'kaleido'],
	mandala: ['kaleido', 'tunnel', 'spiral', 'radial', 'macro', 'tunnel', 'kaleido'],
	float: ['macro', 'constellation', 'ridges', 'kaleido'],
};
// Cut length in bars, per section: busier sections cut faster.
const BARS: Record<string, number[]> = {
	intro: [2],
	A1: [2, 2, 4],
	A2: [2, 1, 2],
	lift: [2, 1, 1],
	B: [1, 1, 2, 0.5],
	break1: [2, 2, 1],
	C: [1, 0.5, 1, 1, 2],
	break2: [2, 2, 1],
	D: [1, 0.5, 1],
	break3: [2],
	outro: [2, 2, 1],
};
const SYMS = [5, 6, 7, 8, 9, 10, 12];

/**
 * The whole song pre-cut into shots. Every cut lands on a beat, every section start
 * forces a cut, and each shot draws its look from a seeded random so the edit feels
 * unpredictable but renders identically every time.
 */
export const SHOTS: Shot[] = (() => {
	const shots: Shot[] = [];
	let prev: ShotKind | null = null;
	let prev2: ShotKind | null = null;
	let n = 0;
	for (const sec of A.sections) {
		let t = sec.start;
		while (t < sec.end - 0.2) {
			const r = (k: number) => rand(n * 13.7 + k * 3.1 + 0.5);
			const lens = BARS[sec.name] ?? [2];
			const len = lens[Math.floor(r(1) * lens.length)] * BAR;
			// snap the cut to the beat grid (sections already start on their hit)
			let end = t + len;
			const bi = Math.round((end - A.beatPhase) / A.beatPeriod);
			end = beatTime(bi);
			if (end > sec.end - BAR * 0.4) end = sec.end;
			let kind: ShotKind;
			if (n === 0) kind = 'ridges';
			else {
				const pool = POOL[sec.mode].filter((k) => k !== prev && k !== prev2);
				kind = pool[Math.floor(r(2) * pool.length)];
			}
			const zoomIn = r(3) > 0.45;
			shots.push({
				i: n,
				kind,
				start: t,
				end,
				mode: sec.mode,
				sym: SYMS[Math.floor(r(4) * SYMS.length)],
				spin: (r(5) > 0.5 ? 1 : -1) * (0.6 + r(6) * 0.9),
				z0: zoomIn ? 0.9 + r(7) * 0.1 : 1.12 + r(7) * 0.12,
				z1: zoomIn ? 1.08 + r(8) * 0.14 : 0.94 + r(8) * 0.06,
				ox: (r(9) - 0.5) * (kind === 'macro' ? 420 : 120),
				oy: (r(10) - 0.5) * (kind === 'macro' ? 360 : 140),
				roll: kind === 'ridges' ? [0, 0, -14, 12, 90][Math.floor(r(11) * 5)] : (r(11) - 0.5) * 50,
				lead: Math.floor(r(12) * 3) as 0 | 1 | 2,
				seed: n * 7.31 + 1,
			});
			prev2 = prev;
			prev = kind;
			n++;
			t = end;
		}
	}
	return shots;
})();

export const shotIndexAt = (t: number) => {
	let lo = 0;
	let hi = SHOTS.length - 1;
	while (lo < hi) {
		const mid = (lo + hi + 1) >> 1;
		if (SHOTS[mid].start <= t) lo = mid;
		else hi = mid - 1;
	}
	return lo;
};
