// "Welcome home": Haven's 5 s startup animation (storyboard: lumen/intro-plan.md).
// Ends on the exact first frame of the Home scene loop, so the TV can cut to Home with no seam.
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Easing, continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { SCENE_FRAMES, Tod } from './layout';
import { SceneArt } from './Scene';
import { ISLAND } from './Painted';

export const INTRO_FRAMES = 120;                                   // 5 s at 24 fps
const calm = Easing.bezier(0.32, 0.72, 0, 1);
const PHOTO_WINDOW = { x: 1450, y: 310 };                          // cabin window in the owner's images
const PAINTED_WINDOW = { x: ISLAND.x, y: ISLAND.y - 23 };
// Words sit in the open sky left of the island (island spans x ~1350-1570, y 270-480): text left, light right.
const TEXT_X = 700;

const ease = (f: number, a: number, b: number, from: number, to: number, e = calm) =>
  interpolate(f, [a, b], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: e });

function useSerif() {
  const [handle] = useState(() => delayRender('Instrument Serif'));
  useEffect(() => {
    const face = new FontFace('Instrument Serif', `url(${staticFile('fonts/instrument-serif-400.woff2')})`, { weight: '400' });
    face.load().then((f) => { document.fonts.add(f); continueRender(handle); }).catch(() => continueRender(handle));
  }, [handle]);
}

export const Intro: React.FC<{ tod: Tod; source?: string; graded?: boolean }> = ({ tod, source, graded }) => {
  useSerif();
  const f = useCurrentFrame();
  const sceneFrame = (((f - INTRO_FRAMES) % SCENE_FRAMES) + SCENE_FRAMES) % SCENE_FRAMES;   // f = 120 -> loop frame 0
  const win = source ? PHOTO_WINDOW : PAINTED_WINDOW;
  const textOut = ease(f, 92, 106, 1, 0);
  const glow = f < 70 ? ease(f, 18, 46, 0, 1) : ease(f, 70, 112, 1, 0);
  const word = (start: number): React.CSSProperties => ({
    display: 'inline-block', margin: '0 0.14em',
    opacity: ease(f, start, start + 18, 0, 1) * textOut,
    filter: `blur(${(ease(f, start, start + 22, 10, 0) + ease(f, 92, 106, 0, 6)).toFixed(2)}px)`,
    translate: `0px ${(ease(f, start, start + 22, 12, 0) - ease(f, 92, 106, 0, 8)).toFixed(2)}px`,
  });
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ scale: String(ease(f, 0, 112, 1.07, 1)) }}>
        <SceneArt tod={tod} source={source} graded={graded} frame={sceneFrame} />
        {/* the cabin light coming on: a warm bloom that settles back to the scene's own light */}
        <AbsoluteFill style={{ mixBlendMode: 'screen' as never, opacity: glow,
          background: `radial-gradient(60px 52px at ${win.x}px ${win.y}px, rgba(255,186,96,.95), rgba(255,160,70,0) 72%),
                       radial-gradient(260px 200px at ${win.x}px ${win.y}px, rgba(255,170,80,.28), rgba(255,170,80,0) 70%)` }} />
      </AbsoluteFill>
      {/* a soft shade behind the words so they read over the bright morning sky */}
      <AbsoluteFill style={{ opacity: ease(f, 30, 52, 0, 1) * textOut,
        background: `radial-gradient(760px 300px at ${TEXT_X}px 420px, rgba(10,8,6,.42), rgba(10,8,6,0) 75%)` }} />
      <div style={{ position: 'absolute', top: 330, left: 0, width: TEXT_X * 2, textAlign: 'center', color: '#f3ece1',
        font: "400 150px/1 'Instrument Serif', serif", letterSpacing: '-0.005em', textShadow: '0 2px 30px rgba(10,8,6,.45)' }}>
        <span style={word(34)}>Welcome</span><span style={word(44)}>home</span>
      </div>
      <div style={{ position: 'absolute', top: 506, left: TEXT_X - 170, width: 340, height: 2, borderRadius: 1, background: '#e6b06a',
        boxShadow: '0 0 10px 2px rgba(230,176,106,.65), 0 0 28px 6px rgba(230,176,106,.25)',
        scale: `${ease(f, 52, 76, 0, 1).toFixed(3)} 1`, opacity: textOut }} />
      <AbsoluteFill style={{ background: '#000', opacity: ease(f, 0, 30, 1, 0, Easing.bezier(0.4, 0, 0.2, 1)) }} />
    </AbsoluteFill>
  );
};
