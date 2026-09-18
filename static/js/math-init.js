/*
 * Typesets every \( ... \), \[ ... \] and $$ ... $$ on a Play page with KaTeX.
 * Pages opt in with `math: true` in their front matter. If KaTeX can't load
 * (offline, blocked CDN), the raw TeX stays readable.
 */
(function () {
  'use strict';
  var page = document.querySelector('.play-page');
  if (!page || typeof window.renderMathInElement !== 'function') return;
  window.renderMathInElement(page, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '\\[', right: '\\]', display: true },
      { left: '\\(', right: '\\)', display: false }
    ],
    throwOnError: false
  });
})();
