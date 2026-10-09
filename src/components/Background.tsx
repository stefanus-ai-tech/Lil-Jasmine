import React from 'react';
import {lighten, paletteAt, rgb} from '../lib/palette';
import {A, curve} from '../lib/timeline';
import {W, H} from '../lib/stage';

/** Chord-coloured sky gradient with a few slow, breathing pools of light. */
export const Background: React.FC<{t: number}> = ({t}) => {
	const p = paletteAt(t);
	const e = curve(A.energySlow, t);
	const pools = [
		{c: p.accent, x: 220 + 90 * Math.sin(t * 0.07), y: 420 + 120 * Math.cos(t * 0.05), r: 620, a: 0.38},
		{c: p.petal, x: 900 + 80 * Math.cos(t * 0.06), y: 1180 + 140 * Math.sin(t * 0.045), r: 700, a: 0.42},
		{c: lighten(p.top, 0.5), x: 540 + 160 * Math.sin(t * 0.03 + 2), y: 1700, r: 760, a: 0.3},
	];
	return (
		<g>
			<defs>
				<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor={rgb(p.top)} />
					<stop offset="0.52" stopColor={rgb(p.mid)} />
					<stop offset="1" stopColor={rgb(p.bottom)} />
				</linearGradient>
				{pools.map((pl, i) => (
					<radialGradient key={i} id={`pool${i}`}>
						<stop offset="0" stopColor={rgb(pl.c, pl.a * (0.75 + 0.35 * e))} />
						<stop offset="1" stopColor={rgb(pl.c, 0)} />
					</radialGradient>
				))}
			</defs>
			<rect width={W} height={H} fill="url(#sky)" />
			{pools.map((pl, i) => (
				<circle key={i} cx={pl.x} cy={pl.y} r={pl.r * (0.92 + 0.12 * e)} fill={`url(#pool${i})`} />
			))}
		</g>
	);
};
