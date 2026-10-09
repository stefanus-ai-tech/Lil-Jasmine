import React from 'react';
import {Pt, ribbonPath, smoothPath} from '../lib/geometry';
import {lighten, paletteAt, rgb} from '../lib/palette';
import {CX, CY} from '../lib/stage';
import {
	A,
	BAR,
	beatIndexAt,
	beatPhase,
	beatPulse,
	clamp,
	curve,
	easeOutCubic,
	melodyNorm,
	sectionAt,
	springy,
} from '../lib/timeline';
import {Jasmine} from './Jasmine';

/** Petal count per bloom section: drop 1, drop 2, drop 3. */
const PETALS: Record<string, number> = {B: 6, C: 8, D: 5};

/**
 * Kaleidoscope flower whose petal outline *is* the melody: the petal tip sits at
 * the current pitch and the last bar of the lead line flows out to the petal edges.
 * Inner layers replay earlier bars, so the flower is a stack of melodic contours.
 */
const melodyFlower = (t: number, n: number, rIn: number, rOut: number, lag: number, rot: number, scale: number) => {
	const pts: Pt[] = [];
	const half = Math.PI / n;
	const steps = 14;
	for (let j = 0; j < n; j++) {
		const base = rot + (j / n) * Math.PI * 2;
		for (let s = -steps; s < steps; s++) {
			const u = Math.abs(s) / steps; // 0 = petal tip (now), 1 = petal edge (a bar ago)
			const m = melodyNorm(t - lag - u * BAR, true) * 0.75 + melodyNorm(t - lag - u * BAR) * 0.25;
			const tipR = (rIn + (rOut - rIn) * (0.62 + 0.38 * m)) * scale;
			const env = Math.pow(Math.cos((u * Math.PI) / 2), 0.85);
			const r = rIn * scale + (tipR - rIn * scale) * env;
			const a = base + Math.sign(s || 1) * u * half;
			pts.push([CX + Math.cos(a) * r, CY + Math.sin(a) * r]);
		}
	}
	return pts;
};

const scaleAbout = (pts: Pt[], k: number): Pt[] => pts.map(([x, y]) => [CX + (x - CX) * k, CY + (y - CY) * k]);

export const Mandala: React.FC<{t: number; bloom: number; ghost: number}> = ({t, bloom, ghost}) => {
	const vis = Math.max(bloom, ghost);
	if (vis < 0.01) return null;
	const p = paletteAt(t);
	const sec = sectionAt(t);
	// during breakdowns keep the petal count of the bloom we just left
	const ref = sec.mode === 'mandala' ? sec : [...A.sections].reverse().find((s) => s.mode === 'mandala' && s.start <= t);
	const n = PETALS[ref?.name ?? 'B'] ?? 6;
	const since = ref ? t - ref.start : 0;

	const kick = beatPulse(t, 0.13);
	const e = curve(A.energySlow, t);
	// opening: springs open on the drop; in breakdowns it relaxes into a line-only ghost
	const breathe = 1 + 0.03 * Math.sin(t * 1.1);
	const open = clamp(bloom * clamp(springy(since * 1.25, 4.2, 9), 0, 1.2) + ghost * 0.74 * breathe, 0, 1.2);
	const scale = open * (1 + 0.04 * kick) * (0.96 + 0.08 * e);
	const fillA = clamp((bloom * 0.92 + ghost * 0.1) / Math.max(vis, 0.001), 0, 1);
	// slow drift plus a small eased tick on every beat
	const bi = beatIndexAt(t);
	const tick = bi + easeOutCubic(Math.min(1, beatPhase(t) * 3));
	const rot = 0.06 * t + tick * ((Math.PI * 2) / n / 24);

	const outer = melodyFlower(t, n, 120, 430, 0, rot, scale);
	const mid = melodyFlower(t, n, 95, 330, BAR, rot + Math.PI / n, scale);
	const inner = melodyFlower(t, n, 70, 220, 2 * BAR, rot, scale);
	const line = 'rgba(255,255,255,0.95)';
	const contour = 'rgba(255,255,255,0.6)';
	const contours = (pts: Pt[], ks: number[], w: number) =>
		ks.map((k) => <path key={k} d={smoothPath(scaleAbout(pts, k), true)} fill="none" stroke={contour} strokeWidth={w} />);

	// melody comets: a bright point orbits once per bar at a radius set by the current
	// pitch, leaving a tapered trail - the lead line drawn live, n-fold symmetric
	const comets: React.ReactNode[] = [];
	if (bloom > 0.05) {
		const trail = (0.8 * BAR) / n;
		const pts: Pt[] = [];
		for (let k = 0; k <= 40; k++) {
			const tau = t - trail * (1 - k / 40);
			const ang = ((tau - (ref?.start ?? 0)) / BAR) * Math.PI * 2 - Math.PI / 2;
			const R = (430 + 115 * melodyNorm(tau)) * scale;
			pts.push([Math.cos(ang) * R, Math.sin(ang) * R]);
		}
		const widths = pts.map((_, k) => 0.3 + 3.2 * Math.pow(k / 40, 1.5));
		const d = ribbonPath(pts, widths);
		const head = pts[pts.length - 1];
		for (let j = 0; j < n; j++) {
			comets.push(
				<g key={j} transform={`translate(${CX},${CY}) rotate(${((j / n) * 360).toFixed(2)})`}>
					<path d={d} fill="white" opacity={0.9} />
					<circle cx={head[0]} cy={head[1]} r={18} fill="url(#cometGlow)" />
					<circle cx={head[0]} cy={head[1]} r={4.5} fill="white" />
				</g>,
			);
		}
	}

	// pearls on an outer orbit; the one under the current beat lights up (beat counter)
	const pearlsN = n * 2;
	const lit = ((bi % pearlsN) + pearlsN) % pearlsN;
	return (
		<g opacity={vis}>
			<defs>
				<radialGradient id="mGlow" cx={CX} cy={CY} r={560 * Math.max(0.4, scale)} gradientUnits="userSpaceOnUse">
					<stop offset="0" stopColor={rgb([255, 255, 255], 0.55 + 0.3 * kick)} />
					<stop offset="0.4" stopColor={rgb(lighten(p.accent, 0.3), 0.28)} />
					<stop offset="1" stopColor={rgb(p.accent, 0)} />
				</radialGradient>
				{[
					['mOuter', p.petal, 430],
					['mMid', p.petalDeep, 330],
					['mInner', p.accent, 220],
				].map(([id, c, R]) => (
					<radialGradient key={id as string} id={id as string} cx={CX} cy={CY} r={(R as number) * Math.max(0.2, scale)} gradientUnits="userSpaceOnUse">
						<stop offset="0" stopColor={rgb(c as [number, number, number], 0.95)} />
						<stop offset="0.55" stopColor={rgb(lighten(c as [number, number, number], 0.35), 0.88)} />
						<stop offset="1" stopColor={rgb(lighten(c as [number, number, number], 0.8), 0.92)} />
					</radialGradient>
				))}
				<radialGradient id="cometGlow">
					<stop offset="0" stopColor="rgba(255,255,255,0.9)" />
					<stop offset="1" stopColor={rgb(lighten(p.accent, 0.4), 0)} />
				</radialGradient>
				<linearGradient id="mCore" x1="0" y1="1" x2="0" y2="0">
					<stop offset="0" stopColor={rgb(lighten(p.petal, 0.3))} />
					<stop offset="1" stopColor="#FFFFFF" />
				</linearGradient>
			</defs>
			<circle cx={CX} cy={CY} r={560 * Math.max(0.4, scale)} fill="url(#mGlow)" />
			{/* three melodic layers, each with topographic contour lines inside */}
			<path d={smoothPath(outer, true)} fill="url(#mOuter)" fillOpacity={fillA} stroke={line} strokeWidth={2.4} strokeLinejoin="round" />
			{contours(outer, [0.9, 0.8, 0.7], 1.3)}
			<path d={smoothPath(mid, true)} fill="url(#mMid)" fillOpacity={fillA} stroke={line} strokeWidth={2} strokeLinejoin="round" />
			{contours(mid, [0.88, 0.76], 1.1)}
			<path d={smoothPath(inner, true)} fill="url(#mInner)" fillOpacity={fillA} stroke={line} strokeWidth={1.8} strokeLinejoin="round" />
			{contours(inner, [0.84], 1)}
			{comets}
			<g transform={`translate(${CX},${CY}) scale(${(Math.max(0.3, scale) * (1 + 0.08 * kick)).toFixed(3)})`}>
				<Jasmine r={78} open={1} rotate={-(rot * 180) / Math.PI * 1.5} gradId="mCore" line={line} contour={rgb(p.petalDeep, 0.5)} center="#FFE7A3" strokeW={2} />
			</g>
			{Array.from({length: pearlsN}, (_, i) => {
				const a = -rot * 0.5 + (i / pearlsN) * Math.PI * 2 - Math.PI / 2;
				const R = 500 * scale;
				const on = i === lit ? 1 - beatPhase(t) * 0.6 : 0;
				return (
					<circle
						key={i}
						cx={CX + Math.cos(a) * R}
						cy={CY + Math.sin(a) * R}
						r={(4 + 6 * on) * Math.min(1, scale)}
						fill={on ? 'white' : rgb(lighten(p.accent, 0.5), 0.8)}
						opacity={0.55 + 0.45 * on}
					/>
				);
			})}
		</g>
	);
};
