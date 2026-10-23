// Iso-glow globe for the World Clock: a warm hairline drawing (graticule, coastlines, a faint far side)
// turning once a minute over the baked sheet backdrop. Accent appears only as the "power on" haze; the
// live accent (the focused city) is drawn on the TV, synced to this rotation (app.js globePoint()).
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import land110 from 'world-atlas/land-110m.json';
import { GLOBE, GLOBE_FRAMES, W, H, Tod } from './layout';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const topo = land110 as any;
const LAND = feature(topo, topo.objects.land);
const GRAT = geoGraticule10();
const INK = 'rgba(243,236,225,';

export const Globe: React.FC<{ tod: Tod }> = ({ tod }) => {
  const f = useCurrentFrame();
  const lambda = -180 + (360 * f) / GLOBE_FRAMES;     // front centre longitude = -lambda (app.js matches)
  const base = () => geoOrthographic().translate([GLOBE.cx, GLOBE.cy]).scale(GLOBE.r).clipAngle(90);
  const front = geoPath(base().rotate([lambda, -GLOBE.tilt]));
  const back = geoPath(base().rotate([lambda - 180, GLOBE.tilt]).reflectX(true));
  return (
    <AbsoluteFill>
      <Img src={staticFile(`bg-wc-${tod}.jpg`)} style={{ width: W, height: H }} />
      <svg width={W} height={H} style={{ position: 'absolute' }}>
        <defs>
          <filter id="haze" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="22" /></filter>
          <radialGradient id="body" cx="38%" cy="32%" r="75%">
            <stop offset="0" stopColor="rgba(230,176,106,.16)" /><stop offset=".6" stopColor="rgba(20,16,12,.55)" /><stop offset="1" stopColor="rgba(8,6,4,.85)" />
          </radialGradient>
        </defs>
        <circle cx={GLOBE.cx} cy={GLOBE.cy} r={GLOBE.r + 6} fill="none" stroke="#e6b06a" strokeWidth={14} opacity={0.26} filter="url(#haze)" />
        <circle cx={GLOBE.cx} cy={GLOBE.cy} r={GLOBE.r} fill="url(#body)" />
        <path d={back(GRAT) ?? ''} fill="none" stroke={INK + '.05)'} strokeWidth={1} />
        <path d={back(LAND) ?? ''} fill="none" stroke={INK + '.13)'} strokeWidth={1.2} />
        <path d={front(GRAT) ?? ''} fill="none" stroke={INK + '.17)'} strokeWidth={1.2} />
        <path d={front(LAND) ?? ''} fill={INK + '.05)'} stroke={INK + '.66)'} strokeWidth={1.7} strokeLinejoin="round" />
        <circle cx={GLOBE.cx} cy={GLOBE.cy} r={GLOBE.r} fill="none" stroke={INK + '.42)'} strokeWidth={1.7} />
      </svg>
    </AbsoluteFill>
  );
};
