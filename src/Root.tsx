import React from 'react';
import {Composition} from 'remotion';
import {LilJasmine} from './LilJasmine';
import {Nocturne} from './v2/Nocturne';
import {A, FPS} from './lib/timeline';
import {H, W} from './lib/stage';

const REEL_START = A.sections.find((s) => s.name === 'lift')!.start; // pre-drop build
const REEL_END = A.sections.find((s) => s.name === 'break1')!.start + 2.5; // drop 1 + tail

export const RemotionRoot: React.FC = () => (
	<>
		{/* Full song, 9:16 for TikTok */}
		<Composition id="LilJasmine" component={LilJasmine} durationInFrames={A.nFrames} fps={FPS} width={W} height={H} defaultProps={{startAt: 0}} />
		{/* ~57 s cut (build -> drop 1) that fits Instagram Reels' 3-minute cap with room to spare */}
		<Composition
			id="LilJasmineReel"
			component={LilJasmine}
			durationInFrames={Math.round((REEL_END - REEL_START) * FPS)}
			fps={FPS}
			width={W}
			height={H}
			defaultProps={{startAt: REEL_START}}
		/>
		{/* Darker, faster, beat-cut "Nocturne" edit of the same song */}
		<Composition id="LilJasmineNocturne" component={Nocturne} durationInFrames={A.nFrames} fps={FPS} width={W} height={H} defaultProps={{startAt: 0}} />
		<Composition
			id="LilJasmineNocturneReel"
			component={Nocturne}
			durationInFrames={Math.round((REEL_END - REEL_START) * FPS)}
			fps={FPS}
			width={W}
			height={H}
			defaultProps={{startAt: REEL_START}}
		/>
	</>
);
