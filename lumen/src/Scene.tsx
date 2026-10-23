// The living scene: a still (painted, or the owner's photo) plus motion that loops seamlessly.
// Every moving value is periodic in SCENE_FRAMES, so frame N == frame 0 and the TV loop has no seam.
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { W, H, SCENE_FRAMES, Tod } from './layout';
import { PaintedStatic, PALETTES, Island, ISLAND, lightX } from './Painted';

const TAU = Math.PI * 2;
const rgb = (hex: string) => [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3));

// Photo grading: same image, three lights. Night turns the sunset into moonrise: colour out, blue in
// (the sun becomes a pale moon on the horizon), deepened, with the cabin window kept warm.
type Layer = { background: string; blend: string };
const PHOTO_GRADE: Record<Tod, { filter: string; layers: Layer[] }> = {
  morning: { filter: 'brightness(1.04) saturate(.88)', layers: [{ background: 'rgba(170,190,215,.18)', blend: 'soft-light' }] },
  day: { filter: 'saturate(1.08)', layers: [{ background: 'rgba(255,170,90,.14)', blend: 'soft-light' }] },
  night: { filter: 'saturate(.18) brightness(.62) contrast(1.12)', layers: [
    { background: 'rgb(40,64,124)', blend: 'color' },
    { background: 'rgba(18,26,52,.38)', blend: 'multiply' }] },
};
// Where the owner's image has its cabin window (1920x1080 space); only used when night is graded from day.
const PHOTO_WINDOW = { x: 1450, y: 310 };

// graded = the photo was made for this time of day (scene-<tod>.jpg), so no colour grade is applied.
export type SceneProps = { tod: Tod; source?: string; graded?: boolean; still?: boolean };

export const SceneArt: React.FC<SceneProps & { frame: number }> = ({ tod, source, graded, frame }) => {
  const p = PALETTES[tod], t = (frame % SCENE_FRAMES) / SCENE_FRAMES;
  const bob = Math.sin(TAU * t) * 6;                                     // island floats, one breath per loop
  const lantern = 0.86 + 0.08 * Math.sin(TAU * t * 7) + 0.06 * Math.sin(TAU * t * 13 + 1);
  const mist = (k: number, r: number) => `translate(${(Math.cos(TAU * t * k) * r).toFixed(2)}px, ${(Math.sin(TAU * t * k) * r * 0.35).toFixed(2)}px)`;
  const mistColor = tod === 'night' ? '#9fb0cc' : p.sky[2];
  return (
    <AbsoluteFill style={{ background: '#14110e', overflow: 'hidden' }}>
      {source ? (
        <AbsoluteFill>
          <Img src={staticFile(source)} style={{ width: W, height: H, objectFit: 'cover', filter: graded ? 'none' : PHOTO_GRADE[tod].filter }} />
          {!graded && PHOTO_GRADE[tod].layers.map((l, i) => <AbsoluteFill key={i} style={{ background: l.background, mixBlendMode: l.blend as never }} />)}
          {!graded && tod === 'night' && (
            <AbsoluteFill style={{ mixBlendMode: 'screen' as never, background: `radial-gradient(70px 60px at ${PHOTO_WINDOW.x}px ${PHOTO_WINDOW.y}px, rgba(255,170,80,${(0.85 * lantern).toFixed(3)}), rgba(255,150,60,0) 70%)` }} />
          )}
          {/* sunlight breathing on the water, under the sun (owner's image puts it at LIGHT.x like the painting) */}
          {(tod !== 'night' || graded) && (
            <svg width={W} height={H} style={{ position: 'absolute' }}>
              {Array.from({ length: 12 }, (_, i) => {
                const a = 0.5 + 0.5 * Math.sin(TAU * (t * (2 + (i % 3)) + i * 0.37)), w = 150 - i * 8;
                return <rect key={i} x={lightX(false) - w / 2 + Math.sin(TAU * t + i) * 10} y={772 + i * 14} width={w} height={2} rx={1}
                  fill="#ffe2ae" opacity={(0.05 + 0.16 * a) * (1 - i / 14) * (tod === 'night' ? 0.7 : 1)} />;
              })}
            </svg>
          )}
        </AbsoluteFill>
      ) : (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute' }}>
          <PaintedStatic tod={tod} />
          <g transform={`translate(${ISLAND.x} ${ISLAND.y + bob})`}><Island pal={p} lantern={lantern} /></g>
          {/* light on the water: streaks that breathe in place */}
          {Array.from({ length: 14 }, (_, i) => {
            const y = 742 + i * 17, w = 260 - i * 13, a = 0.5 + 0.5 * Math.sin(TAU * (t * (2 + (i % 3)) + i * 0.37));
            return <rect key={i} x={lightX(p.moon) - w / 2 + Math.sin(TAU * t + i) * 14} y={y} width={w} height={2.4} rx={1.2}
              fill={p.light} opacity={(0.08 + 0.22 * a) * (1 - i / 16) * (tod === 'night' ? 0.7 : 1)} />;
          })}
        </svg>
      )}
      {/* two mist bands drifting on closed paths */}
      <svg width={W} height={H} style={{ position: 'absolute' }}>
        <defs>
          <filter id="mist" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.0016 0.009" numOctaves={3} seed={4} />
            <feColorMatrix type="matrix" values={`0 0 0 0 ${rgb(mistColor)[0]}  0 0 0 0 ${rgb(mistColor)[1]}  0 0 0 0 ${rgb(mistColor)[2]}  0 0 0 1.6 -0.55`} />
          </filter>
          <linearGradient id="bandLow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".45" stopColor="#fff" stopOpacity="1" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id="mLow"><rect x={-200} y={560} width={W + 400} height={300} fill="url(#bandLow)" /></mask>
          <mask id="mHigh"><rect x={-200} y={420} width={W + 400} height={220} fill="url(#bandLow)" /></mask>
        </defs>
        <g mask="url(#mLow)" opacity={source && tod === 'night' ? 0.16 : 0.42}>
          <g style={{ transform: mist(1, 90) }}><rect x={-200} y={500} width={W + 400} height={420} filter="url(#mist)" fill={mistColor} /></g>
        </g>
        <g mask="url(#mHigh)" opacity={source && tod === 'night' ? 0.1 : 0.28}>
          <g style={{ transform: mist(2, 60) }}><rect x={-200} y={380} width={W + 400} height={300} filter="url(#mist)" fill={mistColor} /></g>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

export const Scene: React.FC<SceneProps> = (props) => {
  const frame = useCurrentFrame();
  return <SceneArt {...props} frame={props.still ? 0 : frame} />;
};
