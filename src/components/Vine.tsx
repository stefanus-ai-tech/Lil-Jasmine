import React from 'react';
import {leafPath, offsetLine, Pt, rand, ribbonPath, smoothPath} from '../lib/geometry';
import {lighten, mix, paletteAt, paletteFrozen, rgb} from '../lib/palette';
import {H, W} from '../lib/stage';
import {
	A,
	BLOSSOM_NOTES,
	CHORD_CHANGES,
	beatIndexAt,
	beatPulse,
	beatTime,
	chordIndexAt,
	clamp,
	curve,
	smoothstep,
	springy,
} from '../lib/timeline';
import {episodeAt, stemPoint, stemTangent, tipY} from '../lib/vine';
import {Jasmine} from './Jasmine';

const deg = (r: number) => (r * 180) / Math.PI;

/**
 * The melody drawn as a climbing jasmine vine: the stem's sideways position is the
 * lead line's pitch, leaves sprout on the beat, blossoms open on held melody notes
 * (coloured by the chord they bloomed in) and larger blooms mark chord changes.
 */
const VineBody: React.FC<{t: number; hue: number}> = ({t, hue}) => {
	const ep = episodeAt(t)!;
	const p = paletteAt(t);
	const ty = tipY(ep, t);
	const tauMin = Math.max(ep.start, t - (H + 120 - ty) / ep.speed);
	const tauMax = Math.min(t, ep.end + 0.6);
	if (tauMax - tauMin < 0.05) return null;

	// centre line, sampled every 1/20 s
	const pts: Pt[] = [];
	for (let tau = tauMin; tau <= tauMax; tau += 0.05) pts.push(stemPoint(ep, tau, t));
	pts.push(stemPoint(ep, tauMax, t));
	const widths = pts.map((_, i) => 1.8 + 4.2 * (1 - i / (pts.length - 1)));

	const stemCol = mix([255, 252, 253], p.accent, hue * 0.35);
	const contourCol = 'rgba(255,255,255,0.7)';
	const line = 'rgba(255,255,255,0.92)';

	// leaves on the beat (every other beat in the sparse intro)
	const leaves: React.ReactNode[] = [];
	for (let i = beatIndexAt(tauMin) + 1; i <= beatIndexAt(tauMax); i++) {
		const b = beatTime(i);
		if (b < ep.start + 0.4 || (b < 7 && i % 2)) continue;
		const g = clamp(springy(t - b, 5, 8), 0, 1.15);
		const side = i % 2 ? 1 : -1;
		const [x, y] = stemPoint(ep, b, t);
		const [tx, ty2] = stemTangent(ep, b, t);
		const ang = deg(Math.atan2(ty2, tx)) + 90 + side * 52;
		const len = (30 + 22 * (A.beatAmp[i] ?? 0.5)) * g;
		leaves.push(
			<g key={`l${i}`} transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${ang.toFixed(1)})`}>
				<path d={leafPath(len, len * 0.36)} fill="url(#leafGrad)" stroke={line} strokeWidth={1.3} />
				<path d={`M0,0L0,${(-len * 0.85).toFixed(1)}`} stroke="rgba(255,255,255,0.7)" strokeWidth={1} />
			</g>,
		);
	}

	// blossoms on melody notes + bigger ones on chord changes
	const blooms: {tau: number; r: number; side: number; seed: number}[] = [];
	for (const c of CHORD_CHANGES) {
		if (c >= tauMin && c <= tauMax && c > ep.start + 0.5) blooms.push({tau: c, r: 54, side: chordIndexAt(c) % 2 ? 1 : -1, seed: c});
	}
	for (const n of BLOSSOM_NOTES) {
		if (n.t < tauMin || n.t > tauMax || n.t < ep.start + 0.3) continue;
		if (blooms.some((b) => Math.abs(b.tau - n.t) < 0.3)) continue;
		const r = 21 + 20 * clamp((n.midi - 73) / 12, 0, 1) + 10 * n.energy;
		blooms.push({tau: n.t, r, side: n.i % 2 ? 1 : -1, seed: n.i});
	}
	const gradIds = new Set<number>();
	const flowers = blooms.map((b) => {
		const g = springy(t - b.tau, 4.5, 7);
		const [x, y] = stemPoint(ep, b.tau, t);
		const [tx, ty2] = stemTangent(ep, b.tau, t);
		const off = (10 + b.r * 0.55) * Math.min(1, g);
		const fx = x - ty2 * off * b.side;
		const fy = y + tx * off * b.side;
		const k = chordIndexAt(b.tau);
		gradIds.add(k);
		return (
			<g key={`b${b.seed}`}>
				<path d={`M${x.toFixed(1)},${y.toFixed(1)}L${fx.toFixed(1)},${fy.toFixed(1)}`} stroke={line} strokeWidth={1.4} />
				<g transform={`translate(${fx.toFixed(1)},${fy.toFixed(1)}) scale(${Math.max(0, g).toFixed(3)})`}>
					<Jasmine
						r={b.r}
						open={clamp(g, 0, 1.1)}
						rotate={rand(b.seed) * 72 - 30 * (1 - Math.min(1, g))}
						gradId={`vg${k}`}
						line={line}
						contour={rgb(paletteFrozen(b.tau).petalDeep, 0.45)}
						center="#FFE7A3"
					/>
				</g>
			</g>
		);
	});

	const tip = stemPoint(ep, tauMax, t);
	const kick = beatPulse(t, 0.14);
	const centre = smoothPath(pts);
	return (
		<g>
			<defs>
				{[...gradIds].map((k) => {
					const fp = paletteFrozen(A.chords[k][0] + 0.01);
					return (
						<linearGradient key={k} id={`vg${k}`} x1="0" y1="1" x2="0" y2="0">
							<stop offset="0" stopColor={rgb(fp.petalDeep, 0.95)} />
							<stop offset="0.45" stopColor={rgb(fp.petal, 0.95)} />
							<stop offset="1" stopColor={rgb(lighten(fp.petal, 0.72), 0.97)} />
						</linearGradient>
					);
				})}
				<linearGradient id="leafGrad" x1="0" y1="1" x2="0" y2="0">
					<stop offset="0" stopColor={rgb(p.leaf, 0.95)} />
					<stop offset="1" stopColor={rgb(lighten(p.leaf, 0.55), 0.95)} />
				</linearGradient>
				<radialGradient id="tipGlow">
					<stop offset="0" stopColor="rgba(255,255,255,0.95)" />
					<stop offset="0.35" stopColor={rgb(lighten(p.accent, 0.4), 0.5)} />
					<stop offset="1" stopColor={rgb(p.accent, 0)} />
				</radialGradient>
			</defs>
			{/* soft glow under the stem */}
			<path d={centre} fill="none" stroke={rgb(lighten(p.accent, 0.3), 0.14)} strokeWidth={30} strokeLinecap="round" />
			<path d={centre} fill="none" stroke={rgb(lighten(p.accent, 0.5), 0.22)} strokeWidth={13} strokeLinecap="round" />
			{/* contour echoes of the melody line */}
			{[-34, -18, 18, 34].map((o) => (
				<path key={o} d={smoothPath(offsetLine(pts, o))} fill="none" stroke={contourCol} strokeWidth={Math.abs(o) > 20 ? 1 : 1.5} opacity={Math.abs(o) > 20 ? 0.45 : 0.85} />
			))}
			<path d={ribbonPath(pts, widths)} fill={rgb(stemCol, 0.97)} />
			{leaves}
			{flowers}
			<circle cx={tip[0]} cy={tip[1]} r={44 + 30 * kick} fill="url(#tipGlow)" />
			<circle cx={tip[0]} cy={tip[1]} r={5 + 3 * kick} fill="white" />
		</g>
	);
};

export const Vine: React.FC<{t: number; weight: number}> = ({t, weight}) => {
	const ep = episodeAt(t);
	if (!ep || weight < 0.01) return null;
	// in the fuller A2 / lift sections a mirrored twin vine joins (symmetry = calm, neat)
	const twin = ep.start < 1 ? smoothstep(A.sections[2].start - 0.3, A.sections[2].start + 1.6, t) : 0;
	const e = curve(A.energySlow, t);
	return (
		<g opacity={weight}>
			{twin > 0.01 && (
				<g transform={`translate(${W},0) scale(-1,1)`} opacity={twin * (0.75 + 0.2 * e)}>
					<VineBody t={t} hue={1} />
				</g>
			)}
			<VineBody t={t} hue={0} />
		</g>
	);
};
