import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {lighten, paletteAt, rgb} from '../lib/palette';
import {A, dropFlash, sinceLast, smoothstep} from '../lib/timeline';

/** Vignette, soft white bloom on drops, static film grain, fade in / out. */
export const Overlay: React.FC<{t: number; tStart: number; tEnd: number}> = ({t, tStart, tEnd}) => {
	const p = paletteAt(t);
	const flash = dropFlash(t) * 0.6 + Math.exp(-sinceLast(A.accents, t) / 0.3) * 0.18;
	const fadeIn = 1 - smoothstep(tStart, tStart + 1.2, t);
	const fadeOut = smoothstep(tEnd - (tEnd >= A.duration - 0.1 ? 4.5 : 1.8), tEnd - 0.15, t);
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<AbsoluteFill
				style={{
					background: `radial-gradient(ellipse 75% 62% at 50% 45%, rgba(0,0,0,0) 55%, ${rgb([104, 64, 138], 0.2)} 100%)`,
				}}
			/>
			<AbsoluteFill style={{background: `radial-gradient(circle at 50% 45%, rgba(255,255,255,${flash.toFixed(3)}) 0%, rgba(255,255,255,${(flash * 0.5).toFixed(3)}) 70%)`}} />
			<AbsoluteFill style={{background: rgb(lighten(p.top, 0.55), Math.max(fadeIn, fadeOut))}} />
			<Img src={staticFile('grain.png')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.07, mixBlendMode: 'overlay'}} />
		</AbsoluteFill>
	);
};
