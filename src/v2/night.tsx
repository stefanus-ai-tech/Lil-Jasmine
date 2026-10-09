import React from 'react';
import {Palette, RGB, lighten, mix, paletteAt, rgb, saturate} from '../lib/palette';

const INK: RGB = [16, 9, 30]; // deep plum night
const INK2: RGB = [9, 6, 20];

export type Night = {
	skyTop: RGB;
	skyBottom: RGB;
	glowA: RGB;
	glowB: RGB;
	/** three neon pastels: [petal, accent, petalDeep] lifted to glow on the dark */
	neon: [RGB, RGB, RGB];
	ink: RGB;
};

const neonOf = (c: RGB): RGB => saturate(c, 1.75, -0.02);

/** The same chord palettes as the pastel cut, re-lit for a night scene. */
export const nightAt = (t: number): Night => {
	const p: Palette = paletteAt(t);
	return {
		skyTop: mix(INK, p.bottom, 0.2),
		skyBottom: mix(INK2, p.petalDeep, 0.12),
		glowA: p.petalDeep,
		glowB: p.accent,
		neon: [neonOf(p.petal), neonOf(p.accent), neonOf(p.petalDeep)],
		ink: INK,
	};
};

export const leadColor = (n: Night, lead: number, k = 0): RGB => n.neon[(lead + k) % 3];

/** Cheap neon glow: a wide faint halo, a mid glow and a bright core on the same path. */
export const Glow: React.FC<{d: string; c: RGB; w?: number; a?: number; fill?: string}> = ({d, c, w = 2, a = 1, fill}) => (
	<g opacity={a}>
		{fill && <path d={d} fill={fill} />}
		<path d={d} fill="none" stroke={rgb(c, 0.1)} strokeWidth={w * 7} strokeLinejoin="round" strokeLinecap="round" />
		<path d={d} fill="none" stroke={rgb(c, 0.38)} strokeWidth={w * 2.6} strokeLinejoin="round" strokeLinecap="round" />
		<path d={d} fill="none" stroke={rgb(lighten(c, 0.22))} strokeWidth={w} strokeLinejoin="round" strokeLinecap="round" />
	</g>
);
