import React from 'react';
import {rand} from '../lib/geometry';
import {paletteAt, rgb, lighten} from '../lib/palette';
import {A, beatPulse, curve} from '../lib/timeline';
import {H, W} from '../lib/stage';

const N_DEW = 34;
const N_GLINT = 14;

/** Rising dew / pollen bokeh; glints twinkle on the hi-hats. */
export const Bokeh: React.FC<{t: number}> = ({t}) => {
	const p = paletteAt(t);
	const hi = curve(A.high, t);
	const pulse = beatPulse(t, 0.22);
	const e = curve(A.energySlow, t);
	const span = H + 300;
	return (
		<g>
			<defs>
				<radialGradient id="dew">
					<stop offset="0" stopColor="rgba(255,255,255,0.95)" />
					<stop offset="0.45" stopColor="rgba(255,255,255,0.35)" />
					<stop offset="1" stopColor="rgba(255,255,255,0)" />
				</radialGradient>
			</defs>
			{Array.from({length: N_DEW}, (_, i) => {
				const depth = rand(i * 3.1); // 0 far .. 1 near
				const speed = 14 + depth * 46;
				const r = 5 + depth * depth * 34;
				const x = rand(i * 7.7) * W + Math.sin(t * (0.2 + rand(i) * 0.3) + i) * (12 + depth * 30);
				const y = span - ((t * speed + rand(i * 5.3) * span) % span) - 150;
				const twinkle = 0.55 + 0.45 * Math.sin(t * (0.8 + rand(i * 2.2) * 1.6) + i * 1.7);
				const a = (0.16 + 0.32 * (1 - depth)) * twinkle * (0.7 + 0.5 * e) + pulse * 0.18 * depth;
				return <circle key={i} cx={x} cy={y} r={r * (1 + pulse * 0.12)} fill="url(#dew)" opacity={Math.min(1, a)} />;
			})}
			{Array.from({length: N_GLINT}, (_, i) => {
				const x = 80 + rand(i * 11.3 + 1) * (W - 160);
				const y = 160 + rand(i * 4.9 + 2) * (H - 520);
				// each glint listens to the hats with its own phase so they sparkle in turn
				const phase = 0.5 + 0.5 * Math.sin(t * 2.3 + i * 2.1);
				const a = Math.max(0, hi * phase - 0.25) * 1.3;
				if (a < 0.02) return null;
				const s = 7 + rand(i * 9.1) * 9;
				const rot = t * 40 + i * 30;
				return (
					<g key={`g${i}`} transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${(s * (0.7 + a * 0.5)).toFixed(2)})`} opacity={Math.min(0.95, a)}>
						<path d="M0,-1.6 Q0.12,-0.12 1.6,0 Q0.12,0.12 0,1.6 Q-0.12,0.12 -1.6,0 Q-0.12,-0.12 0,-1.6Z" fill={rgb(lighten(p.accent, 0.55))} />
						<circle r={0.28} fill="white" />
					</g>
				);
			})}
		</g>
	);
};
