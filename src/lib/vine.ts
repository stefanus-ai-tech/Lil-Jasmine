import {Pt} from './geometry';
import {CX, H} from './stage';
import {A, easeOutCubic, lerp, melodyNorm} from './timeline';

export type Episode = {start: number; end: number; speed: number};

/** Each contiguous run of "vine" sections grows a fresh vine from the bottom. */
export const EPISODES: Episode[] = (() => {
	const out: Episode[] = [];
	for (const s of A.sections) {
		if (s.mode !== 'vine') continue;
		const last = out[out.length - 1];
		if (last && Math.abs(last.end - s.start) < 0.01) last.end = s.end;
		else out.push({start: s.start, end: s.end, speed: s.start > 100 ? 170 : 235});
	}
	return out;
})();

export const episodeAt = (t: number) => {
	let ep: Episode | null = null;
	for (const e of EPISODES) if (t >= e.start) ep = e;
	return ep;
};

export const TIP_Y = 760;
export const GROW_TIME = 4.5;

export const tipY = (ep: Episode, t: number) => lerp(H + 80, TIP_Y, easeOutCubic((t - ep.start) / GROW_TIME));

/** Horizontal position of the stem written at time tau: the melody contour. */
export const stemX = (tau: number) => CX + melodyNorm(tau) * 255 + 30 * Math.sin(tau * 0.85);

/** Where the piece of stem written at time tau sits at render time t. */
export const stemPoint = (ep: Episode, tau: number, t: number): Pt => [stemX(tau), tipY(ep, t) + (t - tau) * ep.speed];

/** Unit tangent pointing toward the tip. */
export const stemTangent = (ep: Episode, tau: number, t: number): Pt => {
	const a = stemPoint(ep, tau - 0.05, t);
	const b = stemPoint(ep, tau + 0.05, t);
	const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
	return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
};
