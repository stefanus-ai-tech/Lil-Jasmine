import React from 'react';
import {AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {lighten, rgb} from '../lib/palette';
import {CX, CY, H, W} from '../lib/stage';
import {A, FPS, beatPulse, clamp, curve, dropFlash, easeInOutSine, easeOutCubic, lerp, smoothstep} from '../lib/timeline';
import {RiserStreaks, Sky, Sparks} from './Atmosphere';
import {leadColor, nightAt} from './night';
import {SHOT_VIEWS} from './ShotViews';
import {SHOTS, Shot, shotIndexAt} from './shots';

const XFADE = 0.22; // seconds the outgoing shot zooms through

const cameraFor = (s: Shot, t: number, kick: number) => {
	const lt = t - s.start;
	const u = clamp(lt / (s.end - s.start), 0, 1);
	const z = lerp(s.z0, s.z1, easeInOutSine(u)) * (1 + 0.03 * kick);
	const drift = s.kind === 'ridges' ? 1.5 : 7;
	const roll = s.roll + s.spin * lt * drift;
	return {lt, z, roll, x: CX + s.ox, y: CY + s.oy};
};

const ShotLayer: React.FC<{s: Shot; t: number; zoomThrough?: number; enter?: number}> = ({s, t, zoomThrough = 0, enter = 1}) => {
	const n = nightAt(t);
	const kick = beatPulse(t, 0.12);
	const cam = cameraFor(s, t, kick);
	const View = SHOT_VIEWS[s.kind];
	const z = cam.z * (1 + zoomThrough * 0.9) * lerp(0.86, 1, easeOutCubic(enter));
	return (
		<g transform={`translate(${cam.x.toFixed(1)},${cam.y.toFixed(1)}) rotate(${cam.roll.toFixed(2)}) scale(${z.toFixed(4)})`} opacity={(1 - zoomThrough) * clamp(enter * 1.6, 0, 1)}>
			<View t={t} lt={cam.lt} s={s} n={n} kick={kick} e={curve(A.energy, t)} />
		</g>
	);
};

export type NocturneProps = {startAt: number};

/**
 * "Nocturne" cut: a darker, faster, less predictable edit of the same garden.
 * The song is pre-cut into beat-aligned shots (see shots.ts); each shot picks its own
 * visual, symmetry, spin and camera move, and the outgoing shot zooms through the cut.
 */
export const Nocturne: React.FC<NocturneProps> = ({startAt}) => {
	const frame = useCurrentFrame();
	const {durationInFrames} = useVideoConfig();
	const t = startAt + frame / FPS;
	const tEnd = startAt + durationInFrames / FPS;
	const n = nightAt(t);
	const si = shotIndexAt(t);
	const s = SHOTS[si];
	const lt = t - s.start;
	const prev = si > 0 && lt < XFADE ? SHOTS[si - 1] : null;
	const e = curve(A.energy, t);

	// cut flash: tinted by the new shot's lead colour, stronger when the music is loud
	const cutFlash = si > 0 ? Math.exp(-lt / 0.08) * (0.1 + 0.32 * e) : 0;
	const flash = cutFlash + dropFlash(t) * 0.28;
	const flashCol = leadColor(n, s.lead);
	// kick bloom: the centre of the frame glows in the lead colour on every kick
	const bloomCol = leadColor(n, s.lead, 1);
	const fadeIn = 1 - smoothstep(startAt, startAt + 1.5, t);
	const fadeOut = smoothstep(tEnd - (tEnd >= A.duration - 0.1 ? 5 : 1.8), tEnd - 0.1, t);
	const kick = beatPulse(t, 0.12);

	return (
		<AbsoluteFill style={{backgroundColor: '#0d0818'}}>
			<Audio src={staticFile('lil-jasmine.mp3')} trimBefore={Math.round(startAt * FPS)} />
			<svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
				<Sky t={t} n={n} />
				<g transform={`translate(${CX},${CY}) scale(${(1 + 0.02 * kick).toFixed(4)})`}>
					<Sparks t={t} n={n} />
				</g>
				{prev && <ShotLayer s={prev} t={t} zoomThrough={lt / XFADE} />}
				<ShotLayer s={s} t={t} enter={clamp(lt / XFADE, 0, 1)} />
				<RiserStreaks t={t} n={n} />
			</svg>
			<AbsoluteFill style={{background: `radial-gradient(ellipse 70% 58% at 50% 45%, rgba(0,0,0,0) 45%, rgba(8,4,16,0.7) 100%)`}} />
			<AbsoluteFill style={{background: `radial-gradient(circle at 50% 45%, ${rgb(bloomCol, 0.22 * kick * (0.4 + e))} 0%, rgba(0,0,0,0) 55%)`, mixBlendMode: 'screen'}} />
			<AbsoluteFill style={{background: rgb(flashCol, clamp(flash, 0, 0.42)), mixBlendMode: 'screen'}} />
			<AbsoluteFill style={{background: rgb([10, 6, 20], Math.max(fadeIn, fadeOut))}} />
			<Img src={staticFile('grain.png')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.1, mixBlendMode: 'overlay'}} />
		</AbsoluteFill>
	);
};
