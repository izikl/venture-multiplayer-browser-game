/*
 * no-zoom.js - shared touch hardening for My Plays game pages.
 *
 * iOS Safari IGNORES <meta viewport user-scalable=no> and still allows pinch
 * zoom, double-tap-to-zoom, and long-press text selection / the copy + select-all
 * callout. In a fast-tapping game this makes the page zoom in unexpectedly or
 * select the whole screen. These JS guards disable that behaviour. Real form
 * fields keep their normal focus, keyboard, and text selection.
 */
(function () {
  'use strict';

  function isFormField(el) {
    if (!el || !el.tagName) return false;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return true;
    return typeof el.closest === 'function'
      && !!el.closest('input, textarea, select, [contenteditable="true"]');
  }

  // Pinch-zoom: iOS Safari fires gesture* events; cancelling them blocks the zoom.
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (type) {
    document.addEventListener(type, function (e) { e.preventDefault(); }, { passive: false });
  });

  // Double-tap-to-zoom: cancel the default on a second tap within 350ms, unless
  // it lands on a form field (so tapping an input still opens the keyboard).
  var lastTouchEnd = 0;
  document.addEventListener('touchend', function (e) {
    var now = Date.now();
    if (now - lastTouchEnd <= 350 && !isFormField(e.target)) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  // Long-press selection, the iOS copy / select-all callout, and the context menu.
  document.addEventListener('selectstart', function (e) {
    if (!isFormField(e.target)) e.preventDefault();
  });
  document.addEventListener('contextmenu', function (e) {
    if (!isFormField(e.target)) e.preventDefault();
  });
})();
