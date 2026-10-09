import React from 'react';
import {petalPath} from '../lib/geometry';

/**
 * A five-petal jasmine blossom drawn as filled petals with inner contour lines.
 * open: 0 (bud) .. 1 (fully open). gradId: a bbox linear gradient (base -> tip).
 */
export const Jasmine: React.FC<{
	r: number;
	open: number;
	rotate?: number;
	gradId: string;
	line: string;
	contour: string;
	center: string;
	petals?: number;
	strokeW?: number;
}> = ({r, open, rotate = 0, gradId, line, contour, center, petals = 5, strokeW = 1.6}) => {
	const o = Math.max(0, open);
	const len = r * (0.45 + 0.55 * o);
	const wid = r * 0.4 * (0.35 + 0.65 * o);
	const spread = 0.25 + 0.75 * o; // petals fan out from a closed bud
	const d = petalPath(len, wid, 0.22);
	const inner = petalPath(len * 0.66, wid * 0.5, 0.3);
	return (
		<g transform={`rotate(${rotate.toFixed(1)})`}>
			{Array.from({length: petals}, (_, i) => {
				const a = (i / petals) * 360 * spread;
				return (
					<g key={i} transform={`rotate(${a.toFixed(1)})`}>
						<path d={d} fill={`url(#${gradId})`} stroke={line} strokeWidth={strokeW} strokeLinejoin="round" />
						<path d={inner} fill="none" stroke={contour} strokeWidth={strokeW * 0.7} />
					</g>
				);
			})}
			<circle r={r * 0.17 * (0.5 + 0.5 * o)} fill={center} stroke={line} strokeWidth={strokeW * 0.6} />
			{o > 0.3 &&
				Array.from({length: 5}, (_, i) => {
					const a = (i / 5) * Math.PI * 2 + 0.6;
					return <circle key={`s${i}`} cx={Math.cos(a) * r * 0.1} cy={Math.sin(a) * r * 0.1} r={r * 0.028 + 0.6} fill="white" opacity={(o - 0.3) / 0.7} />;
				})}
		</g>
	);
};
