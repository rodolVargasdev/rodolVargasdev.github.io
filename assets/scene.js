import * as THREE from "./vendor/three.module.min.js";

/*
 * Hero scene: a loose sphere of connected points, a few nodes pulsing in the
 * signal color. Rendering pauses when the hero is off screen or the tab is
 * hidden. With reduced motion it draws a single static frame.
 */
(function () {
  var host = document.getElementById("hero-scene");
  if (!host) return;
  var hero = host.parentElement;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  } catch (e) {
    return; /* CSS gradient fallback stays in place */
  }

  var small = window.matchMedia("(max-width: 700px)").matches;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var COUNT = small ? 170 : 420;
  var RADIUS = 1.5;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  var canvas = renderer.domElement;
  host.appendChild(canvas);
  hero.classList.add("scene-on");

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
  camera.position.z = 4.4;
  var group = new THREE.Group();
  scene.add(group);

  /* deterministic pseudo-random so the shape is the same on every load */
  var seed = 186;
  function rnd() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /* points on a loose sphere (Fibonacci lattice with radial jitter) */
  var pos = new Float32Array(COUNT * 3);
  var golden = Math.PI * (3 - Math.sqrt(5));
  for (var i = 0; i < COUNT; i++) {
    var y = 1 - (2 * (i + 0.5)) / COUNT;
    var r = Math.sqrt(1 - y * y);
    var th = i * golden;
    var rad = RADIUS * (0.86 + rnd() * 0.28);
    pos[i * 3] = Math.cos(th) * r * rad;
    pos[i * 3 + 1] = y * rad;
    pos[i * 3 + 2] = Math.sin(th) * r * rad;
  }

  /* thin lines: each point to its nearest neighbours, plus a few long chords */
  var maxD2 = Math.pow(small ? 0.5 : 0.34, 2) * RADIUS * RADIUS;
  var edges = new Set();
  var near = [];
  for (var a = 0; a < COUNT; a++) {
    near.length = 0;
    for (var b = 0; b < COUNT; b++) {
      if (a === b) continue;
      var dx = pos[a * 3] - pos[b * 3], dy = pos[a * 3 + 1] - pos[b * 3 + 1], dz = pos[a * 3 + 2] - pos[b * 3 + 2];
      var d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < maxD2) near.push([d2, b]);
    }
    near.sort(function (p, q) { return p[0] - q[0]; });
    for (var k = 0; k < Math.min(2, near.length); k++) {
      var lo = Math.min(a, near[k][1]), hi = Math.max(a, near[k][1]);
      edges.add(lo * COUNT + hi);
    }
  }
  var linePos = [];
  edges.forEach(function (key) {
    var p = Math.floor(key / COUNT), q = key % COUNT;
    linePos.push(pos[p * 3], pos[p * 3 + 1], pos[p * 3 + 2], pos[q * 3], pos[q * 3 + 1], pos[q * 3 + 2]);
  });
  var chordPos = [];
  for (var c = 0; c < (small ? 8 : 18); c++) {
    var p1 = Math.floor(rnd() * COUNT), p2 = Math.floor(rnd() * COUNT);
    chordPos.push(pos[p1 * 3], pos[p1 * 3 + 1], pos[p1 * 3 + 2], pos[p2 * 3], pos[p2 * 3 + 1], pos[p2 * 3 + 2]);
  }

  function lineObject(arr, opacity) {
    var g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    var m = new THREE.LineBasicMaterial({ transparent: true, opacity: opacity, depthWrite: false });
    var o = new THREE.LineSegments(g, m);
    group.add(o);
    return o;
  }
  var lines = lineObject(linePos, 0.5);
  var chords = lineObject(chordPos, 0.22);

  /* round sprite for the points */
  var sprite = (function () {
    var cv = document.createElement("canvas");
    cv.width = cv.height = 64;
    var cx = cv.getContext("2d");
    var gr = cx.createRadialGradient(32, 32, 0, 32, 32, 30);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.55, "rgba(255,255,255,0.9)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    cx.fillStyle = gr;
    cx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  })();

  var dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  var dotMat = new THREE.PointsMaterial({ size: small ? 0.05 : 0.04, map: sprite, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true });
  var dots = new THREE.Points(dotGeo, dotMat);
  group.add(dots);

  /* three groups of pulsing nodes with different phases */
  var pulses = [];
  for (var gIdx = 0; gIdx < 3; gIdx++) {
    var n = small ? 3 : 6;
    var arr = new Float32Array(n * 3);
    for (var j = 0; j < n; j++) {
      var src = Math.floor(rnd() * COUNT);
      arr[j * 3] = pos[src * 3]; arr[j * 3 + 1] = pos[src * 3 + 1]; arr[j * 3 + 2] = pos[src * 3 + 2];
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    var mat = new THREE.PointsMaterial({ size: 0.1, map: sprite, transparent: true, opacity: 0.9, depthWrite: false, sizeAttenuation: true });
    var pts = new THREE.Points(geo, mat);
    group.add(pts);
    pulses.push({ obj: pts, mat: mat, phase: gIdx * 2.1 });
  }

  /* colors come from the CSS tokens so the scene follows the theme */
  function applyColors() {
    var cs = getComputedStyle(document.documentElement);
    function col(name, fallback) { var v = cs.getPropertyValue(name).trim(); return new THREE.Color(v || fallback); }
    dotMat.color.copy(col("--scene-dot", "#8FA6C1"));
    lines.material.color.copy(col("--scene-line", "#3C5A80"));
    chords.material.color.copy(col("--scene-line", "#3C5A80"));
    var sig = col("--scene-signal", "#5FA8D3");
    pulses.forEach(function (p) { p.mat.color.copy(sig); });
  }
  applyColors();

  /* layout */
  function resize() {
    var w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (w / h > 1.15) { baseX = 1.25; baseY = 0; baseScale = 1; }
    else { baseX = 0; baseY = 1.05; baseScale = 0.58; }
    draw();
  }
  var baseX = 0, baseY = 0, baseScale = 1;

  /* pointer parallax */
  var tx = 0, ty = 0, px = 0, py = 0;
  function onPointer(e) {
    var r = hero.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  }
  hero.addEventListener("pointermove", onPointer, { passive: true });

  function scrollFraction() {
    var r = hero.getBoundingClientRect();
    return Math.min(Math.max(-r.top / r.height, 0), 1);
  }

  var t0 = performance.now();
  function draw(tSec) {
    var t = tSec || 0;
    var s = scrollFraction();
    if (reduce.matches) { px = 0; py = 0; s = 0; }
    /* gentle morph with scroll: the sphere flattens and recedes */
    group.scale.set(baseScale * (1 + 0.2 * s), baseScale * (1 - 0.5 * s), baseScale * (1 + 0.2 * s));
    group.position.set(baseX, baseY + s * 0.5, 0);
    group.rotation.y = t * 0.06 + px * 0.3 + s * 0.9;
    group.rotation.x = 0.28 + py * 0.18 + s * 0.35;
    camera.position.z = 4.4 + s * 1.4;
    pulses.forEach(function (p) {
      var k = 0.5 + 0.5 * Math.sin(t * 1.6 + p.phase);
      p.mat.size = 0.07 + 0.09 * k;
      p.mat.opacity = 0.45 + 0.55 * k;
    });
    host.style.opacity = String((baseX ? 1 : 0.7) * (1 - 0.65 * s));
    renderer.render(scene, camera);
  }

  /* loop control */
  var inView = true, running = false, rafId = 0, lost = false;
  function frame(now) {
    if (!running) return;
    px += (tx - px) * 0.04;
    py += (ty - py) * 0.04;
    draw((now - t0) / 1000);
    rafId = requestAnimationFrame(frame);
  }
  function sync() {
    var want = inView && !document.hidden && !reduce.matches && !lost;
    if (want && !running) { running = true; rafId = requestAnimationFrame(frame); }
    else if (!want && running) { running = false; cancelAnimationFrame(rafId); }
  }

  var io = new IntersectionObserver(function (entries) { inView = entries[0].isIntersecting; sync(); });
  io.observe(hero);
  document.addEventListener("visibilitychange", sync);
  var ro = new ResizeObserver(resize);
  ro.observe(host);
  window.addEventListener("scroll", function () { if (!running && inView && !lost) draw(0); }, { passive: true });
  window.addEventListener("themechange", function () { applyColors(); if (!running) draw(0); });
  var mqScheme = window.matchMedia("(prefers-color-scheme: light)");
  function onScheme() { applyColors(); if (!running) draw(0); }
  if (mqScheme.addEventListener) mqScheme.addEventListener("change", onScheme);
  function onReduce() { sync(); if (!running) draw(0); }
  if (reduce.addEventListener) reduce.addEventListener("change", onReduce);

  /* release everything */
  function dispose() {
    running = false; cancelAnimationFrame(rafId);
    io.disconnect(); ro.disconnect();
    document.removeEventListener("visibilitychange", sync);
    hero.removeEventListener("pointermove", onPointer);
    [dotGeo, lines.geometry, chords.geometry].concat(pulses.map(function (p) { return p.obj.geometry; })).forEach(function (g) { g.dispose(); });
    [dotMat, lines.material, chords.material].concat(pulses.map(function (p) { return p.mat; })).forEach(function (m) { m.dispose(); });
    sprite.dispose();
    renderer.dispose();
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  }
  window.addEventListener("pagehide", dispose);
  canvas.addEventListener("webglcontextlost", function (e) {
    e.preventDefault();
    lost = true;
    dispose();
    hero.classList.remove("scene-on");
  });

  resize();
  sync();
})();
