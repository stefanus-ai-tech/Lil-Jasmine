import React from 'react';
import {leafPath, Pt, smoothPath} from '../lib/geometry';
import {lighten, paletteAt, rgb} from '../lib/palette';
import {H, W} from '../lib/stage';
import {A, curve, easeOutCubic} from '../lib/timeline';

const SEGS = 24;

/** A fern frond (a nod to the cover art) that unfurls from a fiddlehead and sways. */
const Frond: React.FC<{t: number; growth: number; len: number; lean: number; seed: number}> = ({t, growth, len, lean, seed}) => {
	const p = paletteAt(t);
	const low = curve(A.low, t);
	const sway = 0.035 * Math.sin(t * 0.55 + seed) + 0.02 * low * Math.sin(t * 2.1 + seed);
	const seg = len / SEGS;
	const pts: Pt[] = [[0, 0]];
	const angs: number[] = [];
	let a = -Math.PI / 2 + lean;
	for (let i = 0; i < SEGS; i++) {
		const u = i / SEGS;
		// gentle arch toward the centre + a fiddlehead curl that relaxes as it grows
		a += 0.028 + sway * 0.25 + (1 - growth) * Math.pow(u, 2) * 0.55;
		const [x, y] = pts[pts.length - 1];
		pts.push([x + Math.cos(a) * seg, y + Math.sin(a) * seg]);
		angs.push(a);
	}
	const line = 'rgba(255,255,255,0.85)';
	const fill = rgb(lighten(p.leaf, 0.15), 0.85);
	return (
		<g>
			<path d={smoothPath(pts)} fill="none" stroke={line} strokeWidth={3} strokeLinecap="round" />
			{angs.map((ang, i) => {
				const u = i / SEGS;
				if (i < 2) return null;
				const g = Math.max(0, Math.min(1, growth * 1.25 - u * 0.4));
				if (g <= 0) return null;
				const pin = len * 0.2 * Math.sin(Math.PI * Math.pow(u, 0.75)) * g + 4;
				const [x, y] = pts[i];
				const deg = (ang * 180) / Math.PI + 90;
				return [1, -1].map((side) => (
					<g key={`${i}${side}`} transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${(deg + side * (62 - 18 * u)).toFixed(1)})`}>
						<path d={leafPath(pin, pin * 0.2)} fill={fill} stroke={line} strokeWidth={1.1} />
						<path d={`M0,0L0,${(-pin * 0.8).toFixed(1)}`} stroke="rgba(255,255,255,0.55)" strokeWidth={0.8} />
					</g>
				));
			})}
		</g>
	);
};

export const Ferns: React.FC<{t: number}> = ({t}) => {
	const growth = easeOutCubic(t / 7.5);
	const end = 1 - Math.max(0, (t - (A.duration - 5)) / 5) * 0.4;
	return (
		<g opacity={0.8}>
			<g transform={`translate(-40,${H + 30})`}>
				<Frond t={t} growth={growth * end} len={640} lean={0.38} seed={1} />
			</g>
			<g transform={`translate(${W + 40},${H + 30}) scale(-1,1)`}>
				<Frond t={t} growth={growth * end} len={570} lean={0.44} seed={2.4} />
			</g>
		</g>
	);
};
