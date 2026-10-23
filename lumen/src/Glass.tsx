// Baked liquid glass. The refraction is the owner's LiquidGlass component (Snell's-law displacement map
// through an SVG backdrop filter), rendered once here because the TV cannot run it live (PRD §16).
// The sheet also carries CleanYourTV's GlassView finish: a crisp rim and a sheen over the top 45%.
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender } from 'remotion';
import { SceneArt } from './Scene';
import { SHEET_DIM, Tod, WC_SHEET, SET_SHEET } from './layout';

type Rect = { x: number; y: number; w: number; h: number; r: number };

function sdRoundedBox(px: number, py: number, halfW: number, halfH: number, r: number) {
  const qx = Math.abs(px) - halfW + r, qy = Math.abs(py) - halfH + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}
function bendFromDepth(x: number) {
  const u = 1 - Math.min(1, Math.max(0, x)), denom = (1 - u ** 4) ** 0.75;
  if (denom < 1e-6) return 0;
  const thetaI = Math.atan(Math.min(u ** 3 / denom, 8)), sinT = Math.sin(thetaI) / 1.5;
  return sinT >= 1 ? Math.sin(thetaI) : Math.sin(thetaI - Math.asin(sinT));
}
function displacementMap(width: number, height: number, radius: number, bevelDepth: number, dpr: number) {
  const gain = 1.35, lx = -0.55 / Math.hypot(0.55, 0.85), ly = -0.85 / Math.hypot(0.55, 0.85);
  const W = Math.round(width * dpr), H = Math.round(height * dpr), halfW = W / 2, halfH = H / 2;
  const r = Math.min(radius * dpr, halfW, halfH), bevel = Math.max(1, bevelDepth * dpr);
  const n = Math.ceil(bevel), phi = new Float32Array(n + 1);
  for (let d = 1; d <= n; d++) phi[d] = phi[d - 1] + bendFromDepth(d / n);
  const sample = (depth: number) => { if (depth <= 0) return 0; if (depth >= n) return phi[n];
    const i = Math.floor(depth), f = depth - i; return phi[i] * (1 - f) + phi[i + 1] * f; };
  const field = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = sdRoundedBox(x - halfW + 0.5, y - halfH + 0.5, halfW, halfH, r); field[y * W + x] = d > 0 ? 0 : sample(Math.min(bevel, -d)); }
  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) { const py = y - halfH + 0.5; for (let x = 0; x < W; x++) {
    const px = x - halfW + 0.5, i = (y * W + x) << 2, d = sdRoundedBox(px, py, halfW, halfH, r);
    if (d > 0) { data[i] = data[i + 1] = data[i + 2] = 128; data[i + 3] = 0; continue; }
    const x0 = Math.max(0, x - 1), x1 = Math.min(W - 1, x + 1), y0 = Math.max(0, y - 1), y1 = Math.min(H - 1, y + 1);
    const dx = Math.max(-1, Math.min(1, ((field[y * W + x1] - field[y * W + x0]) / (x1 - x0 || 1)) * gain));
    const dy = Math.max(-1, Math.min(1, ((field[y1 * W + x] - field[y0 * W + x]) / (y1 - y0 || 1)) * gain));
    let spec = 0;
    if (d >= -bevel) { const gx = sdRoundedBox(px + 1, py, halfW, halfH, r) - sdRoundedBox(px - 1, py, halfW, halfH, r);
      const gy = sdRoundedBox(px, py + 1, halfW, halfH, r) - sdRoundedBox(px, py - 1, halfW, halfH, r), len = Math.hypot(gx, gy) || 1;
      const dot = (gx / len) * lx + (gy / len) * ly; spec = (Math.max(0, dot) + Math.max(0, -dot) * 0.35) * (1 - Math.min(1, -d / bevel)); }
    data[i] = 128 + dx * 127; data[i + 1] = 128 + dy * 127; data[i + 2] = Math.round(spec * 255); data[i + 3] = 255; } }
  return { data, W, H };
}
function filterSvg(id: string, url: string, w: number, h: number, scale: number, ab: number, frost: number) {
  const pad = Math.ceil(scale + ab + 4), px = (pad / w) * 100, py = (pad / h) * 100;
  const disp = (s: number, res: string) => `<feDisplacementMap in="SourceGraphic" in2="map" scale="${s}" xChannelSelector="R" yChannelSelector="G" result="${res}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute"><filter id="${id}" color-interpolation-filters="sRGB" x="-${px}%" y="-${py}%" width="${100 + 2 * px}%" height="${100 + 2 * py}%">
    <feImage href="${url}" x="0" y="0" width="${w}" height="${h}" result="map" preserveAspectRatio="none"/>
    ${disp(scale + ab, 'dR')}<feColorMatrix in="dR" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red"/>
    ${disp(scale, 'dG')}<feColorMatrix in="dG" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green"/>
    ${disp(Math.max(0, scale - ab), 'dB')}<feColorMatrix in="dB" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue"/>
    <feBlend in="red" in2="green" mode="screen" result="rg"/><feBlend in="rg" in2="blue" mode="screen" result="rgb"/>
    <feGaussianBlur in="rgb" stdDeviation="${frost}"/></filter></svg>`;
}

// Component defaults from the owner's demo: scale 48, aberration 14, bevel 37, frost 0.4, tint 0.12.
export const GlassSheet: React.FC<{ rect: Rect; id: string }> = ({ rect, id }) => {
  const [svg, setSvg] = useState<string | null>(null);
  const [handle] = useState(() => delayRender('displacement map'));
  useEffect(() => {
    const m = displacementMap(rect.w, rect.h, rect.r, 37, 1);
    const c = document.createElement('canvas'); c.width = m.W; c.height = m.H;
    c.getContext('2d')!.putImageData(new ImageData(m.data, m.W, m.H), 0, 0);
    c.toBlob((blob) => {
      const url = URL.createObjectURL(blob!), img = new Image();
      // ponytail: aberration 8 instead of the demo's 14; 14 left coloured specks along a 640 px sheet's edge.
      img.onload = img.onerror = () => { setSvg(filterSvg(id, url, rect.w, rect.h, 48, 8, 0.4)); requestAnimationFrame(() => continueRender(handle)); };
      img.src = url;
    }, 'image/png');
  }, [handle, id, rect]);
  const backdrop = svg ? `url(#${id}) blur(0.5px) saturate(1.85) brightness(1.02)` : 'none';
  return (
    <>
      {svg && <span dangerouslySetInnerHTML={{ __html: svg }} />}
      <div style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: rect.r, overflow: 'hidden',
        backdropFilter: backdrop, background: 'rgb(255 255 255 / .12)',
        boxShadow: '0 12px 40px rgb(0 0 0 / .25), inset 0 1px 0 rgb(255 255 255 / .5), inset 0 0 0 1.5px rgb(255 255 255 / .2)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(18,15,12,.22)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '45%', background: 'linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,0))' }} />
      </div>
    </>
  );
};

// A sheet backdrop: the scene's first frame, dimmed, with one baked glass sheet on it.
export const GlassBg: React.FC<{ tod: Tod; sheet: 'wc' | 'set'; source?: string; graded?: boolean }> = ({ tod, sheet, source, graded }) => (
  <AbsoluteFill>
    <SceneArt tod={tod} source={source} graded={graded} frame={0} />
    <AbsoluteFill style={{ background: `rgba(10,8,6,${SHEET_DIM})` }} />
    <GlassSheet rect={sheet === 'wc' ? WC_SHEET : SET_SHEET} id={`lg-${sheet}-${tod}`} />
  </AbsoluteFill>
);
