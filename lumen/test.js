// One check for the riskiest logic: the TV's city dot must land where d3 drew the city in the globe video.
// Run: node lumen/test.js
const assert = require('assert');
const path = require('path');
const LM = require(path.join(__dirname, '../launcher/lumen-math.js'));

(async () => {
  const { geoOrthographic } = await import('d3-geo');
  const FPS = 24, FRAMES = LM.TURN * FPS;
  const cities = [[28.61, 77.21], [51.51, -0.13], [35.68, 139.65], [40.71, -74.01], [-33.87, 151.21], [1.35, 103.82]];
  for (const f of [0, 1, 360, 719, 1000, FRAMES - 1]) {
    const lambda = -180 + (360 * f) / FRAMES;                       // exactly as Globe.tsx
    const proj = geoOrthographic().translate([LM.GLOBE.cx, LM.GLOBE.cy]).scale(LM.GLOBE.r).rotate([lambda, -LM.GLOBE.tilt]);
    for (const [lat, lon] of cities) {
      const p = LM.project(lat, lon, f / FPS), [x, y] = proj([lon, lat]);
      if (p.front) assert.ok(Math.hypot(p.x - x, p.y - y) < 0.5, `frame ${f} city ${lat},${lon}: ${p.x},${p.y} vs ${x},${y}`);
    }
  }
  assert.strictEqual(LM.tod(4), 'night'); assert.strictEqual(LM.tod(5), 'morning');
  assert.strictEqual(LM.tod(12), 'day'); assert.strictEqual(LM.tod(19), 'night');
  console.log('ok: city dot matches the rendered globe; time-of-day boundaries hold');
})();
