import React from 'react';
import {rand} from '../lib/geometry';
import {lighten, rgb} from '../lib/palette';
import {H, W} from '../lib/stage';
import {A, beatPulse, clamp, curve, riserAt} from '../lib/timeline';
import {Night} from './night';

/** Dark plum sky with drifting chord-coloured nebulae and slow stars. */
export const Sky: React.FC<{t: number; n: Night}> = ({t, n}) => {
	const e = curve(A.energySlow, t);
	const pulse = beatPulse(t, 0.2);
	const neb = [
		{c: n.glowA, x: 260 + 220 * Math.sin(t * 0.11), y: 520 + 260 * Math.cos(t * 0.07), r: 820, a: 0.3},
		{c: n.glowB, x: 840 + 200 * Math.cos(t * 0.09 + 1), y: 1300 + 240 * Math.sin(t * 0.06), r: 760, a: 0.22},
		{c: n.neon[0], x: 540 + 300 * Math.sin(t * 0.05 + 3), y: 900 + 400 * Math.sin(t * 0.04), r: 600, a: 0.14},
	];
	return (
		<g>
			<defs>
				<linearGradient id="nSky" x1="0" y1="0" x2="0.3" y2="1">
					<stop offset="0" stopColor={rgb(n.skyTop)} />
					<stop offset="1" stopColor={rgb(n.skyBottom)} />
				</linearGradient>
				{neb.map((b, i) => (
					<radialGradient key={i} id={`neb${i}`}>
						<stop offset="0" stopColor={rgb(b.c, b.a * (0.6 + 0.6 * e) + pulse * 0.05)} />
						<stop offset="1" stopColor={rgb(b.c, 0)} />
					</radialGradient>
				))}
			</defs>
			<rect width={W} height={H} fill="url(#nSky)" />
			{neb.map((b, i) => (
				<circle key={i} cx={b.x} cy={b.y} r={b.r} fill={`url(#neb${i})`} />
			))}
			{Array.from({length: 70}, (_, i) => {
				const x = (rand(i * 3.3) * W + t * (4 + rand(i) * 10)) % W;
				const y = (rand(i * 5.9) * H - t * (2 + rand(i * 2) * 6) + H * 10) % H;
				const tw = 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(t * (1 + rand(i * 7) * 3) + i), 3);
				return <circle key={i} cx={x} cy={y} r={0.8 + rand(i * 9) * 1.8} fill={rgb(lighten(n.neon[i % 3], 0.6), tw * 0.8)} />;
			})}
		</g>
	);
};

const SPARK_RATE = 30; // spawns per second
const SPARK_LIFE = 1.4;

/** A new spark leaves the focal point every frame; more and faster with energy. */
export const Sparks: React.FC<{t: number; n: Night}> = ({t, n}) => {
	const out: React.ReactNode[] = [];
	const k1 = Math.floor(t * SPARK_RATE);
	for (let k = k1; k > k1 - SPARK_LIFE * SPARK_RATE; k--) {
		const born = k / SPARK_RATE;
		const age = t - born;
		if (age < 0 || born < 0) continue;
		const e = curve(A.energy, born);
		if (rand(k * 1.31) > 0.25 + 0.75 * e) continue;
		const a = rand(k * 2.17) * Math.PI * 2;
		const v = 260 + rand(k * 3.7) * 520 * (0.5 + e);
		const d = v * (1 - Math.exp(-age * 1.6)) / 1.6 + 40;
		const x = Math.cos(a) * d;
		const y = Math.sin(a) * d;
		const len = 10 + 34 * e * Math.exp(-age * 1.6);
		const life = 1 - age / SPARK_LIFE;
		const c = lighten(n.neon[k % 3], 0.35);
		out.push(
			<line
				key={k}
				x1={x.toFixed(1)}
				y1={y.toFixed(1)}
				x2={(x - Math.cos(a) * len).toFixed(1)}
				y2={(y - Math.sin(a) * len).toFixed(1)}
				stroke={rgb(c, life * 0.9)}
				strokeWidth={1.2 + 1.6 * life}
				strokeLinecap="round"
			/>,
		);
	}
	return <g>{out}</g>;
};

/** Light streaks sweeping across the frame during risers. */
export const RiserStreaks: React.FC<{t: number; n: Night}> = ({t, n}) => {
	const r = riserAt(t);
	if (r < 0.02) return null;
	return (
		<g opacity={r} style={{mixBlendMode: 'screen'}}>
			{Array.from({length: 7}, (_, i) => {
				const y = ((rand(i * 4.1) * H + t * (900 + i * 140)) % (H + 400)) - 200;
				const c = n.neon[i % 3];
				return <rect key={i} x={-100} y={y} width={W + 200} height={2 + rand(i) * 4} fill={rgb(lighten(c, 0.4), clamp(0.25 + r * 0.5, 0, 1))} transform={`rotate(-18 ${W / 2} ${y})`} />;
			})}
		</g>
	);
};
