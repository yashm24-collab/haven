/* Haven: a calm home screen for one LG TV (design: HAVEN_PRD_v3.md).
   Loaded by profile-bootstrap.js once TV_APPS and CONFIG exist. Plain JS for webOS Chrome 120.
   Motion is CSS (transform/opacity); JS only swaps classes and positions, never animates per frame,
   except the World Clock city dot, which follows the globe video while that view is open. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var LM = window.LumenMath;
  var K = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, OK: 13, BACK: 461, ESC: 27, BKSP: 8 };
  var body = document.body;

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
  };

  function luna(uri, payload, cb) {
    var done = false, b, timer = setTimeout(function () { finish({ returnValue: false, errorText: 'timeout' }); }, 8000);
    function finish(r) { if (done) return; done = true; clearTimeout(timer); if (b) { try { b.cancel(); } catch (_) {} } if (cb) cb(r); }
    try {
      b = new PalmServiceBridge();
      b.onservicecallback = function (raw) { var r; try { r = JSON.parse(raw); } catch (_) { r = { returnValue: false }; } finish(r); };
      b.call(uri, JSON.stringify(payload || {}));
    } catch (e) { finish({ returnValue: false, errorText: String(e) }); }
  }

  var toastTimer;
  function toast(text) {
    var t = $('toast'); t.textContent = text; t.classList.add('shown');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('shown'); }, 5000);
  }

  function svg(paths) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + paths + '</svg>'; }
  var GRID_ICON = svg('<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>');
  var INPUT_ICON = svg('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 21h8M12 18v3"/>');

  /* ---- apps ------------------------------------------------------------------------------------ */
  var CONFIG = window.CONFIG || {};
  var APPS = (window.TV_APPS && TV_APPS.apps) || [], INPUTS = (window.TV_APPS && TV_APPS.inputs) || [], byId = {};
  APPS.forEach(function (a) { byId[a.id] = a; });
  var SELF = ['com.gathin.tvhome', 'com.local.nativehome', 'com.lumen.spike'];
  var LG = ['com.webos.app.discovery', 'com.webos.app.lgchannels', 'webos.day', 'com.twin.app.gamingportal', 'shortcutcopilot',
    'epoxyaisports', 'com.webos.app.sportsteamsettings', 'com.palmdts.devmode', 'com.webos.app.homeconnect', 'com.webos.app.lifeonscreen'];
  var hidden = (CONFIG.hiddenApps || []).concat(SELF);
  function installed(ids) { return ids.filter(function (id) { return byId[id] && hidden.indexOf(id) < 0; }).map(function (id) { return byId[id]; }); }
  // The dock: the owner's five, in order; ids not installed (e.g. Spotify before a re-sync) are skipped.
  var DOCK = installed(CONFIG.dockApps && CONFIG.dockApps.length ? CONFIG.dockApps
    : ['netflix', 'hotstar', 'amazon', 'youtube.leanback.v4', 'spotify-beehive', 'com.spotify.tv', 'spotify']).slice(0, 5);
  // Fewer than five of them on this TV (or the browser preview's demo apps): fill from the app list, as fill_dock does.
  APPS.forEach(function (a) { if (DOCK.length < 5 && DOCK.indexOf(a) < 0 && hidden.indexOf(a.id) < 0 && LG.indexOf(a.id) < 0) DOCK.push(a); });

  function plate(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '#2a2420';
    var n = parseInt(m[1], 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255, mx = Math.max(r, g, b);
    if (mx - Math.min(r, g, b) < 30 && (mx > 215 || mx < 30)) return '#2a2420';      // white/black brand colours: neutral plate
    return 'rgb(' + [r, g, b].map(function (v, i) { return Math.round(v * 0.85 + [20, 17, 14][i] * 0.15); }).join(',') + ')';
  }
  // CleanYourTV's tile treatment: an opaque icon fills the tile on its own corner colour; a transparent one sits on a plate.
  function paint(el, img, app) {
    var px = null;
    try {
      var c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      var x = c.getContext('2d'); x.drawImage(img, 0, 0);
      px = x.getImageData(2, 2, 1, 1).data;
      if (px[3] <= 200) px = x.getImageData(2, Math.floor(c.height / 2), 1, 1).data;
    } catch (_) {}
    if (px && px[3] > 200) el.style.background = 'rgb(' + px[0] + ',' + px[1] + ',' + px[2] + ')';
    else { el.classList.add('glyph'); el.style.background = plate(app.iconColor); }
  }
  function tile(app) {
    var el = document.createElement('div'); el.className = 'item'; el.setAttribute('role', 'listitem'); el.setAttribute('aria-label', app.title);
    var img = new Image(); img.alt = ''; el.appendChild(img);
    var art = new Image();       // optional owner artwork: launcher/art/<appId>.png
    art.onload = function () { el.classList.add('art'); img.src = art.src; };
    art.onerror = function () { img.onload = function () { paint(el, img, app); }; img.src = app.icon; };
    art.src = 'art/' + app.id + '.png';
    return el;
  }
  // Dock tile: one dark glass plate, the app's crisp brand mark (lumen/marks.js), its brand colour for focus.
  function markTile(app) {
    var m = (window.MARKS || {})[app.id];
    if (!m) return tile(app);
    var el = document.createElement('div'); el.className = 'item mark'; el.setAttribute('role', 'listitem'); el.setAttribute('aria-label', m.name);
    el.style.setProperty('--brand', m.glow);
    var img = new Image(); img.alt = ''; el.appendChild(img);
    // A mark made only on the owner's PC (hotstar.png, from the TV's icon) may be missing: use the TV's icon on a plate.
    img.onerror = function () { img.onerror = null; el.classList.remove('mark'); img.onload = function () { paint(el, img, app); }; img.src = app.icon; };
    img.src = m.src;
    return el;
  }
  function moreTile(label, icon) {
    var el = document.createElement('div'); el.className = 'item more'; el.setAttribute('role', 'listitem');
    el.innerHTML = icon + '<span></span>'; el.lastChild.textContent = label; return el;
  }

  /* ---- lens (CleanYourTV glass, accent mode) --------------------------------------------------- */
  var lens = $('lens');
  // small = All apps grid tiles (216x122, focused at 1.06x). Otherwise a dock tile (264x148) magnified to MAG,
  // growing up from its bottom edge: lens 316x186 = scaled tile plus a 10px margin.
  // color = the focused app's brand colour: GlassView's accent mode (rim lifted towards white, glow in the colour).
  function lensTo(x, y, small, color) {
    var t = 'translate(' + (x - (small ? 16 : 26)) + 'px,' + (y - (small ? 14 : 28)) + 'px)', resize = lens.classList.contains('small') !== !!small;
    if ((color || '') !== lens.color) {                                    // restyle the glow only when the colour changes
      lens.color = color || '';
      var m = /^#?([0-9a-f]{6})$/i.exec(lens.color);
      if (m) {
        var n = parseInt(m[1], 16), c = [n >> 16 & 255, n >> 8 & 255, n & 255];
        lens.style.setProperty('--rim', 'rgba(' + c.map(function (v) { return Math.round((v + 510) / 3); }).join(',') + ',.9)');
        lens.style.setProperty('--glow-a', 'rgba(' + c.join(',') + ',.6)');
        lens.style.setProperty('--glow-b', 'rgba(' + c.join(',') + ',.24)');
      } else ['--rim', '--glow-a', '--glow-b'].forEach(function (p) { lens.style.removeProperty(p); });
    }
    lens.classList.toggle('small', !!small);
    if (!lens.classList.contains('on') || resize) { lens.style.transition = 'none'; lens.style.transform = t; void lens.offsetWidth; lens.style.transition = ''; lens.classList.add('on'); }
    else lens.style.transform = t;
  }
  function lensOff() { lens.classList.remove('on'); }

  /* ---- launching ------------------------------------------------------------------------------- */
  var launchTimer = null;
  function launch(id, title, params) {
    var curtain = $('curtain');
    function fail() {
      clearTimeout(launchTimer);
      if (document.hidden) return;
      curtain.classList.remove('on');
      setTimeout(function () { toast('Couldn’t open ' + title + '.'); }, 420);
    }
    // The call goes out first; the fade never delays it (PRD §8).
    luna('luna://com.webos.applicationManager/launch', { id: id, params: params || {} }, function (r) { if (r.returnValue === false) fail(); });
    curtain.firstChild.textContent = 'Opening ' + title + '…';
    curtain.classList.add('on');
    clearTimeout(launchTimer); launchTimer = setTimeout(fail, 8000);
  }

  /* ---- views ----------------------------------------------------------------------------------- */
  var view = 'home';
  function setView(v) { body.classList.remove('view-' + view); view = v; body.classList.add('view-' + v); updateScene(); }

  /* ---- scene ----------------------------------------------------------------------------------- */
  // The owner's own choice wins; without one, follow the system's reduced-motion preference.
  var still = store.get('lumen.still', null);
  if (still === null) still = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var vids = [$('sceneA'), $('sceneB')], vi = 0, curTod = null, idle = false, lastKey = Date.now();
  body.classList.toggle('still', still);
  function sceneShouldPlay() { return view === 'home' && !document.hidden && !idle && !still && !introOn; }
  function updateScene() {
    var v = vids[vi];
    if (!v.getAttribute('src')) return;
    if (sceneShouldPlay()) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause();
  }
  function setTod(force) {
    var t = LM.tod(new Date().getHours());
    if (t === curTod && !force) return;
    curTod = t;
    $('sceneStill').src = 'assets/still-' + t + '.jpg';
    $('sheetBg').src = 'assets/bg-set-' + t + '.jpg';
    $('wcPoster').src = 'assets/bg-wc-' + t + '.jpg';
    var wcv = $('wcVideo'); wcv.src = 'assets/wc-' + t + '.mp4'; wcv.style.opacity = 0;
    var old = vids[vi], next = vids[1 - vi];
    next.oncanplay = function () {
      next.oncanplay = null; vi = vids.indexOf(next);
      next.classList.add('on'); old.classList.remove('on'); updateScene();
      setTimeout(function () { old.pause(); old.removeAttribute('src'); old.load(); }, 3200);
    };
    next.src = 'assets/scene-' + t + '.mp4'; next.load();
  }
  setInterval(function () {
    if (!idle && Date.now() - lastKey > 10 * 60 * 1000) { idle = true; updateScene(); }   // calm when nobody is watching
  }, 30000);

  /* ---- clock ----------------------------------------------------------------------------------- */
  var fmtCache = {};
  function timeParts(tz, d) {
    var key = 't' + (tz || ''), f = fmtCache[key] || (fmtCache[key] = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: tz }));
    var main = '', period = '';
    f.formatToParts(d).forEach(function (p) { if (p.type === 'dayPeriod') period = p.value; else main += p.value; });
    return { main: main.trim(), period: period };
  }
  function setTime(el, tz, d) {
    var p = timeParts(tz, d); el.textContent = p.main;
    if (p.period) { var s = document.createElement('small'); s.textContent = p.period; el.appendChild(s); }
  }
  function tickHome() {
    var d = new Date();
    setTime($('clock'), undefined, d);
    $('date').textContent = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    setTod(false);
    if (view === 'clock') tickCities();
  }

  /* ---- Rive orb + live glass marble ------------------------------------------------------------ */
  var orbRive = null;
  function orbPlay(name) { if (!orbRive) return; try { orbRive.stop(); orbRive.play(name); } catch (_) {} }
  function riveInit() {
    if (!window.rive) return;
    try {
      rive.RuntimeLoader.setWasmUrl('assets/rive.wasm');
      orbRive = new rive.Rive({ src: 'assets/orb.riv', canvas: $('orbRive'), autoplay: false,
        onLoad: function () { orbRive.resizeDrawingSurfaceToCanvas(); orbPlay(home.zone === 'top' && topItems()[home.top] === $('orb') ? 'focus' : 'wake'); } });
    } catch (_) { orbRive = null; }
  }
  // The owner's liquid glass, live: small and still is the one case the TV runs smoothly (PRD §16).
  function marbleGlass() {
    try {
      var size = 96, dpr = 2, W = size * dpr, half = W / 2, r = half, bevel = 22 * dpr, n = Math.ceil(bevel);
      var sd = function (px, py) { var qx = Math.abs(px) - half + r, qy = Math.abs(py) - half + r; return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r; };
      var bend = function (x) { var u = 1 - x, den = Math.pow(1 - Math.pow(u, 4), 0.75); if (den < 1e-6) return 0;
        var ti = Math.atan(Math.min(Math.pow(u, 3) / den, 8)), st = Math.sin(ti) / 1.5; return st >= 1 ? Math.sin(ti) : Math.sin(ti - Math.asin(st)); };
      var phi = new Float32Array(n + 1); for (var i = 1; i <= n; i++) phi[i] = phi[i - 1] + bend(i / n);
      var field = new Float32Array(W * W), data = new Uint8ClampedArray(W * W * 4), x, y, d;
      for (y = 0; y < W; y++) for (x = 0; x < W; x++) {
        d = sd(x - half + 0.5, y - half + 0.5); var dep = Math.min(bevel, -d), fl = Math.floor(dep);
        field[y * W + x] = d > 0 ? 0 : dep >= n ? phi[n] : phi[fl] * (1 - (dep - fl)) + phi[Math.min(n, fl + 1)] * (dep - fl);
      }
      for (y = 0; y < W; y++) for (x = 0; x < W; x++) {
        var k = (y * W + x) * 4; d = sd(x - half + 0.5, y - half + 0.5);
        if (d > 0) { data[k] = data[k + 1] = data[k + 2] = 128; continue; }
        var dx = (field[y * W + Math.min(W - 1, x + 1)] - field[y * W + Math.max(0, x - 1)]) / 2 * 1.35;
        var dy = (field[Math.min(W - 1, y + 1) * W + x] - field[Math.max(0, y - 1) * W + x]) / 2 * 1.35;
        data[k] = 128 + Math.max(-1, Math.min(1, dx)) * 127; data[k + 1] = 128 + Math.max(-1, Math.min(1, dy)) * 127; data[k + 3] = 255;
      }
      var c = document.createElement('canvas'); c.width = c.height = W; c.getContext('2d').putImageData(new ImageData(data, W, W), 0, 0);
      c.toBlob(function (blob) {
        var url = URL.createObjectURL(blob), holder = document.createElement('div');
        holder.innerHTML = '<svg width="0" height="0" style="position:absolute"><filter id="orbGlass" color-interpolation-filters="sRGB" x="-40%" y="-40%" width="180%" height="180%">' +
          '<feImage href="' + url + '" x="0" y="0" width="' + size + '" height="' + size + '" result="map" preserveAspectRatio="none"/>' +
          '<feDisplacementMap in="SourceGraphic" in2="map" scale="28" xChannelSelector="R" yChannelSelector="G"/></filter></svg>';
        body.appendChild(holder);
        marbleReady = true; setMarble(home.zone === 'top' && topItems()[home.top] === $('orb'));
      }, 'image/png');
    } catch (_) {}
  }
  // ponytail: refraction runs only while the orb is focused. Live over the playing scene it cost ~10% of frames
  // during row navigation on the 50UA83 (PRD §16); focused, nothing else is moving.
  var marbleReady = false;
  function setMarble(on) { if (marbleReady) $('marble').style.backdropFilter = on ? 'url(#orbGlass)' : 'none'; }

  /* ---- home ------------------------------------------------------------------------------------ */
  var home = { zone: 'row', i: 0, top: 0 }, row = [], helperStopped = !!window.lumenHelperStopped;
  // Dock geometry (style.css #tiles .item, #allApps): tiles 264x148 every 296px from x 96,
  // then the 148px All apps glass tile 40px after the last tile.
  function buildRow() {
    var tiles = $('tiles'), x = 96;
    function add(entry, w) {
      entry.x = x; entry.el.style.left = x + 'px'; x += w;
      entry.el.addEventListener('mouseenter', function () { if (view === 'home') focusRow(row.indexOf(entry)); });
      entry.el.addEventListener('click', function () { if (view === 'home') activateRow(entry); });
      tiles.appendChild(entry.el); row.push(entry);
    }
    DOCK.forEach(function (a) {
      var m = (window.MARKS || {})[a.id];
      add({ app: a, el: markTile(a), y: 814, w: 264, name: m ? m.name : a.title, glow: m ? m.glow : null }, 296);
    });
    x += 8;
    var more = document.createElement('div'); more.id = 'allApps'; more.className = 'chip'; more.setAttribute('role', 'button');
    more.setAttribute('aria-label', 'All apps'); more.innerHTML = GRID_ICON + '<span>All apps</span>';
    add({ app: null, el: more, y: 814, w: 148, round: true }, 148);
  }
  function rowLabel(text) {
    var l = $('label'); if (l.textContent === text) return;
    l.classList.add('swap'); clearTimeout(l.t);
    l.t = setTimeout(function () { l.textContent = text; l.classList.remove('swap'); }, 120);
  }
  function focusRow(i) {
    if (i < 0 || i >= row.length) return;
    leaveTop();
    if (row[home.i]) row[home.i].el.classList.remove('focused');
    home.zone = 'row'; home.i = i;
    var e = row[i]; e.el.classList.add('focused');
    if (e.round) lensOff(); else lensTo(e.x, e.y, false, e.glow);        // All apps glows on its own (.chip.focused)
    magnify(i);
    rowLabel(e.app ? e.name : (APPS.length ? 'All apps' : 'No apps found. Run the app sync from your computer.'));
  }
  function activateRow(e) { if (e.app) launch(e.app.id, e.name); else openApps(); }

  // Magic UI's Dock magnification, keyed to focus: the focused tile grows to MAG, its neighbours a little,
  // and everything else slides apart by exactly the extra width so nothing overlaps. f = null collapses the dock.
  var MAG = [1.12, 1.05];                                                // ponytail: Magic UI's default 1.5x is for 40px icons
  function magnify(f) {
    var scale = function (i) { var d = f === null ? 9 : Math.abs(i - f); return d < MAG.length ? MAG[d] : 1; };
    // Widths come from buildRow, never offsetWidth: reading layout between transform writes forced six reflows
    // per key press (14 ms of JS per move on the TV).
    var grow = function (i) { return row[i].w * (scale(i) - 1); };
    row.forEach(function (e, i) {
      var dx = 0, j;
      if (f !== null && i > f) { dx = grow(f) / 2 + grow(i) / 2; for (j = f + 1; j < i; j++) dx += grow(j); }
      if (f !== null && i < f) { dx = -(grow(f) / 2 + grow(i) / 2); for (j = i + 1; j < f; j++) dx -= grow(j); }
      e.el.style.transform = 'translateX(' + dx.toFixed(1) + 'px) scale(' + scale(i) + ')';
    });
  }
  function topItems() { return [$('orb')].concat(helperStopped ? [$('btnResume')] : []).concat([$('gear')]); }
  function leaveTop() {
    if (home.zone !== 'top') return;
    var it = topItems()[home.top]; if (it) it.classList.remove('focused');
    if (it === $('orb')) orbPlay('blur');
    setMarble(false);
    home.zone = 'row';
  }
  function focusTop(k) {
    var items = topItems(); k = Math.max(0, Math.min(items.length - 1, k));
    var before = home.zone === 'top' ? items[home.top] : null;
    if (home.zone === 'row' && row[home.i]) row[home.i].el.classList.remove('focused');
    if (before) before.classList.remove('focused');
    home.zone = 'top'; home.top = k; lensOff(); rowLabel(''); magnify(null);
    items[k].classList.add('focused');
    if (items[k] === $('orb') && before !== $('orb')) orbPlay('focus');
    else if (before === $('orb') && items[k] !== $('orb')) orbPlay('blur');
    setMarble(items[k] === $('orb'));
  }
  function activateTop() {
    var it = topItems()[home.top];
    if (it === $('orb')) openClock();
    else if (it === $('gear')) openSettings();
    else if (window.HelperControl) HelperControl.resume();
  }
  function keyHome(k) {
    if (home.zone === 'row') {
      if (k === K.LEFT) focusRow(home.i - 1);
      else if (k === K.RIGHT) focusRow(home.i + 1);
      else if (k === K.UP) focusTop(0);
      else if (k === K.OK) activateRow(row[home.i]);
      else if (k === K.BACK || k === K.ESC) { /* Home has nowhere to go back to */ }
      else return false;
    } else {
      if (k === K.LEFT) focusTop(home.top - 1);
      else if (k === K.RIGHT) focusTop(home.top + 1);
      else if (k === K.DOWN || k === K.BACK || k === K.ESC) focusRow(home.i);
      else if (k === K.OK) activateTop();
      else return false;
    }
  }
  function focusLast() {
    var last = store.get('lumen.last', null), i = 0;
    row.forEach(function (e, j) { if (e.app && e.app.id === last) i = j; });
    focusRow(i);
  }
  window.setHelperResumeVisible = function (v) {
    if (v === helperStopped) return;
    var it = home.zone === 'top' ? topItems()[home.top] : null;
    helperStopped = v; $('btnResume').classList.toggle('hidden', !v);
    if (it) { var k = topItems().indexOf(it); it.classList.remove('focused'); home.top = k < 0 ? 0 : k; topItems()[home.top].classList.add('focused'); }
  };
  window.helperResumeMessage = toast;
  $('btnResume').classList.toggle('hidden', !helperStopped);
  ['orb', 'gear', 'btnResume'].forEach(function (id) {
    var el = $(id);
    el.addEventListener('mouseenter', function () { if (view === 'home') focusTop(topItems().indexOf(el)); });
    el.addEventListener('click', function () { if (view === 'home') { focusTop(topItems().indexOf(el)); activateTop(); } });
  });

  /* ---- wake ------------------------------------------------------------------------------------ */
  var wakeTimer;
  function wake() {
    body.classList.remove('wake'); void body.offsetWidth; body.classList.add('wake');
    clearTimeout(wakeTimer); wakeTimer = setTimeout(endWake, 1300);
    orbPlay('wake');
  }
  function endWake() { clearTimeout(wakeTimer); body.classList.remove('wake'); }

  // "Welcome home" (lumen/src/Intro.tsx): plays once per power-on, never on Home presses. Its last frame is
  // frame 0 of the scene loop, so the scene restarts from 0 underneath and Home rises with no seam.
  // At power-on webOS loads the page hidden behind LG's splash and shows it a moment later, so the welcome
  // starts on the first "visible", not at load; a Home press (webOSRelaunch) or any key ends it.
  var introOn = false, introTimer = null;
  function playIntro() {
    var layer = $('intro'), v = $('introVideo');
    if (still) { layer.classList.add('hidden'); wake(); return; }
    introOn = true; body.classList.add('intro');
    v.onended = function () { endIntro('ended'); };
    v.onerror = function () { endIntro('error'); };
    v.src = 'assets/intro-' + curTod + '.mp4'; v.load();
    if (!document.hidden) startIntro();
  }
  function startIntro() {
    var v = $('introVideo');
    clearTimeout(introTimer); introTimer = setTimeout(function () { endIntro('timeout'); }, 9000);   // never strand the owner on black
    try { v.currentTime = 0; } catch (_) {}
    var p = v.play(); if (p && p.catch) p.catch(function () { endIntro('play-blocked'); });
  }
  function endIntro(why) {
    if (!introOn) return;
    window.havenIntroEnded = why;                                          // for checks over the inspector
    introOn = false; clearTimeout(introTimer);
    var layer = $('intro'), v = $('introVideo');
    try { vids[vi].currentTime = 0; } catch (_) {}
    body.classList.remove('intro'); updateScene(); wake();
    layer.classList.add('done');
    setTimeout(function () { layer.classList.add('hidden'); v.pause(); v.removeAttribute('src'); v.load(); }, 700);
  }
  function returnHome() {
    endIntro('home-pressed');
    clearTimeout(launchTimer); $('curtain').classList.remove('on');
    if (view === 'clock') closeClock(true); else if (view !== 'home') setView('home');
    lastKey = Date.now(); idle = false;
    focusLast(); tickHome(); wake(); updateScene();
  }
  document.addEventListener('webOSRelaunch', returnHome);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { vids.forEach(function (v) { v.pause(); }); $('wcVideo').pause(); if (introOn) $('introVideo').pause(); }
    else if (introOn) startIntro();                                        // first appearance after power-on: welcome now
    else returnHome();
  });

  /* ---- World Clock ----------------------------------------------------------------------------- */
  var CITIES = [
    ['Amsterdam', 'Europe/Amsterdam', 52.37, 4.90], ['Athens', 'Europe/Athens', 37.98, 23.73], ['Auckland', 'Pacific/Auckland', -36.85, 174.76],
    ['Bangkok', 'Asia/Bangkok', 13.76, 100.50], ['Barcelona', 'Europe/Madrid', 41.39, 2.17], ['Beijing', 'Asia/Shanghai', 39.90, 116.40],
    ['Bengaluru', 'Asia/Kolkata', 12.97, 77.59], ['Berlin', 'Europe/Berlin', 52.52, 13.40], ['Buenos Aires', 'America/Argentina/Buenos_Aires', -34.60, -58.38],
    ['Cairo', 'Africa/Cairo', 30.04, 31.24], ['Cape Town', 'Africa/Johannesburg', -33.92, 18.42], ['Chennai', 'Asia/Kolkata', 13.08, 80.27],
    ['Chicago', 'America/Chicago', 41.88, -87.63], ['Colombo', 'Asia/Colombo', 6.93, 79.86], ['Dhaka', 'Asia/Dhaka', 23.81, 90.41],
    ['Doha', 'Asia/Qatar', 25.29, 51.53], ['Dubai', 'Asia/Dubai', 25.20, 55.27], ['Dublin', 'Europe/Dublin', 53.35, -6.26],
    ['Frankfurt', 'Europe/Berlin', 50.11, 8.68], ['Hong Kong', 'Asia/Hong_Kong', 22.32, 114.17], ['Honolulu', 'Pacific/Honolulu', 21.31, -157.86],
    ['Hyderabad', 'Asia/Kolkata', 17.39, 78.49], ['Istanbul', 'Europe/Istanbul', 41.01, 28.98], ['Jakarta', 'Asia/Jakarta', -6.21, 106.85],
    ['Johannesburg', 'Africa/Johannesburg', -26.20, 28.05], ['Karachi', 'Asia/Karachi', 24.86, 67.01], ['Kathmandu', 'Asia/Kathmandu', 27.72, 85.32],
    ['Kolkata', 'Asia/Kolkata', 22.57, 88.36], ['Kuala Lumpur', 'Asia/Kuala_Lumpur', 3.14, 101.69], ['Lagos', 'Africa/Lagos', 6.52, 3.38],
    ['Lisbon', 'Europe/Lisbon', 38.72, -9.14], ['London', 'Europe/London', 51.51, -0.13], ['Los Angeles', 'America/Los_Angeles', 34.05, -118.24],
    ['Madrid', 'Europe/Madrid', 40.42, -3.70], ['Melbourne', 'Australia/Melbourne', -37.81, 144.96], ['Mexico City', 'America/Mexico_City', 19.43, -99.13],
    ['Moscow', 'Europe/Moscow', 55.76, 37.62], ['Mumbai', 'Asia/Kolkata', 19.08, 72.88], ['Nairobi', 'Africa/Nairobi', -1.29, 36.82],
    ['New Delhi', 'Asia/Kolkata', 28.61, 77.21], ['New York', 'America/New_York', 40.71, -74.01], ['Paris', 'Europe/Paris', 48.86, 2.35],
    ['Riyadh', 'Asia/Riyadh', 24.71, 46.68], ['Rome', 'Europe/Rome', 41.90, 12.50], ['San Francisco', 'America/Los_Angeles', 37.77, -122.42],
    ['São Paulo', 'America/Sao_Paulo', -23.55, -46.63], ['Seoul', 'Asia/Seoul', 37.57, 126.98], ['Shanghai', 'Asia/Shanghai', 31.23, 121.47],
    ['Singapore', 'Asia/Singapore', 1.35, 103.82], ['Stockholm', 'Europe/Stockholm', 59.33, 18.07], ['Sydney', 'Australia/Sydney', -33.87, 151.21],
    ['Taipei', 'Asia/Taipei', 25.03, 121.57], ['Tokyo', 'Asia/Tokyo', 35.68, 139.65], ['Toronto', 'America/Toronto', 43.65, -79.38],
    ['Vancouver', 'America/Vancouver', 49.28, -123.12], ['Zurich', 'Europe/Zurich', 47.38, 8.54]
  ].map(function (c) { return { name: c[0], tz: c[1], lat: c[2], lon: c[3] }; });
  function city(name) { for (var i = 0; i < CITIES.length; i++) if (CITIES[i].name === name) return CITIES[i]; return null; }
  var ALIAS = { 'Asia/Calcutta': 'Asia/Kolkata', 'Asia/Saigon': 'Asia/Ho_Chi_Minh', 'Asia/Katmandu': 'Asia/Kathmandu' };
  var hereTz = 'UTC';
  try { hereTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (_) {}
  hereTz = ALIAS[hereTz] || hereTz;
  var PREFERRED = { 'Asia/Kolkata': 'New Delhi', 'Asia/Shanghai': 'Beijing', 'America/Los_Angeles': 'Los Angeles', 'Europe/Berlin': 'Berlin', 'Africa/Johannesburg': 'Johannesburg' };
  var hereCity = city(PREFERRED[hereTz]) || CITIES.filter(function (c) { return c.tz === hereTz; })[0] || null;
  var HERE = { name: 'Here', tz: hereTz, lat: hereCity ? hereCity.lat : null, lon: hereCity ? hereCity.lon : null, place: hereCity ? hereCity.name : '' };
  var MAX_CITIES = 8;
  var saved = store.get('lumen.cities', ['London', 'Tokyo', 'New York', 'Sydney', 'Singapore']).filter(function (nm) { return city(nm); }).slice(0, MAX_CITIES - 1);
  var wc = { i: 0, mode: 'list', menu: 0, pick: 0, picks: [] };

  function cityRows() { return [HERE].concat(saved.map(city)); }
  function wxKey(c) { return c === HERE ? HERE.place : c.name; }
  function ymdh(tz, d) {
    var f = fmtCache['p' + tz] || (fmtCache['p' + tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }));
    var p = {}; f.formatToParts(d).forEach(function (x) { p[x.type] = +x.value; }); return p;
  }
  function offsetMin(tz, d) { var p = ymdh(tz, d); return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute) - Math.floor(d.getTime() / 60000) * 60000) / 60000); }
  function relative(c, d) {
    if (c === HERE) return HERE.place ? HERE.place + ' · your TV’s time' : 'Your TV’s time';
    var diff = offsetMin(c.tz, d) - offsetMin(hereTz, d), a = ymdh(c.tz, d), h = ymdh(hereTz, d);
    var day = a.day === h.day ? 'Today' : diff > 0 ? 'Tomorrow' : 'Yesterday';
    if (!diff) return day + ' · same time';
    var hh = Math.floor(Math.abs(diff) / 60), mm = Math.abs(diff) % 60;
    return day + ' · ' + (diff > 0 ? '+' : '−') + hh + 'h' + (mm ? ' ' + mm + 'm' : '');
  }

  // Weather: Open-Meteo, no key. Never invented: missing or old data says so (PRD §6.2).
  var WX_ICONS = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
    moon: '<path d="M19.5 14.6A7.5 7.5 0 0 1 9.4 4.5a7.5 7.5 0 1 0 10.1 10.1z"/>',
    cloud: '<path d="M7 19h10.2a4.3 4.3 0 0 0 .4-8.6A6 6 0 0 0 6 11.3 3.9 3.9 0 0 0 7 19z"/>',
    partly: '<path d="M8.2 3.8v1.4M3.2 8.8h1.4M4.7 5.3l1 1M11.7 5.3l-1 1"/><path d="M5.6 11a3 3 0 1 1 5.3-2.3"/><path d="M8.5 20h9a3.6 3.6 0 0 0 .3-7.2 5 5 0 0 0-9.6 1.6A3 3 0 0 0 8.5 20z"/>',
    fog: '<path d="M4 9h16M3 13h18M5 17h14"/>',
    rain: '<path d="M7 15h10.2a4.3 4.3 0 0 0 .4-8.6A6 6 0 0 0 6 7.3 3.9 3.9 0 0 0 7 15z"/><path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5"/>',
    storm: '<path d="M7 15h10.2a4.3 4.3 0 0 0 .4-8.6A6 6 0 0 0 6 7.3 3.9 3.9 0 0 0 7 15z"/><path d="M12.5 15.5l-2 3.5h3l-2 3.5"/>',
    snow: '<path d="M7 15h10.2a4.3 4.3 0 0 0 .4-8.6A6 6 0 0 0 6 7.3 3.9 3.9 0 0 0 7 15z"/><path d="M8.5 19h.01M12 20.5h.01M15.5 19h.01"/>'
  };
  function wxIcon(code, day) {
    var nm = code === 0 ? (day ? 'sun' : 'moon') : code <= 2 ? 'partly' : code === 3 ? 'cloud' : code <= 48 ? 'fog'
      : code >= 95 ? 'storm' : (code >= 71 && code <= 77) || code === 85 || code === 86 ? 'snow' : 'rain';
    return svg(WX_ICONS[nm]);
  }
  var wx = store.get('lumen.wx', {}), wxBusy = false;
  function wxRefresh(force) {
    var list = cityRows().filter(function (c) { return c.lat !== null; });
    var fresh = list.every(function (c) { var w = wx[wxKey(c)]; return w && Date.now() - w.at < 30 * 60000; });
    if (wxBusy || !list.length || (fresh && !force) || !window.fetch) return;
    wxBusy = true;
    var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 10000);
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + list.map(function (c) { return c.lat; }).join(',') +
      '&longitude=' + list.map(function (c) { return c.lon; }).join(',') + '&current=temperature_2m,weather_code,is_day&timezone=auto';
    fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) { return r.json(); }).then(function (j) {
      (Array.isArray(j) ? j : [j]).forEach(function (o, k) {
        if (o && o.current) wx[wxKey(list[k])] = { t: Math.round(o.current.temperature_2m), c: o.current.weather_code, d: o.current.is_day, at: Date.now() };
      });
      store.set('lumen.wx', wx); if (view === 'clock' && wc.mode !== 'picker') renderClock();
    }).catch(function () {}).then(function () { wxBusy = false; clearTimeout(timer); });
  }
  setInterval(function () { if (view === 'clock') wxRefresh(false); }, 5 * 60000);
  function wxCell(c) {
    var w = c.lat === null ? null : wx[wxKey(c)], age = w ? Date.now() - w.at : Infinity;
    if (!w || age > 3 * 3600000) return '<span>Weather unavailable</span>';
    return wxIcon(w.c, w.d) + '<span>' + w.t + '°' + (age > 30 * 60000 ? ' · ' + Math.round(age / 60000) + ' min ago' : '') + '</span>';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }

  function renderClock() {
    var d = new Date(), rows = cityRows(), html = '<div id="cityRows">';
    if (wc.mode === 'picker') {
      wc.picks.forEach(function (c, i) {
        html += '<div class="row city' + (i === wc.pick ? ' focused' : '') + '"><div class="name">' + esc(c.name) + '<span class="sub">' + relative(c, d) + '</span></div><div class="t" data-tz="' + c.tz + '"></div></div>';
      });
    } else {
      rows.forEach(function (c, i) {
        var f = i === wc.i;
        html += '<div class="row city' + (f ? ' focused' : '') + '"><div class="name">' + esc(c.name) + '<span class="sub">' + esc(relative(c, d)) + '</span></div>';
        if (f && wc.mode === 'menu') html += '<div class="menu">' + menuOpts().map(function (o, j) { return '<span class="opt' + (j === wc.menu ? ' focused' : '') + '">' + o + '</span>'; }).join('') + '</div>';
        else html += '<div class="wx">' + wxCell(c) + '</div><div class="t" data-tz="' + c.tz + '"></div>';
        html += '</div>';
      });
      var full = rows.length >= MAX_CITIES;
      html += '<div class="row' + (wc.i === rows.length ? ' focused' : '') + (full ? ' disabled' : '') + '"><div class="name">' + (full ? 'Remove a city to add another' : '+ Add city') + '</div></div>';
    }
    $('cityList').innerHTML = html + '</div>';
    tickCities(); scrollList();
  }
  function tickCities() {
    var d = new Date();
    Array.prototype.forEach.call(document.querySelectorAll('#cityList .t'), function (el) { setTime(el, el.getAttribute('data-tz'), d); });
  }
  function scrollList() {
    var picker = wc.mode === 'picker', i = picker ? wc.pick : wc.i, count = picker ? wc.picks.length : cityRows().length + 1, visible = 9;
    var top = Math.max(0, Math.min(i - 4, count - visible)), el = $('cityRows');
    if (el) el.style.transform = 'translateY(' + (-top * 80) + 'px)';
  }
  function menuOpts() { return wc.i === 1 ? ['Remove', 'Cancel'] : ['Move up', 'Remove', 'Cancel']; }
  function focusedCity() { return wc.mode === 'picker' ? wc.picks[wc.pick] : cityRows()[wc.i] || null; }

  var dotOn = false;
  function dotLoop() {
    var dot = $('cityDot');
    if (view !== 'clock' || document.hidden) { dotOn = false; dot.classList.remove('on'); return; }
    var v = $('wcVideo'), c = focusedCity();
    if (c && c.lat !== null && v.readyState >= 2) {
      var p = LM.project(c.lat, c.lon, v.currentTime);
      dot.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px)';
      dot.classList.toggle('on', p.front);
    } else dot.classList.remove('on');
    requestAnimationFrame(dotLoop);
  }
  function openClock() {
    orbPlay('open'); lensOff();
    wc.i = 0; wc.mode = 'list';
    setView('clock'); renderClock(); wxRefresh(false);
    var v = $('wcVideo');
    v.onplaying = function () { v.style.transition = 'opacity 500ms'; v.style.opacity = 1; };
    v.onloadeddata = function () { if (still) v.style.opacity = 1; };
    if (!still) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else if (v.readyState < 2) v.load(); else v.style.opacity = 1;
    if (!dotOn) { dotOn = true; requestAnimationFrame(dotLoop); }
  }
  function closeClock(silent) {
    $('wcVideo').pause(); setView('home');
    if (!silent) { focusTop(0); orbPlay('focus'); }
  }
  function keyClock(k) {
    var rows = cityRows();
    if (wc.mode === 'picker') {
      if (k === K.UP) wc.pick = Math.max(0, wc.pick - 1);
      else if (k === K.DOWN) wc.pick = Math.min(wc.picks.length - 1, wc.pick + 1);
      else if (k === K.OK) { saved.push(wc.picks[wc.pick].name); store.set('lumen.cities', saved); wc.mode = 'list'; wc.i = saved.length; wxRefresh(true); }
      else if (k === K.BACK || k === K.ESC) wc.mode = 'list';
      else return false;
    } else if (wc.mode === 'menu') {
      var opts = menuOpts();
      if (k === K.LEFT) wc.menu = Math.max(0, wc.menu - 1);
      else if (k === K.RIGHT) wc.menu = Math.min(opts.length - 1, wc.menu + 1);
      else if (k === K.OK) {
        var o = opts[wc.menu], j = wc.i - 1;
        if (o === 'Move up') { saved.splice(j - 1, 0, saved.splice(j, 1)[0]); wc.i--; }
        else if (o === 'Remove') { saved.splice(j, 1); wc.i = Math.min(wc.i, saved.length); }
        store.set('lumen.cities', saved); wc.mode = 'list';
      } else if (k === K.BACK || k === K.ESC) wc.mode = 'list';
      else return false;
    } else {
      if (k === K.UP) wc.i = Math.max(0, wc.i - 1);
      else if (k === K.DOWN) wc.i = Math.min(rows.length, wc.i + 1);
      else if (k === K.OK) {
        if (wc.i === 0) toast('This is your TV’s own time.');
        else if (wc.i === rows.length) {
          if (rows.length >= MAX_CITIES) toast('Remove a city to add another.');
          else { wc.picks = CITIES.filter(function (c) { return saved.indexOf(c.name) < 0; }); wc.pick = 0; wc.mode = 'picker'; }
        } else { wc.mode = 'menu'; wc.menu = 0; }
      } else if (k === K.BACK || k === K.ESC) { closeClock(false); return; }
      else return false;
    }
    renderClock();
  }

  /* ---- All apps -------------------------------------------------------------------------------- */
  var apps = { items: [], i: 0, scroll: 0, height: 0, built: false };
  function buildApps() {
    var grid = $('appsGrid'), y = 0, rowIndex = 0;
    var visible = APPS.filter(function (a) { return hidden.indexOf(a.id) < 0; });
    var byTitle = function (a, b) { return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1; };
    function section(title, entries) {
      if (!entries.length) return;
      var h = document.createElement('div'); h.className = 'section'; h.textContent = title; h.style.top = y + 'px'; grid.appendChild(h); y += 52;
      entries.forEach(function (en, i) {
        var col = i % 6; if (col === 0 && i) { y += 196; rowIndex++; }
        en.x = 96 + col * 240; en.gy = y; en.row = rowIndex; en.col = col;
        en.el.style.left = en.x + 'px'; en.el.style.top = y + 'px'; grid.appendChild(en.el);
        var cap = document.createElement('div'); cap.className = 'caption'; cap.textContent = en.title;
        cap.style.left = en.x + 'px'; cap.style.top = (y + 134) + 'px'; grid.appendChild(cap);
        en.el.addEventListener('mouseenter', function () { if (view === 'apps') focusApps(apps.items.indexOf(en)); });
        en.el.addEventListener('click', function () { if (view === 'apps') launch(en.id, en.title); });
        apps.items.push(en);
      });
      y += 196 + 24; rowIndex++;
    }
    var app = function (a) { return { title: a.title, id: a.id, el: tile(a) }; };
    section('Apps', visible.filter(function (a) { return LG.indexOf(a.id) < 0; }).sort(byTitle).map(app));
    section('Inputs', INPUTS.filter(function (n) { return n.appId; }).map(function (n) { return { title: n.label, id: n.appId, el: moreTile(n.label, INPUT_ICON) }; }));
    section('LG', visible.filter(function (a) { return LG.indexOf(a.id) >= 0; }).sort(byTitle).map(app));
    apps.height = y; apps.built = true;
  }
  function focusApps(i) {
    if (i < 0 || i >= apps.items.length) return;
    if (apps.items[apps.i]) apps.items[apps.i].el.classList.remove('focused');
    apps.i = i; var en = apps.items[i]; en.el.classList.add('focused');
    apps.scroll = Math.max(0, Math.min(en.gy - 260, apps.height - 860));
    $('appsGrid').style.transform = 'translateY(' + (-apps.scroll) + 'px)';
    lensTo(en.x, 170 + en.gy - apps.scroll, true);
  }
  function openApps() {
    if (!apps.built) buildApps();
    if (row[home.i]) row[home.i].el.classList.remove('focused');
    setView('apps');
    if (apps.items.length) focusApps(Math.min(apps.i, apps.items.length - 1)); else { lensOff(); toast('No apps found.'); }
  }
  function closeApps() { if (apps.items[apps.i]) apps.items[apps.i].el.classList.remove('focused'); setView('home'); focusRow(home.i); }
  function keyApps(k) {
    var cur = apps.items[apps.i];
    if (k === K.BACK || k === K.ESC) { closeApps(); return; }
    if (!cur) return false;
    var vertical = function (dir) {
      var best = -1;
      apps.items.forEach(function (en, j) { if (en.row === cur.row + dir && (best < 0 || Math.abs(en.col - cur.col) < Math.abs(apps.items[best].col - cur.col))) best = j; });
      if (best >= 0) focusApps(best);
    };
    if (k === K.LEFT) { if (apps.items[apps.i - 1] && apps.items[apps.i - 1].row === cur.row) focusApps(apps.i - 1); }
    else if (k === K.RIGHT) { if (apps.items[apps.i + 1] && apps.items[apps.i + 1].row === cur.row) focusApps(apps.i + 1); }
    else if (k === K.UP) vertical(-1);
    else if (k === K.DOWN) vertical(1);
    else if (k === K.OK) launch(cur.id, cur.title);
    else return false;
  }

  /* ---- settings -------------------------------------------------------------------------------- */
  var set = { i: 0, about: false };
  var SETTINGS = [
    { name: 'Pause scene motion', value: function () { return still ? 'On' : 'Off'; }, act: function () {
      still = !still; store.set('lumen.still', still); body.classList.toggle('still', still); updateScene(); } },
    { name: 'Developer Mode renewal', act: function () { if (window.RenewalPanel) RenewalPanel.open(); } },
    { name: 'Wi-Fi & network', act: function () { launch('com.webos.app.firstuse-overlay', 'network settings', { target: 'network' }); } },
    { name: 'TV settings', act: function () { launch('com.palm.app.settings', 'TV settings'); } },
    { name: 'About Haven', act: function () { set.about = true; } }
  ];
  function renderSettings() {
    var list = $('setList');
    if (set.about) {
      list.innerHTML = '<div class="row focused"><div class="name">Haven 2.0</div><div class="value">Back to return</div></div>' +
        '<p style="font-size:24px;line-height:1.55;color:var(--text-2);margin-top:18px">A calm home for your LG TV. Hold Home for about 2 seconds to return to LG’s own home; open Home Helper from the app list to bring Haven back. Weather from Open-Meteo.</p>';
      return;
    }
    list.innerHTML = SETTINGS.map(function (s, i) {
      return '<div class="row' + (i === set.i ? ' focused' : '') + '"><div class="name">' + s.name + '</div>' + (s.value ? '<div class="value">' + s.value() + '</div>' : '') + '</div>';
    }).join('');
  }
  function openSettings() { leaveTop(); set.i = 0; set.about = false; setView('settings'); renderSettings(); }
  function keySettings(k) {
    if (set.about) { if (k === K.BACK || k === K.ESC || k === K.OK) set.about = false; else return false; }
    else if (k === K.UP) set.i = Math.max(0, set.i - 1);
    else if (k === K.DOWN) set.i = Math.min(SETTINGS.length - 1, set.i + 1);
    else if (k === K.OK) SETTINGS[set.i].act();
    else if (k === K.BACK || k === K.ESC) { setView('home'); focusTop(topItems().indexOf($('gear'))); return; }
    else return false;
    renderSettings();
  }

  /* ---- keys ------------------------------------------------------------------------------------ */
  document.addEventListener('keydown', function (e) {
    if (window.RenewalPanel && RenewalPanel.isOpen()) return;          // its own capture handler owns the keys
    var k = e.keyCode;
    if (introOn) { endIntro('key'); e.preventDefault(); return; }       // any key skips the welcome
    lastKey = Date.now(); if (idle) { idle = false; updateScene(); }
    if (body.classList.contains('wake')) endWake();                    // a press during the wake finishes it at once
    if ($('curtain').classList.contains('on')) { e.preventDefault(); return; }
    if (k === K.OK && e.repeat) { e.preventDefault(); return; }
    if (k === K.BKSP) k = K.BACK;
    var r = view === 'home' ? keyHome(k) : view === 'clock' ? keyClock(k) : view === 'apps' ? keyApps(k) : keySettings(k);
    if (r !== false) e.preventDefault();
  });

  /* ---- boot ------------------------------------------------------------------------------------ */
  var upd = $('renewalUpdates'); if (upd) upd.disabled = true;           // Haven is updated from the PC, never over the air
  buildRow();
  setTod(true);
  tickHome(); setTimeout(function () { tickHome(); setInterval(tickHome, 10000); }, 1000 - Date.now() % 1000);
  focusLast();
  playIntro();
  riveInit();
  setTimeout(marbleGlass, 1500);                                         // after first paint: never slow the wake
}());
