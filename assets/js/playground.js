/* Journal playground — three small canvas toys, vanilla, no deps.
   Each canvas: <canvas data-play="liquid|strata|letters">.
   Animation runs only while the canvas is on screen (IntersectionObserver)
   and the tab is visible. Pointer + touch. */

(function () {
  'use strict';

  var toys = { liquid: liquid, strata: strata, letters: letters };

  document.querySelectorAll('canvas[data-play]').forEach(function (cv) {
    var make = toys[cv.dataset.play];
    if (!make) return;

    var dpr = Math.min(2, window.devicePixelRatio || 1);
    function fit() {
      var r = cv.getBoundingClientRect();
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
    }
    fit();
    window.addEventListener('resize', fit);

    var ctx = cv.getContext('2d');
    var pointer = { x: -1e4, y: -1e4, down: false, moved: 0 };

    function pos(e) {
      var t = e.touches ? e.touches[0] : e;
      var r = cv.getBoundingClientRect();
      pointer.x = (t.clientX - r.left) * dpr;
      pointer.y = (t.clientY - r.top) * dpr;
      pointer.moved++;
    }
    cv.addEventListener('pointermove', pos);
    cv.addEventListener('pointerdown', function (e) { pointer.down = true; pos(e); });
    window.addEventListener('pointerup', function () { pointer.down = false; });
    cv.addEventListener('pointerleave', function () { pointer.x = -1e4; pointer.y = -1e4; });

    var toy = make(cv, ctx, pointer, dpr);

    var visible = false, raf = null, t0 = performance.now();
    function loop(now) {
      raf = null;
      if (!visible || document.hidden) return;
      toy.frame((now - t0) / 1000);
      raf = requestAnimationFrame(loop);
    }
    function wake() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop); }

    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      wake();
    }, { rootMargin: '80px' }).observe(cv);
    document.addEventListener('visibilitychange', wake);
  });

  /* ── 1. LIQUID — pink ribbon chasing the cursor ─────────────────── */
  function liquid(cv, ctx, p, dpr) {
    var pts = [];
    var head = { x: 0, y: 0, vx: 0, vy: 0 };
    var MAX = 90;

    return { frame: function (t) {
      var W = cv.width, H = cv.height;

      // target: cursor, or a slow lissajous wander when idle
      var tx, ty;
      if (p.x > -1e3) { tx = p.x; ty = p.y; }
      else {
        tx = W / 2 + Math.sin(t * .7) * W * .3 + Math.sin(t * 1.9) * W * .08;
        ty = H / 2 + Math.cos(t * .9) * H * .28 + Math.cos(t * 2.3) * H * .07;
      }
      head.vx += (tx - head.x) * .06; head.vy += (ty - head.y) * .06;
      head.vx *= .82; head.vy *= .82;
      head.x += head.vx; head.y += head.vy;

      pts.push({ x: head.x, y: head.y });
      if (pts.length > MAX) pts.shift();

      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, W, H);
      ctx.lineCap = ctx.lineJoin = 'round';

      for (var i = 1; i < pts.length; i++) {
        var k = i / pts.length;
        var w = Math.sin(k * Math.PI) * 26 * dpr * (0.6 + 0.4 * Math.sin(t * 3 + i * .3));
        ctx.strokeStyle = 'hsl(' + (330 + k * 25) + ' 95% ' + (52 + k * 18) + '%)';
        ctx.lineWidth = Math.max(1, w);
        ctx.beginPath();
        ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
        ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }
    } };
  }

  /* ── 2. STRATA — diffusing grid of squares (blue) ───────────────── */
  function strata(cv, ctx, p, dpr) {
    var COLS = 26, ROWS = 19;
    var cells = new Float32Array(COLS * ROWS);
    var next = new Float32Array(COLS * ROWS);

    return { frame: function (t) {
      var W = cv.width, H = cv.height;
      var cw = W / COLS, chh = H / ROWS;

      // idle waves
      for (var y = 0; y < ROWS; y++)
        for (var x = 0; x < COLS; x++) {
          var idle = .12 + .1 * Math.sin(t * 1.1 + x * .55 + Math.sin(y * .5 + t * .6) * 1.4);
          var i = y * COLS + x;
          cells[i] = Math.max(cells[i], idle);
        }

      // pointer energy
      if (p.x > -1e3) {
        var gx = Math.floor(p.x / cw), gy = Math.floor(p.y / chh);
        for (var dy = -2; dy <= 2; dy++)
          for (var dx = -2; dx <= 2; dx++) {
            var xx = gx + dx, yy = gy + dy;
            if (xx < 0 || yy < 0 || xx >= COLS || yy >= ROWS) continue;
            var d = Math.abs(dx) + Math.abs(dy);
            cells[yy * COLS + xx] = Math.max(cells[yy * COLS + xx], (p.down ? 1.4 : 1) - d * .22);
          }
      }

      // diffuse + decay
      for (var y2 = 0; y2 < ROWS; y2++)
        for (var x2 = 0; x2 < COLS; x2++) {
          var i2 = y2 * COLS + x2, s = cells[i2] * 4;
          var n = 4;
          if (x2 > 0) { s += cells[i2 - 1]; n++; }
          if (x2 < COLS - 1) { s += cells[i2 + 1]; n++; }
          if (y2 > 0) { s += cells[i2 - COLS]; n++; }
          if (y2 < ROWS - 1) { s += cells[i2 + COLS]; n++; }
          next[i2] = (s / n) * .965;
        }
      var tmp = cells; cells = next; next = tmp;

      ctx.fillStyle = '#2B3990';
      ctx.fillRect(0, 0, W, H);
      var pad = Math.max(1, cw * .08);
      for (var y3 = 0; y3 < ROWS; y3++)
        for (var x3 = 0; x3 < COLS; x3++) {
          var v = Math.min(1, cells[y3 * COLS + x3]);
          var l = 32 + v * 62;                       // lightness 32..94
          ctx.fillStyle = 'hsl(233 52% ' + l + '%)';
          ctx.fillRect(x3 * cw + pad / 2, y3 * chh + pad / 2, cw - pad, chh - pad);
        }
    } };
  }

  /* ── 3. LETTERS — grab & throw the alphabet (green) ─────────────── */
  function letters(cv, ctx, p, dpr) {
    var chars = 'REDO→JOURNAL'.split('');
    var bodies = null, grabbed = -1;

    function init() {
      bodies = chars.map(function (c, i) {
        return {
          c: c,
          x: cv.width * (0.12 + 0.76 * Math.random()),
          y: cv.height * (0.15 + 0.7 * Math.random()),
          vx: (Math.random() - .5) * 2, vy: (Math.random() - .5) * 2,
          r: (18 + Math.random() * 26) * dpr,
          a: Math.random() * Math.PI * 2, va: (Math.random() - .5) * .02,
        };
      });
    }

    return { frame: function (t) {
      var W = cv.width, H = cv.height;
      if (!bodies) init();

      if (p.down && grabbed === -1) {
        var best = 1e9;
        bodies.forEach(function (b, i) {
          var d = (b.x - p.x) * (b.x - p.x) + (b.y - p.y) * (b.y - p.y);
          if (d < best && d < (b.r * 3) * (b.r * 3)) { best = d; grabbed = i; }
        });
      }
      if (!p.down) grabbed = -1;

      bodies.forEach(function (b, i) {
        if (i === grabbed && p.x > -1e3) {
          b.vx = (p.x - b.x) * .3; b.vy = (p.y - b.y) * .3;
          b.x = p.x; b.y = p.y;
        } else {
          b.x += b.vx; b.y += b.vy;
          b.vx *= .995; b.vy *= .995;
          // gentle drift so it never fully sleeps
          b.vx += Math.sin(t * .8 + i * 2.1) * .015;
          b.vy += Math.cos(t * .6 + i * 1.7) * .015;
          if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * .9; }
          if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * .9; }
          if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy) * .9; }
          if (b.y > H - b.r) { b.y = H - b.r; b.vy = -Math.abs(b.vy) * .9; }
        }
        b.a += b.va + b.vx * .002;
      });

      ctx.fillStyle = '#E9F6EE';
      ctx.fillRect(0, 0, W, H);
      bodies.forEach(function (b, i) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.a);
        ctx.font = '900 ' + (b.r * 2) + 'px Helvetica, Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = i % 3 === 0 ? '#00A857' : '#0A0A0A';
        ctx.fillText(b.c, 0, 0);
        ctx.restore();
      });
    } };
  }
})();
