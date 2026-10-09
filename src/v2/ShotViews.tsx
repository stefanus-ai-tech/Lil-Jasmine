import React from 'react';
import {Pt, leafPath, petalPath, rand, roseContour, smoothPath} from '../lib/geometry';
import {RGB, lighten, rgb} from '../lib/palette';
import {
	A,
	BAR,
	BLOSSOM_NOTES,
	NOTES,
	beatIndexAt,
	beatPhase,
	beatTime,
	clamp,
	curve,
	easeOutCubic,
	melodyNorm,
	springy,
} from '../lib/timeline';
import {Glow, Night, leadColor} from './night';
import {Shot} from './shots';

export type ShotProps = {t: number; lt: number; s: Shot; n: Night; kick: number; e: number};

const deg = (r: number) => (r * 180) / Math.PI;

/** Neon jasmine outline (centred at 0,0). */
const NeonBlossom: React.FC<{r: number; c: RGB; open?: number; rot?: number; petals?: number; w?: number}> = ({r, c, open = 1, rot = 0, petals = 5, w = 1.6}) => {
	const d = petalPath(r * (0.45 + 0.55 * open), r * 0.4 * (0.4 + 0.6 * open), 0.22);
	return (
		<g transform={`rotate(${rot.toFixed(1)})`}>
			{Array.from({length: petals}, (_, i) => (
				<g key={i} transform={`rotate(${((i / petals) * 360 * (0.3 + 0.7 * open)).toFixed(1)})`}>
					<Glow d={d} c={c} w={w} fill={rgb(c, 0.1)} />
				</g>
			))}
			<circle r={r * 0.14} fill={rgb(lighten(c, 0.6))} />
		</g>
	);
};

// ---------------------------------------------------------------- kaleido
const melodyFlower = (t: number, n: number, rIn: number, rOut: number, lag: number, rot: number) => {
	const pts: Pt[] = [];
	const half = Math.PI / n;
	const steps = 12;
	for (let j = 0; j < n; j++) {
		const base = rot + (j / n) * Math.PI * 2;
		for (let s = -steps; s < steps; s++) {
			const u = Math.abs(s) / steps;
			const m = melodyNorm(t - lag - u * BAR, true) * 0.7 + melodyNorm(t - lag - u * BAR) * 0.3;
			const tip = rIn + (rOut - rIn) * (0.55 + 0.45 * m);
			const r = rIn + (tip - rIn) * Math.pow(Math.cos((u * Math.PI) / 2), 0.85);
			const a = base + Math.sign(s || 1) * u * half;
			pts.push([Math.cos(a) * r, Math.sin(a) * r]);
		}
	}
	return smoothPath(pts, true);
};

const Kaleido: React.FC<ShotProps> = ({t, lt, s, n, kick}) => {
	const sym = s.sym;
	const tick = beatIndexAt(t) + easeOutCubic(Math.min(1, beatPhase(t) * 3));
	const rot = s.spin * (0.18 * lt) + tick * ((Math.PI * 2) / sym / 20) * s.spin;
	const open = clamp(springy(lt * 1.6, 4.5, 9), 0, 1.15);
	const layers = [
		{rIn: 120, rOut: 460, lag: 0, r: rot, k: 0, w: 2.4},
		{rIn: 90, rOut: 340, lag: BAR, r: -rot * 0.7 + Math.PI / sym, k: 1, w: 2},
		{rIn: 60, rOut: 230, lag: 2 * BAR, r: rot * 1.3, k: 2, w: 1.8},
	];
	const comets: React.ReactNode[] = [];
	const trail = (0.75 * BAR) / sym;
	const cpts: Pt[] = [];
	for (let k = 0; k <= 24; k++) {
		const tau = t - trail * (1 - k / 24);
		const ang = ((tau - s.start) / BAR) * Math.PI * 2 * s.spin;
		const R = 500 + 110 * melodyNorm(tau);
		cpts.push([Math.cos(ang) * R, Math.sin(ang) * R]);
	}
	const cd = smoothPath(cpts);
	for (let j = 0; j < sym; j++) {
		const h = cpts[cpts.length - 1];
		comets.push(
			<g key={j} transform={`rotate(${((j / sym) * 360).toFixed(2)})`}>
				<Glow d={cd} c={leadColor(n, s.lead, 1)} w={2.2} />
				<circle cx={h[0]} cy={h[1]} r={5} fill="white" />
			</g>,
		);
	}
	return (
		<g transform={`scale(${(open * (1 + 0.05 * kick)).toFixed(3)})`}>
			{layers.map((L, i) => {
				const d = melodyFlower(t, sym, L.rIn, L.rOut, L.lag, L.r);
				const c = leadColor(n, s.lead, L.k);
				return (
					<g key={i}>
						<Glow d={d} c={c} w={L.w} fill={rgb(c, 0.07)} />
						{[0.86, 0.72].map((k) => (
							<path key={k} d={d} transform={`scale(${k})`} fill="none" stroke={rgb(c, 0.45)} strokeWidth={1.1 / k} />
						))}
					</g>
				);
			})}
			{[1, 2, 3].map((k) => (
				<path key={k} d={roseContour(0, 0, 40 + k * 26, sym, 0.12, -rot * (1 + k * 0.3), 72)} fill="none" stroke={rgb(lighten(leadColor(n, s.lead, k), 0.3), 0.6)} strokeWidth={1.2} />
			))}
			{comets}
			<NeonBlossom r={64 * (1 + 0.12 * kick)} c={leadColor(n, s.lead, 2)} rot={deg(-rot * 1.5)} />
		</g>
	);
};

// ---------------------------------------------------------------- tunnel
/** Flower-shaped contour rings born on every half beat, rushing toward the camera. */
const Tunnel: React.FC<ShotProps> = ({t, s, n, kick}) => {
	const rings: React.ReactNode[] = [];
	const hb = A.beatPeriod / 2;
	const k0 = Math.floor((t - A.beatPhase) / hb);
	for (let k = k0; k > k0 - 22; k--) {
		const born = A.beatPhase + k * hb;
		const age = t - born;
		if (age < 0) continue;
		const R = 26 * Math.exp(age * 1.55);
		if (R > 1500) break;
		const onBeat = k % 2 === 0;
		const m = melodyNorm(born);
		const c = leadColor(n, s.lead, ((k % 3) + 3) % 3);
		const a = clamp(R / 60, 0, 1) * clamp((1500 - R) / 500, 0, 1) * (onBeat ? 1 : 0.55);
		rings.push(
			<Glow
				key={k}
				d={roseContour(0, 0, R, s.sym, 0.08 + 0.1 * (m + 1) * 0.5, k * 0.37 * s.spin + t * 0.25 * s.spin, 90)}
				c={c}
				w={(onBeat ? 1.2 : 0.7) + R / 260}
				a={a}
			/>,
		);
	}
	return (
		<g>
			{rings}
			<NeonBlossom r={46 * (1 + 0.25 * kick)} c={leadColor(n, s.lead, 1)} rot={t * 40 * s.spin} />
		</g>
	);
};

// ---------------------------------------------------------------- spiral
/** Golden-angle bloom: petals unfurl outward one by one; a beat wave runs through them. */
const Spiral: React.FC<ShotProps> = ({t, lt, s, n}) => {
	const N = Math.min(190, Math.floor(18 + lt * 55));
	const rot = s.spin * lt * 0.35;
	const golden = 2.39996323;
	const bp = beatPhase(t);
	const items: React.ReactNode[] = [];
	for (let k = N - 1; k >= 0; k--) {
		const born = k / 55 - 18 / 55;
		const g = clamp(springy(lt - born, 5, 10), 0, 1.15);
		if (g <= 0) continue;
		const r = 30 * Math.sqrt(k + 1);
		if (r > 760) continue;
		const a = k * golden + rot;
		const x = Math.cos(a) * r;
		const y = Math.sin(a) * r;
		// beat wave travelling outward
		const wave = Math.exp(-Math.pow((r / 700 - bp) * 6, 2));
		const size = (10 + r * 0.07) * g * (1 + 0.5 * wave);
		const c = leadColor(n, s.lead, k % 3);
		const isBloom = k % 13 === 0;
		items.push(
			<g key={k} transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${(deg(a) + 90).toFixed(1)})`} opacity={0.55 + 0.45 * wave}>
				{isBloom ? <NeonBlossom r={size * 1.3} c={c} w={1.2} /> : <path d={petalPath(size * 1.6, size * 0.5)} fill={rgb(c, 0.16)} stroke={rgb(lighten(c, 0.3 + 0.5 * wave))} strokeWidth={1.1} />}
			</g>,
		);
	}
	return <g>{items}</g>;
};

// ---------------------------------------------------------------- ridges
/** Stacked melodic contour lines, each echoing the lead line a moment later. */
const Ridges: React.FC<ShotProps> = ({t, lt, s, n}) => {
	const LINES = 17;
	const span = 2.6;
	const out: React.ReactNode[] = [];
	const reveal = clamp(lt / 1.2, 0, 1);
	for (let j = 0; j < LINES; j++) {
		const y0 = -680 + j * 82;
		const delay = (LINES - 1 - j) * 0.09;
		const pts: Pt[] = [];
		// lines run well past the frame so any roll (up to 90°) still fills it
		for (let i = 0; i <= 64; i++) {
			const x = -1200 + (i / 64) * 2400;
			const tau = t - delay - span * Math.max(0, 0.5 - x / 1440);
			const env = Math.exp(-Math.pow(x / 300, 2));
			const m = melodyNorm(tau);
			const jitter = Math.sin(tau * 9 + j) * 8;
			const depth = 0.6 + 0.4 * (j / LINES);
			pts.push([x, y0 - (55 + (m + 1) * 95 + 45 * curve(A.energy, tau) + jitter) * env * depth]);
		}
		const d = smoothPath(pts);
		const c = leadColor(n, s.lead, j % 3);
		const vis = clamp(reveal * LINES - (LINES - 1 - j) * 0.6, 0, 1);
		out.push(
			<g key={j} opacity={vis}>
				<path d={`${d}L1200,${y0 + 1400}L-1200,${y0 + 1400}Z`} fill={rgb(n.ink, 0.93)} />
				<Glow d={d} c={c} w={1.6} />
			</g>,
		);
	}
	return <g>{out}</g>;
};

// ---------------------------------------------------------------- macro
/** A huge jasmine, close up and off-centre; petals breathe with the melody. */
const Macro: React.FC<ShotProps> = ({t, lt, s, n, kick}) => {
	const P = 5 + (s.sym % 3);
	const rot = s.spin * lt * 6 + s.seed * 40;
	const open = clamp(springy(lt * 0.9, 3.5, 6), 0, 1.1);
	const hi = curve(A.high, t);
	return (
		<g transform={`rotate(${rot.toFixed(1)}) scale(${(open * (1 + 0.03 * kick)).toFixed(3)})`}>
			{Array.from({length: P}, (_, j) => {
				const L = 560 * (0.82 + 0.18 * melodyNorm(t - j * 0.18, true));
				const W = L * 0.36;
				const c = leadColor(n, s.lead, j % 2);
				return (
					<g key={j} transform={`rotate(${((j / P) * 360).toFixed(1)})`}>
						<Glow d={petalPath(L, W, 0.2)} c={c} w={2.4} fill={rgb(c, 0.08)} />
						{[0.82, 0.64, 0.46, 0.28].map((k) => (
							<path key={k} d={petalPath(L * k, W * k * 0.95, 0.24)} fill="none" stroke={rgb(c, 0.5 - k * 0.2)} strokeWidth={1.2} />
						))}
						<path d={`M0,-20L0,${(-L * 0.9).toFixed(1)}`} stroke={rgb(lighten(c, 0.4), 0.35)} strokeWidth={1} />
					</g>
				);
			})}
			{Array.from({length: 16}, (_, k) => {
				const a = (k / 16) * Math.PI * 2 + rand(k + s.seed);
				const r = 34 + rand(k * 3 + s.seed) * 46;
				const tw = 0.4 + 0.6 * Math.max(0, Math.sin(t * 7 + k * 1.3)) * (0.4 + hi);
				return <circle key={k} cx={Math.cos(a) * r} cy={Math.sin(a) * r} r={2.5 + 3 * tw} fill={rgb(lighten(n.neon[1], 0.5), tw)} />;
			})}
		</g>
	);
};

// ---------------------------------------------------------------- constellation
/** Each melody note pops a blossom (higher = higher on screen), joined in order. */
const Constellation: React.FC<ShotProps> = ({t, s, n}) => {
	const WIN = 5.5;
	const notes = NOTES.filter((x) => x.t <= t && x.t > t - WIN && x.dur >= 0.12);
	const pos = (i: number, midi: number): Pt => [(rand(i * 1.77 + s.seed) - 0.5) * 860, -(midi - 79) * 34 + (rand(i * 2.31 + s.seed) - 0.5) * 220];
	const out: React.ReactNode[] = [];
	notes.forEach((note, k) => {
		const age = t - note.t;
		const fade = clamp((WIN - age) / 1.5, 0, 1);
		const [x, y] = pos(note.i, note.midi);
		const c = leadColor(n, s.lead, note.i % 3);
		if (k > 0) {
			const pn = notes[k - 1];
			const [px, py] = pos(pn.i, pn.midi);
			const g = clamp(age / 0.16, 0, 1);
			out.push(<Glow key={`l${note.i}`} d={`M${px.toFixed(1)},${py.toFixed(1)}L${(px + (x - px) * g).toFixed(1)},${(py + (y - py) * g).toFixed(1)}`} c={c} w={1} a={fade * 0.8} />);
		}
		const pop = clamp(springy(age, 5, 10), 0, 1.2);
		out.push(
			<g key={`b${note.i}`} transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${pop.toFixed(3)})`} opacity={fade}>
				<NeonBlossom r={16 + 22 * note.energy + 10 * clamp(note.dur, 0, 1)} c={c} rot={note.i * 37 + age * 30} w={1.3} />
				{age < 0.6 && <circle r={20 + age * 140} fill="none" stroke={rgb(c, 0.6 * (1 - age / 0.6))} strokeWidth={1.5} />}
			</g>,
		);
	});
	return <g>{out}</g>;
};

// ---------------------------------------------------------------- radial vines
/** Vines spiral out of the centre; their sway is the melody, blossoms on notes. */
const Radial: React.FC<ShotProps> = ({t, lt, s, n, kick}) => {
	const arms = 3 + (s.sym % 4);
	const speed = 230;
	const reach = 3.8;
	const grow = clamp(lt / 0.8, 0.25, 1);
	const out: React.ReactNode[] = [];
	const at = (j: number, tau: number): Pt => {
		const r = 26 + (t - tau) * speed * grow;
		const a = (j / arms) * Math.PI * 2 + s.spin * (0.25 * lt + (t - tau) * 0.22) + melodyNorm(tau) * 0.5;
		return [Math.cos(a) * r, Math.sin(a) * r];
	};
	for (let j = 0; j < arms; j++) {
		const pts: Pt[] = [];
		for (let tau = t; tau >= t - reach; tau -= 0.06) pts.push(at(j, tau));
		const c = leadColor(n, s.lead, j % 3);
		out.push(<Glow key={`a${j}`} d={smoothPath(pts)} c={c} w={2.2} />);
		// leaves on the beat
		for (let i = beatIndexAt(t); beatTime(i) > t - reach; i--) {
			const b = beatTime(i);
			const [x, y] = at(j, b);
			const [x2, y2] = at(j, b + 0.05);
			const ang = deg(Math.atan2(y2 - y, x2 - x)) + 90 + (i % 2 ? 55 : -55);
			const len = 26 * clamp(springy(t - b, 5, 9), 0, 1.1);
			out.push(<path key={`l${j}-${i}`} d={leafPath(len, len * 0.35)} transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${ang.toFixed(1)})`} fill={rgb(n.neon[1], 0.2)} stroke={rgb(lighten(n.neon[1], 0.3))} strokeWidth={1} />);
		}
	}
	for (const note of BLOSSOM_NOTES) {
		if (note.t > t || note.t < t - reach) continue;
		const j = note.i % arms;
		const [x, y] = at(j, note.t);
		const g = clamp(springy(t - note.t, 4.5, 8), 0, 1.15);
		out.push(
			<g key={`b${note.i}`} transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${g.toFixed(3)})`}>
				<NeonBlossom r={20 + 18 * note.energy} c={leadColor(n, s.lead, note.i % 3)} rot={note.i * 29} w={1.3} />
			</g>,
		);
	}
	return (
		<g>
			{out}
			<NeonBlossom r={34 * (1 + 0.3 * kick)} c={leadColor(n, s.lead, 2)} rot={t * 50} />
		</g>
	);
};

export const SHOT_VIEWS: Record<Shot['kind'], React.FC<ShotProps>> = {
	kaleido: Kaleido,
	tunnel: Tunnel,
	spiral: Spiral,
	ridges: Ridges,
	macro: Macro,
	constellation: Constellation,
	radial: Radial,
};
