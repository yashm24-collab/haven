import React from 'react';
import { AbsoluteFill, Composition, Still, getInputProps } from 'remotion';
import { FPS, GLOBE_FRAMES, H, SCENE_FRAMES, TODS, W } from './layout';
import { Scene, SceneArt } from './Scene';
import { GlassBg } from './Glass';
import { Globe } from './Globe';
import { Intro, INTRO_FRAMES } from './Intro';

// render.sh passes the owner's image for the time of day being rendered (see render.sh).
const { source, graded } = getInputProps() as { source?: string; graded?: boolean };

// The LUMEN orb as a still: app icon and splash mark.
const Orb: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', position: 'relative',
    background: 'radial-gradient(circle at 36% 30%, #fbe6c2 0%, #e6b06a 28%, #8a5a2c 62%, #2a1a0e 100%)',
    boxShadow: `0 0 ${size * 0.35}px rgba(230,176,106,.45), inset 0 0 0 ${Math.max(1, size / 60)}px rgba(255,240,215,.35)` }}>
    <div style={{ position: 'absolute', left: '18%', top: '12%', width: '44%', height: '30%', borderRadius: '50%',
      background: 'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,.75), rgba(255,255,255,0) 70%)' }} />
  </div>
);
const Icon: React.FC = () => <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}><Orb size={92} /></AbsoluteFill>;
// LG's launch splash: plain black, the first frame of the "Welcome home" intro, so power-on has no jump.
const Splash: React.FC = () => <AbsoluteFill style={{ background: '#000' }} />;

export const RemotionRoot: React.FC = () => (
  <>
    {TODS.map((tod) => (
      <React.Fragment key={tod}>
        <Composition id={`scene-${tod}`} component={Scene} durationInFrames={SCENE_FRAMES} fps={FPS} width={W} height={H} defaultProps={{ tod, source, graded }} />
        <Still id={`still-${tod}`} component={Scene} width={W} height={H} defaultProps={{ tod, source, graded, still: true }} />
        <Still id={`wcbg-${tod}`} component={GlassBg} width={W} height={H} defaultProps={{ tod, sheet: 'wc' as const, source, graded }} />
        <Still id={`setbg-${tod}`} component={GlassBg} width={W} height={H} defaultProps={{ tod, sheet: 'set' as const, source, graded }} />
        <Composition id={`globe-${tod}`} component={Globe} durationInFrames={GLOBE_FRAMES} fps={FPS} width={W} height={H} defaultProps={{ tod }} />
        <Composition id={`intro-${tod}`} component={Intro} durationInFrames={INTRO_FRAMES} fps={FPS} width={W} height={H} defaultProps={{ tod, source, graded }} />
      </React.Fragment>
    ))}
    <Still id="splash" component={Splash} width={W} height={H} />
    <Still id="icon" component={Icon} width={130} height={130} />
  </>
);
