import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from './components/Background';
import {Bokeh} from './components/Bokeh';
import {Ferns} from './components/Ferns';
import {Mandala} from './components/Mandala';
import {Overlay} from './components/Overlay';
import {Petals} from './components/Petals';
import {Ripples} from './components/Ripples';
import {Vine} from './components/Vine';
import {CX, CY, H, W} from './lib/stage';
import {FPS, beatPulse, dropFlash, modeWeights} from './lib/timeline';

export type LilJasmineProps = {
	/** Seconds into the song where this cut starts (0 for the full MV). */
	startAt: number;
};

export const LilJasmine: React.FC<LilJasmineProps> = ({startAt}) => {
	const frame = useCurrentFrame();
	const {durationInFrames} = useVideoConfig();
	const t = startAt + frame / FPS;
	const w = modeWeights(t);
	// the whole garden leans in a touch on every kick and punches in on drops
	const cam = 1 + 0.012 * beatPulse(t, 0.12) + 0.05 * dropFlash(t);
	return (
		<AbsoluteFill style={{backgroundColor: '#E9D5F2'}}>
			<Audio src={staticFile('lil-jasmine.mp3')} trimBefore={Math.round(startAt * FPS)} />
			<svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
				<Background t={t} />
				<g transform={`translate(${CX},${CY}) scale(${cam.toFixed(4)}) translate(${-CX},${-CY})`}>
					<Bokeh t={t} />
					<Ripples t={t} w={w} />
					<Mandala t={t} bloom={w.mandala} ghost={w.float} />
					<Vine t={t} weight={w.vine} />
					<Petals t={t} float={w.float} />
				</g>
				<Ferns t={t} />
			</svg>
			<Overlay t={t} tStart={startAt} tEnd={startAt + durationInFrames / FPS} />
		</AbsoluteFill>
	);
};
