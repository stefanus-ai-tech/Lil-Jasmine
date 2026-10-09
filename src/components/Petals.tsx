import React from 'react';
import {petalPath, rand} from '../lib/geometry';
import {lighten, paletteAt, rgb} from '../lib/palette';
import {CX, CY, H, W} from '../lib/stage';
import {A, curve, riserAt, sectionAt} from '../lib/timeline';
import {episodeAt, stemX, tipY} from '../lib/vine';

const N_FALL = 30;
const N_BURST = 26;
const PETAL = petalPath(1, 0.42, 0.25);

/**
 * Drifting petals. Density follows the energy (and fills the breakdowns);
 * every drop throws a ring of petals out of the flower's heart.
 */
export const Petals: React.FC<{t: number; float: number}> = ({t, float}) => {
	const p = paletteAt(t);
	const e = curve(A.energySlow, t);
	const riser = riserAt(t);
	const density = Math.min(1, 0.28 + 0.45 * e + 0.5 * float);
	const span = H + 400;
	const fill = rgb(lighten(p.petal, 0.45), 0.92);
	const fill2 = rgb(lighten(p.accent, 0.35), 0.9);
	const items: React.ReactNode[] = [];

	for (let i = 0; i < N_FALL; i++) {
		const vis = Math.min(1, Math.max(0, density * N_FALL - i));
		if (vis <= 0) continue;
		const depth = rand(i * 2.7 + 9);
		const size = 16 + depth * 26;
		const speed = (40 + depth * 70) * (1 - 0.35 * float);
		const y = ((t * speed + rand(i * 6.1) * span) % span) - 200;
		const sway = Math.sin(t * (0.5 + rand(i * 3.3) * 0.6) + i) * (40 + depth * 60);
		// in the risers petals get swept in toward the centre
		const x0 = rand(i * 1.9) * W + sway;
		const x = x0 + (CX - x0) * riser * 0.35;
		const spin = t * (30 + rand(i * 8.8) * 60) * (i % 2 ? 1 : -1) + rand(i) * 360;
		const flip = Math.cos(t * (1 + rand(i * 4.4) * 1.5) + i); // 3-D tumble
		items.push(
			<g key={`f${i}`} transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${spin.toFixed(1)}) scale(${size.toFixed(1)},${(size * (0.35 + 0.65 * Math.abs(flip))).toFixed(1)})`} opacity={vis * (0.55 + 0.4 * depth)}>
				<path d={PETAL} fill={i % 3 === 0 ? fill2 : fill} stroke="rgba(255,255,255,0.9)" strokeWidth={1.2 / size} />
			</g>,
		);
	}

	for (const d of A.drops) {
		const dt = t - d;
		if (dt < 0 || dt > 3.2) continue;
		// burst from the flower's heart, or from the vine tip when the vine is on stage
		const ep = sectionAt(d).mode === 'vine' ? episodeAt(d) : null;
		const ox = ep ? stemX(d) : CX;
		const oy = ep ? tipY(ep, d) : CY;
		for (let i = 0; i < N_BURST; i++) {
			const a = (i / N_BURST) * Math.PI * 2 + rand(i + d) * 0.3;
			const dist = (380 + rand(i * 3 + d) * 620) * (1 - Math.exp(-dt * 2.4));
			const x = ox + Math.cos(a) * dist;
			const y = oy + Math.sin(a) * dist + 90 * dt * dt;
			const size = 18 + rand(i * 5 + d) * 22;
			const spin = (a * 180) / Math.PI + 90 + dt * 220 * (i % 2 ? 1 : -1);
			items.push(
				<g key={`b${d}-${i}`} transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${spin.toFixed(1)}) scale(${size.toFixed(1)})`} opacity={Math.max(0, 1 - dt / 3.2) * 0.95}>
					<path d={PETAL} fill={i % 2 ? fill : fill2} stroke="white" strokeWidth={1.2 / size} />
				</g>,
			);
		}
	}
	return <g>{items}</g>;
};
