// Interim painted landscape: one fixed composition, three lights. Replaced by a photo when
// public/scene-source.jpg exists (see render.sh); only the motion layers in Scene.tsx stay.
import React from 'react';
import { W, H, Tod } from './layout';

type Pal = { sky: [string, string, string]; far: string; mid: string; near: string; water: [string, string];
  light: string; lightR: number; glow: string; moon: boolean; window: number; stars: boolean };

export const PALETTES: Record<Tod, Pal> = {
  morning: { sky: ['#33445e', '#b9a68c', '#f2d7aa'], far: '#9a9284', mid: '#5b5651', near: '#24211f',
    water: ['#a59a87', '#17161a'], light: '#fff3d6', lightR: 60, glow: 'rgba(255,236,200,.55)', moon: false, window: 0.25, stars: false },
  day: { sky: ['#211c26', '#93613a', '#f4bb6c'], far: '#a7704a', mid: '#5f3d2b', near: '#1d1512',
    water: ['#b5804c', '#0f0b09'], light: '#ffe2ae', lightR: 70, glow: 'rgba(255,190,110,.6)', moon: false, window: 0.55, stars: false },
  night: { sky: ['#06090f', '#121d31', '#2c3a55'], far: '#27334b', mid: '#151d2d', near: '#080b11',
    water: ['#1b2539', '#04060a'], light: '#e9edf3', lightR: 46, glow: 'rgba(200,215,240,.35)', moon: true, window: 1, stars: true },
};

// Deterministic randomness so every render (and every light) has the same shapes.
function rng(seed: number) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

type Spire = { x: number; w: number; h: number };
function ridge(seed: number, base: number, rough: number, spires: Spire[]) {
  const r = rng(seed), pts: string[] = [`M0 ${H}`];
  let n = 0;
  for (let x = 0; x <= W; x += 6) {
    n += (r() - 0.5) * rough; n *= 0.92;
    let y = base + n + Math.sin(x / 210 + seed) * rough * 1.6;
    for (const s of spires) { const d = Math.abs(x - s.x) / s.w; if (d < 1) y -= s.h * Math.pow(1 - d, 1.7) * (0.92 + r() * 0.08); }
    pts.push(`L${x} ${y.toFixed(1)}`);
  }
  return pts.join(' ') + ` L${W} ${H} Z`;
}

const FAR = ridge(7, 640, 7, [{ x: 140, w: 70, h: 330 }, { x: 330, w: 55, h: 230 }, { x: 520, w: 40, h: 120 },
  { x: 1540, w: 60, h: 260 }, { x: 1720, w: 75, h: 380 }, { x: 1860, w: 45, h: 210 }]);
const MID = ridge(19, 700, 9, [{ x: 40, w: 90, h: 420 }, { x: 250, w: 60, h: 300 }, { x: 1640, w: 70, h: 330 }, { x: 1900, w: 100, h: 470 }]);
// Near shore: only the two corners rise, so the lake stays open across the middle.
const NEAR = ridge(31, H + 30, 4, [{ x: 0, w: 420, h: 330 }, { x: 1920, w: 480, h: 360 }]);

export const LIGHT = { x: 1180, y: 618 };            // the sun sits on the horizon
export const MOON = { x: 930, y: 380 };              // night: the moon, clear of the island
export const lightX = (moon: boolean) => (moon ? MOON.x : LIGHT.x);
export const ISLAND = { x: 1290, y: 300 };           // floating island anchor

export const Island: React.FC<{ pal: Pal; lantern: number }> = ({ pal, lantern }) => (
  <g>
    {/* rock: an inverted cone with a ragged underside */}
    <path d="M-150 0 C-120 -16 120 -18 150 0 C138 26 96 40 70 70 C52 102 30 150 6 210 C-8 160 -30 118 -58 84 C-92 52 -136 30 -150 0 Z" fill={pal.mid} />
    <path d="M-150 0 C-120 -16 120 -18 150 0 C120 10 -110 12 -150 0 Z" fill={pal.far} opacity={0.55} />
    {/* trees */}
    {[[-110, 40], [-84, 58], [-60, 34], [74, 46], [104, 62], [124, 38]].map(([x, h], i) => (
      <path key={i} d={`M${x - 11} -4 L${x} ${-h} L${x + 11} -4 Z`} fill={pal.near} />))}
    {/* small house with a lit window: the only warm light in the painting */}
    <rect x={-26} y={-44} width={52} height={40} fill={pal.near} />
    <path d="M-34 -44 L0 -70 L34 -44 Z" fill={pal.near} />
    <rect x={-8} y={-32} width={16} height={18} fill="#ffb35c" opacity={0.25 + 0.75 * pal.window * lantern} />
    <circle cx={0} cy={-23} r={46} fill="url(#lanternGlow)" opacity={pal.window * lantern} />
  </g>
);

export const PaintedStatic: React.FC<{ tod: Tod }> = ({ tod }) => {
  const p = PALETTES[tod];
  const stars = rng(5);
  return (
    <>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} /><stop offset=".45" stopColor={p.sky[1]} /><stop offset=".6" stopColor={p.sky[2]} />
        </linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.water[0]} /><stop offset="1" stopColor={p.water[1]} />
        </linearGradient>
        <radialGradient id="lightGlow"><stop offset="0" stopColor={p.glow} /><stop offset="1" stopColor="rgba(0,0,0,0)" /></radialGradient>
        <radialGradient id="lanternGlow"><stop offset="0" stopColor="rgba(255,179,92,.55)" /><stop offset="1" stopColor="rgba(255,179,92,0)" /></radialGradient>
        <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p.sky[2]} stopOpacity="0" /><stop offset="1" stopColor={p.sky[2]} stopOpacity=".5" /></linearGradient>
        <filter id="soften"><feGaussianBlur stdDeviation="2.2" /></filter>
        <clipPath id="lake"><rect y={720} width={W} height={H - 720} /></clipPath>
      </defs>
      <rect width={W} height={H} fill="url(#sky)" />
      {p.stars && Array.from({ length: 140 }, (_, i) => (
        <circle key={i} cx={stars() * W} cy={stars() * 520} r={0.6 + stars() * 1.3} fill="#e9edf3" opacity={0.25 + stars() * 0.6} />))}
      <circle cx={p.moon ? MOON.x : LIGHT.x} cy={p.moon ? MOON.y : LIGHT.y} r={420} fill="url(#lightGlow)" />
      {p.moon ? (
        <>
          <radialGradient id="moonFace" cx="40%" cy="38%"><stop offset="0" stopColor="#f6f8fb" /><stop offset="1" stopColor="#b9c3d2" /></radialGradient>
          <circle cx={MOON.x} cy={MOON.y} r={p.lightR} fill="url(#moonFace)" />
        </>
      ) : <circle cx={LIGHT.x} cy={LIGHT.y} r={p.lightR} fill={p.light} opacity={0.9} />}
      <path d={FAR} fill={p.far} />
      <rect y={420} width={W} height={300} fill="url(#haze)" />
      <path d={MID} fill={p.mid} />
      {/* lake with a soft mirror of the far range */}
      <rect y={720} width={W} height={H - 720} fill="url(#water)" />
      <g clipPath="url(#lake)">
        <g transform={`translate(0 ${720 * 2}) scale(1 -1)`} opacity={0.32} filter="url(#soften)">
          <path d={FAR} fill={p.far} /><path d={MID} fill={p.mid} />
        </g>
      </g>
      <path d={NEAR} fill={p.near} />
    </>
  );
};
