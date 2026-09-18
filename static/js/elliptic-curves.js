/*
 * Elliptic curve point counter for the Play page.
 *
 * The math (primesUpTo, curvePoints, countPoints, ...) is kept free of the DOM
 * so it can be tested in Node; the UI at the bottom only runs in a browser.
 */
(function (root) {
  'use strict';

  var HIST_PRIME_LIMIT = 4000;
  var HIST_BINS = 20;
  var REAL_HALF = 8;
  var REAL_CELLS = 300;

  function primesUpTo(n) {
    var sieve = new Uint8Array(n + 1);
    var primes = [];
    for (var i = 2; i <= n; i++) {
      if (!sieve[i]) {
        primes.push(i);
        for (var j = i * i; j <= n; j += i) sieve[j] = 1;
      }
    }
    return primes;
  }

  function mod(n, p) {
    return ((n % p) + p) % p;
  }

  // Right-hand side x^3 + ax + b mod p, kept small to stay exact.
  function rhs(x, a, b, p) {
    return mod(mod(x * x, p) * x + a * x + b, p);
  }

  // Number of y in 0..p-1 with y^2 = r (mod p), for every r.
  function squareCounts(p) {
    var counts = new Uint8Array(p);
    for (var y = 0; y < p; y++) counts[(y * y) % p]++;
    return counts;
  }

  // All affine points (x, y) on y^2 = x^3 + ax + b over the integers mod p.
  function curvePoints(p, a, b) {
    var roots = [];
    for (var r = 0; r < p; r++) roots.push([]);
    for (var y = 0; y < p; y++) roots[(y * y) % p].push(y);
    var points = [];
    for (var x = 0; x < p; x++) {
      var ys = roots[rhs(x, a, b, p)];
      for (var k = 0; k < ys.length; k++) points.push([x, ys[k]]);
    }
    return points;
  }

  // #E(F_p): the affine points plus the point at infinity.
  function countPoints(p, a, b) {
    var counts = squareCounts(p);
    var n = 1;
    for (var x = 0; x < p; x++) n += counts[rhs(x, a, b, p)];
    return n;
  }

  // 4a^3 + 27b^2, which is zero exactly when the curve is singular
  // (its discriminant is -16 times this).
  function discriminantCore(a, b) {
    return 4 * a * a * a + 27 * b * b;
  }

  function traceOfFrobenius(p, a, b) {
    return p + 1 - countPoints(p, a, b);
  }

  // The bad primes 5 <= p <= limit: those dividing 4a^3 + 27b^2, where the curve is
  // singular mod p and so is not an elliptic curve there. (2 and 3 are excluded
  // separately because the short Weierstrass form does not apply.)
  function badPrimes(a, b, limit) {
    var core = discriminantCore(a, b);
    if (core === 0) return [];
    return primesUpTo(limit).filter(function (p) { return p >= 5 && mod(core, p) === 0; });
  }

  // a_p / (2 sqrt p) for every good prime 5 <= p <= limit. Hasse's bound says
  // each value lies in [-1, 1].
  function normalizedTraces(a, b, limit) {
    var core = discriminantCore(a, b);
    var out = [];
    if (core === 0) return out;
    var primes = primesUpTo(limit);
    for (var i = 0; i < primes.length; i++) {
      var p = primes[i];
      if (p < 5 || mod(core, p) === 0) continue;
      out.push((p + 1 - countPoints(p, a, b)) / (2 * Math.sqrt(p)));
    }
    return out;
  }

  // Density histogram of values in [-1, 1].
  function histogram(values, bins) {
    var heights = [];
    for (var i = 0; i < bins; i++) heights.push(0);
    var width = 2 / bins;
    values.forEach(function (t) {
      var k = Math.min(bins - 1, Math.max(0, Math.floor((t + 1) / width)));
      heights[k]++;
    });
    return heights.map(function (h) {
      return values.length ? h / (values.length * width) : 0;
    });
  }

  // Line segments [x1, y1, x2, y2] approximating the real curve y^2 = x^3 + ax + b inside the
  // square [-half, half]^2, by marching squares on F(x, y) = y^2 - (x^3 + ax + b). This needs no
  // root finding, so it copes with one piece, two pieces (an oval and a branch) and singular
  // curves alike. Every cell edge is interpolated in one fixed direction (left to right, or bottom
  // to top), so neighbouring segments share their endpoints exactly.
  function realCurveSegments(a, b, half, cells) {
    var n = cells + 1;
    var step = (2 * half) / cells;
    var v = new Float64Array(n * n);
    for (var j = 0; j < n; j++) {
      var y = -half + j * step;
      for (var i = 0; i < n; i++) {
        var x = -half + i * step;
        v[j * n + i] = y * y - (x * x * x + a * x + b);
      }
    }

    function crossing(i0, j0, i1, j1) {
      var v0 = v[j0 * n + i0];
      var v1 = v[j1 * n + i1];
      var t = v0 / (v0 - v1);
      return [-half + (i0 + t * (i1 - i0)) * step, -half + (j0 + t * (j1 - j0)) * step];
    }

    var segments = [];
    for (var cj = 0; cj < cells; cj++) {
      for (var ci = 0; ci < cells; ci++) {
        var va = v[cj * n + ci];
        var vb = v[cj * n + ci + 1];
        var vc = v[(cj + 1) * n + ci + 1];
        var vd = v[(cj + 1) * n + ci];
        var code = (va > 0 ? 1 : 0) | (vb > 0 ? 2 : 0) | (vc > 0 ? 4 : 0) | (vd > 0 ? 8 : 0);
        if (code === 0 || code === 15) continue;

        var left = function () { return crossing(ci, cj, ci, cj + 1); };
        var right = function () { return crossing(ci + 1, cj, ci + 1, cj + 1); };
        var bottom = function () { return crossing(ci, cj, ci + 1, cj); };
        var top = function () { return crossing(ci, cj + 1, ci + 1, cj + 1); };
        var centerPositive = (va + vb + vc + vd) / 4 > 0;

        var pairs;
        switch (code) {
          case 1: case 14: pairs = [[left, bottom]]; break;
          case 2: case 13: pairs = [[bottom, right]]; break;
          case 3: case 12: pairs = [[left, right]]; break;
          case 4: case 11: pairs = [[top, right]]; break;
          case 6: case 9: pairs = [[bottom, top]]; break;
          case 7: case 8: pairs = [[left, top]]; break;
          case 5: pairs = centerPositive ? [[bottom, right], [left, top]] : [[left, bottom], [top, right]]; break;
          default: pairs = centerPositive ? [[left, bottom], [top, right]] : [[bottom, right], [left, top]]; // 10
        }
        pairs.forEach(function (pr) {
          var p1 = pr[0]();
          var p2 = pr[1]();
          segments.push([p1[0], p1[1], p2[0], p2[1]]);
        });
      }
    }
    return segments;
  }

  function equationText(a, b) {
    var s = 'y² = x³';
    if (a) s += (a < 0 ? ' − ' : ' + ') + (Math.abs(a) === 1 ? '' : Math.abs(a)) + 'x';
    if (b) s += (b < 0 ? ' − ' : ' + ') + Math.abs(b);
    return s;
  }

  function equationTex(a, b) {
    var s = 'y^2 = x^3';
    if (a) s += (a < 0 ? ' - ' : ' + ') + (Math.abs(a) === 1 ? '' : Math.abs(a)) + 'x';
    if (b) s += (b < 0 ? ' - ' : ' + ') + Math.abs(b);
    return s;
  }

  var api = {
    primesUpTo: primesUpTo,
    curvePoints: curvePoints,
    countPoints: countPoints,
    discriminantCore: discriminantCore,
    traceOfFrobenius: traceOfFrobenius,
    normalizedTraces: normalizedTraces,
    realCurveSegments: realCurveSegments,
    badPrimes: badPrimes,
    histogram: histogram,
    equationText: equationText,
    equationTex: equationTex
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
    return;
  }
  if (typeof document === 'undefined') return;

  // ---------------------------------------------------------------- UI --

  var BLUE = '#0062cc';
  var GRID = '#dee2e6';
  var AXIS = '#6c757d';
  var INK = '#212529';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function fit(canvas, cssHeight) {
    var dpr = window.devicePixelRatio || 1;
    var width = canvas.clientWidth;
    var height = cssHeight || width;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return { ctx: ctx, width: width, height: height };
  }

  // Render TeX into an element with KaTeX; fall back to plain text if it isn't available.
  function typeset(el, tex, plain) {
    if (window.katex) {
      try { window.katex.render(tex, el, { throwOnError: false }); return; } catch (e) { /* fall through */ }
    }
    el.textContent = plain;
  }

  // Set text that mixes words with \( ... \) math, then typeset the math if KaTeX is loaded.
  function typesetInline(el, text) {
    el.textContent = text;
    if (typeof window.renderMathInElement === 'function') {
      window.renderMathInElement(el, {
        delimiters: [{ left: '\\(', right: '\\)', display: false }],
        throwOnError: false
      });
    }
  }

  ready(function () {
    if (!document.getElementById('ec-canvas')) return;

    var primes = primesUpTo(97).filter(function (p) { return p >= 5; });
    var $ = function (id) { return document.getElementById(id); };
    var pSlider = $('ec-p'), aSlider = $('ec-a'), bSlider = $('ec-b');
    var canvas = $('ec-canvas'), hist = $('ec-hist'), realCanvas = $('ec-real');
    pSlider.max = String(primes.length - 1);

    var state = { p: 0, a: 0, b: 0, points: [], pointSet: null, cell: 0, pad: 0 };

    function drawCurve() {
      var p = state.p;
      var f = fit(canvas);
      var ctx = f.ctx, size = f.width;
      var pad = 22;
      var cell = (size - pad - 6) / p;
      state.cell = cell;
      state.pad = pad;

      ctx.lineWidth = 1;
      ctx.strokeStyle = GRID;
      if (p <= 41) {
        for (var i = 0; i <= p; i++) {
          var g = pad + i * cell;
          ctx.beginPath(); ctx.moveTo(g, size - pad); ctx.lineTo(g, size - pad - p * cell); ctx.stroke();
          var h = size - pad - i * cell;
          ctx.beginPath(); ctx.moveTo(pad, h); ctx.lineTo(pad + p * cell, h); ctx.stroke();
        }
      }
      ctx.strokeStyle = AXIS;
      ctx.strokeRect(pad, size - pad - p * cell, p * cell, p * cell);

      ctx.fillStyle = AXIS;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('0', pad + cell / 2, size - 8);
      ctx.fillText(String(p - 1), pad + (p - 0.5) * cell, size - 8);
      ctx.fillText('x', pad + (p * cell) / 2, size - 8);
      ctx.textAlign = 'right';
      ctx.fillText('0', pad - 5, size - pad - cell / 2 + 4);
      ctx.fillText(String(p - 1), pad - 5, size - pad - (p - 0.5) * cell + 4);
      ctx.fillText('y', pad - 5, size - pad - (p * cell) / 2 + 4);

      ctx.fillStyle = BLUE;
      var radius = Math.max(1.6, cell * 0.34);
      state.points.forEach(function (pt) {
        var cx = pad + (pt[0] + 0.5) * cell;
        var cy = size - pad - (pt[1] + 0.5) * cell;
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, 2 * Math.PI); ctx.fill();
      });
    }

    // The curve over the real numbers, in the same square frame as the mod p plot.
    function drawReal(a, b) {
      var f = fit(realCanvas);
      var ctx = f.ctx, size = f.width;
      var pad = 22;
      var inner = size - pad - 6;
      var half = REAL_HALF;
      var toX = function (x) { return pad + ((x + half) / (2 * half)) * inner; };
      var toY = function (y) { return size - pad - ((y + half) / (2 * half)) * inner; };

      ctx.lineWidth = 1;
      ctx.strokeStyle = GRID;
      for (var t = -half; t <= half; t += 2) {
        ctx.beginPath(); ctx.moveTo(toX(t), toY(-half)); ctx.lineTo(toX(t), toY(half)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(toX(-half), toY(t)); ctx.lineTo(toX(half), toY(t)); ctx.stroke();
      }
      ctx.strokeStyle = AXIS;
      ctx.strokeRect(toX(-half), toY(half), inner, inner);
      ctx.beginPath(); ctx.moveTo(toX(-half), toY(0)); ctx.lineTo(toX(half), toY(0)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(toX(0), toY(-half)); ctx.lineTo(toX(0), toY(half)); ctx.stroke();

      ctx.fillStyle = AXIS;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      [-half, 0, half].forEach(function (t) { ctx.fillText(String(t), toX(t), size - 8); });
      ctx.textAlign = 'right';
      [-half, 0, half].forEach(function (t) { ctx.fillText(String(t), pad - 5, toY(t) + 4); });

      ctx.save();
      ctx.beginPath(); ctx.rect(toX(-half), toY(half), inner, inner); ctx.clip();
      ctx.strokeStyle = BLUE;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      realCurveSegments(a, b, half, REAL_CELLS).forEach(function (s) {
        ctx.moveTo(toX(s[0]), toY(s[1]));
        ctx.lineTo(toX(s[2]), toY(s[3]));
      });
      ctx.stroke();
      ctx.restore();

      var core = discriminantCore(a, b);
      $('ec-real-caption').textContent = core < 0
        ? 'Two connected pieces: an oval and an unbounded branch.'
        : core > 0
          ? 'One connected piece.'
          : 'A singular curve: it has a cusp or a node.';
      realCanvas.setAttribute('aria-label', 'The real graph of ' + equationText(a, b) + '. ' + $('ec-real-caption').textContent);
    }

    function drawHistogram(values) {
      var f = fit(hist, 190);
      var ctx = f.ctx, w = f.width, h = f.height;
      var left = 34, bottom = 26, top = 8, right = 8;
      var plotW = w - left - right, plotH = h - top - bottom;

      var heights = histogram(values, HIST_BINS);
      var yMax = Math.max(0.7, Math.max.apply(null, heights) * 1.05);
      var sx = function (t) { return left + ((t + 1) / 2) * plotW; };
      var sy = function (d) { return top + plotH - (d / yMax) * plotH; };

      ctx.strokeStyle = AXIS;
      ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, top + plotH); ctx.lineTo(left + plotW, top + plotH); ctx.stroke();
      ctx.fillStyle = AXIS; ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      [-1, -0.5, 0, 0.5, 1].forEach(function (t) { ctx.fillText(String(t), sx(t), h - 9); });
      ctx.textAlign = 'right';
      ctx.fillText('0', left - 5, sy(0) + 4);
      ctx.fillText(yMax.toFixed(1), left - 5, sy(yMax) + 10);

      var barW = plotW / HIST_BINS;
      ctx.fillStyle = 'rgba(0, 98, 204, 0.55)';
      heights.forEach(function (d, i) {
        ctx.fillRect(left + i * barW + 1, sy(d), barW - 2, sy(0) - sy(d));
      });

      // The semicircle density (2/pi) sqrt(1 - t^2) that non-CM curves follow.
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (var i = 0; i <= 100; i++) {
        var t = -1 + (2 * i) / 100;
        var d = (2 / Math.PI) * Math.sqrt(Math.max(0, 1 - t * t));
        if (i === 0) ctx.moveTo(sx(t), sy(d)); else ctx.lineTo(sx(t), sy(d));
      }
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    function update() {
      var p = primes[parseInt(pSlider.value, 10)];
      var a = parseInt(aSlider.value, 10);
      var b = parseInt(bSlider.value, 10);
      state.p = p; state.a = a; state.b = b;

      $('ec-p-out').textContent = p;
      $('ec-a-out').textContent = a;
      $('ec-b-out').textContent = b;
      typeset($('ec-equation'), equationTex(a, b) + ' \\pmod{' + p + '}', equationText(a, b) + '  (mod ' + p + ')');

      var singular = mod(discriminantCore(a, b), p) === 0;
      var warn = $('ec-singular');
      warn.hidden = !singular;
      $('ec-results').hidden = singular;

      state.points = curvePoints(p, a, b);
      state.pointSet = {};
      state.points.forEach(function (pt) { state.pointSet[pt[0] * p + pt[1]] = true; });
      drawCurve();
      if (realCanvas) drawReal(a, b);
      canvas.setAttribute('aria-label', 'Points on ' + equationText(a, b) + ' mod ' + p + ': ' +
        (state.points.length + 1) + ' including the point at infinity.');

      if (!singular) {
        var n = state.points.length + 1;
        var ap = p + 1 - n;
        var bound = 2 * Math.sqrt(p);
        $('ec-count').textContent = n;
        $('ec-hasse').textContent = (p + 1 - bound).toFixed(2) + ' to ' + (p + 1 + bound).toFixed(2);
        $('ec-ap').textContent = ap;
        typeset($('ec-ap-bound'), '2\\sqrt{' + p + '} \\approx ' + bound.toFixed(2), '2√' + p + ' ≈ ' + bound.toFixed(2));
        if (Math.abs(ap) <= bound) {
          typeset($('ec-hasse-check'), '|a_p| = ' + Math.abs(ap) + ' \\le ' + bound.toFixed(2) + ' \\;\\checkmark',
            '|aₚ| = ' + Math.abs(ap) + ' ≤ ' + bound.toFixed(2) + ' ✓');
        } else {
          $('ec-hasse-check').textContent = 'violates the bound?! (this should never happen)';
        }
      }

      if (!hist) return;
      var values = normalizedTraces(a, b, HIST_PRIME_LIMIT);
      var histNote = $('ec-hist-note');
      if (!values.length) {
        typesetInline(histNote, 'This curve is singular over the rationals (\\(4a^3 + 27b^2 = 0\\)), so there is nothing to plot.');
        fit(hist, 190);
      } else {
        drawHistogram(values);
        var bad = badPrimes(a, b, HIST_PRIME_LIMIT);
        var inside = values.every(function (t) { return Math.abs(t) <= 1 + 1e-12; });
        typesetInline(histNote,
          'Counted ' + values.length + ' primes \\(p\\) from 5 to ' + HIST_PRIME_LIMIT + '. ' +
          (bad.length
            ? 'Skipped ' + bad.join(', ') + ', where \\(4a^3 + 27b^2 \\equiv 0 \\pmod{p}\\), so the curve is singular and is not an elliptic curve. '
            : 'No primes had to be skipped. ') +
          (inside ? 'Every value is inside \\([-1, 1]\\), as Hasse says.' : 'Some value escaped \\([-1, 1]\\)?!'));
      }
    }

    [pSlider, aSlider, bSlider].forEach(function (s) { s.addEventListener('input', update); });

    $('ec-random').addEventListener('click', function () {
      pSlider.value = String(Math.floor(Math.random() * primes.length));
      aSlider.value = String(Math.floor(Math.random() * 41) - 20);
      bSlider.value = String(Math.floor(Math.random() * 41) - 20);
      update();
    });

    canvas.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      var x = Math.floor((e.clientX - rect.left - state.pad) / state.cell);
      var y = Math.floor((rect.height - state.pad - (e.clientY - rect.top)) / state.cell);
      var label = $('ec-hover');
      if (x >= 0 && y >= 0 && x < state.p && y < state.p) {
        label.textContent = (state.pointSet[x * state.p + y] ? 'On the curve: ' : 'Not on the curve: ') +
          '(' + x + ', ' + y + ')';
      } else {
        label.textContent = ' ';
      }
    });
    canvas.addEventListener('mouseleave', function () { $('ec-hover').textContent = ' '; });

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(update, 120);
    });

    // Start on y^2 = x^3 + x + 1 (mod 11), a small curve with a readable picture.
    pSlider.value = String(primes.indexOf(11));
    aSlider.value = '1';
    bSlider.value = '1';
    update();
  });
})(this);
