// Pure helpers shared by app.js and lumen/test.js (UMD, like user-data.js).
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.LumenMath = factory(); }(this, function () {
  'use strict';
  // Must match lumen/src/layout.ts: GLOBE and GLOBE_FRAMES / FPS (60 s per turn).
  var GLOBE = { cx: 1240, cy: 540, r: 300, tilt: 20 }, TURN = 60;
  var D = Math.PI / 180;

  // Longitude facing the viewer at time t (s) of the globe video. Globe.tsx rotates by lambda = -180 + 360 t/TURN,
  // and d3's rotate([lambda, -tilt]) centres the view on (-lambda, tilt).
  function centerLon(t) { return 180 - 360 * ((t % TURN) / TURN); }

  // Orthographic projection of (lat, lon) onto the screen; front = on the visible hemisphere.
  function project(lat, lon, t) {
    var phi = lat * D, lam = (lon - centerLon(t)) * D, p0 = GLOBE.tilt * D;
    var cosc = Math.sin(p0) * Math.sin(phi) + Math.cos(p0) * Math.cos(phi) * Math.cos(lam);
    var x = GLOBE.r * Math.cos(phi) * Math.sin(lam);
    var y = GLOBE.r * (Math.cos(p0) * Math.sin(phi) - Math.sin(p0) * Math.cos(phi) * Math.cos(lam));
    return { x: GLOBE.cx + x, y: GLOBE.cy - y, front: cosc > 0.08 };
  }

  // Time of day for the scene: same boundaries as the rendered loops.
  function tod(hour) { return hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 19 ? 'day' : 'night'; }

  return { GLOBE: GLOBE, TURN: TURN, centerLon: centerLon, project: project, tod: tod };
}));
