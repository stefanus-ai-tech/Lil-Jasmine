import React from 'react';
import {roseContour} from '../lib/geometry';
import {lighten, paletteAt, paletteFrozen, rgb} from '../lib/palette';
import {CX, CY} from '../lib/stage';
import {
	A,
	BAR,
	BLOSSOM_NOTES,
	CHORD_CHANGES,
	beatIndexAt,
	beatTime,
	easeOutCubic,
	preDrop,
	sectionAt,
} from '../lib/timeline';
import {episodeAt, stemPoint} from '../lib/vine';

const LIFE = 1.7;

/**
 * Flower-shaped contour rings.
 *  - every beat: a ring blooms out of the focal point (vine tip / flower heart)
 *  - breakdowns: rings fall like dew drops on the held melody notes instead
 *  - chord changes: one wide, slow ring in the new chord's accent colour
 *  - two bars before a drop: rings are pulled *inward* (the inhale)
 */
export const Ripples: React.FC<{t: number; w: {vine: number; mandala: number; float: number}}> = ({t, w}) => {
	const p = paletteAt(t);
	const rings: React.ReactNode[] = [];
	const ep = episodeAt(t);
	const sec = sectionAt(t);
	const petals = sec.name === 'C' ? 8 : sec.name === 'D' ? 5 : 6;
	const pre = preDrop(t);

	// beat rings
	for (let i = beatIndexAt(t); i >= 0 && beatTime(i) > t - LIFE; i--) {
		const b = beatTime(i);
		const q = (t - b) / LIFE;
		const amp = A.beatAmp[i] ?? 0;
		const wb = w.vine + w.mandala * 1.1;
		if (amp < 0.2 || wb < 0.02 || pre > 0) continue;
		let cx = CX;
		let cy = CY;
		if (w.vine > w.mandala && ep) [cx, cy] = stemPoint(ep, b, t);
		const R = (w.mandala > 0.5 ? 150 : 24) + easeOutCubic(q) * (w.mandala > 0.5 ? 520 : 300) * (0.6 + 0.6 * amp);
		const a = amp * Math.pow(1 - q, 1.8) * wb * 0.85;
		rings.push(
			<path key={`b${i}`} d={roseContour(cx, cy, R, petals, 0.06 + 0.04 * amp, i * 0.5 + t * 0.2, 96)} fill="none" stroke="white" strokeWidth={0.8 + 3.2 * (1 - q)} opacity={Math.min(1, a * 1.15)} />,
		);
	}

	// breakdown rings on melody notes
	if (w.float > 0.02) {
		for (const n of BLOSSOM_NOTES) {
			const dt = t - n.t;
			if (dt < 0 || dt > 2.4) continue;
			const q = dt / 2.4;
			const R = 30 + easeOutCubic(q) * 420;
			rings.push(
				<path key={`n${n.i}`} d={roseContour(CX, CY, R, 5, 0.05, n.i, 96)} fill="none" stroke="white" strokeWidth={0.6 + 1.8 * (1 - q)} opacity={w.float * Math.pow(1 - q, 1.5) * 0.7} />,
			);
		}
	}

	// chord-change rings
	for (const c of CHORD_CHANGES) {
		const dt = t - c;
		if (dt < 0 || dt > 2.6) continue;
		const q = dt / 2.6;
		const col = lighten(paletteFrozen(c + 0.01).accent, 0.25);
		rings.push(
			<path key={`c${c}`} d={roseContour(CX, CY, 200 + easeOutCubic(q) * 760, 5, 0.04, c, 120)} fill="none" stroke={rgb(col)} strokeWidth={1.2 + 2 * (1 - q)} opacity={Math.pow(1 - q, 1.4) * 0.8} />,
		);
	}

	// inhale before drops: rings contract onto the focal point on each beat
	if (pre > 0) {
		for (let k = 0; k < 4; k++) {
			const q = ((t / (BAR / 4) + k / 4) % 1 + 1) % 1;
			const R = 720 * (1 - easeOutCubic(q)) + 20;
			rings.push(
				<path key={`p${k}`} d={roseContour(CX, CY, R, petals, 0.07, k + t * 0.3, 96)} fill="none" stroke={rgb(lighten(p.accent, 0.5))} strokeWidth={1 + 2.2 * q} opacity={pre * Math.sin(q * Math.PI) * 0.8} />,
			);
		}
	}
	return <g>{rings}</g>;
};
