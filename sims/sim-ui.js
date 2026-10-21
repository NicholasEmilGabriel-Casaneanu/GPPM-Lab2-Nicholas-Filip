/* ============================================
   Sim UI helpers — shared across all sims
   ============================================ */

window.SimUI = (function () {
  'use strict';

  /**
   * Ease a numeric value from a to b over duration ms.
   * Calls onUpdate with the eased value at each animation frame.
   * Returns a handle with .cancel().
   */
  function tween(a, b, duration, onUpdate, onComplete) {
    const start = performance.now();
    let raf = null;
    let cancelled = false;

    const step = (now) => {
      if (cancelled) return;
      const t = Math.min(1, (now - start) / duration);
      // easeInOutCubic
      const eased = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
      onUpdate(a + (b - a) * eased, t);
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else if (onComplete) {
        onComplete();
      }
    };
    raf = requestAnimationFrame(step);

    return {
      cancel() {
        cancelled = true;
        if (raf) cancelAnimationFrame(raf);
      },
    };
  }

  /**
   * Ease a rectangle (for camera zoom/pan).
   * Rect = { x, y, w, h } — a numeric box.
   */
  function tweenRect(from, to, duration, onUpdate, onComplete) {
    const start = performance.now();
    let raf = null;
    let cancelled = false;

    const step = (now) => {
      if (cancelled) return;
      const t = Math.min(1, (now - start) / duration);
      const eased = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const current = {
        x: from.x + (to.x - from.x) * eased,
        y: from.y + (to.y - from.y) * eased,
        w: from.w + (to.w - from.w) * eased,
        h: from.h + (to.h - from.h) * eased,
      };
      onUpdate(current, t);
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else if (onComplete) {
        onComplete();
      }
    };
    raf = requestAnimationFrame(step);
    return {
      cancel() {
        cancelled = true;
        if (raf) cancelAnimationFrame(raf);
      },
    };
  }

  /**
   * Colour palettes for fractal-style sims.
   * Each function maps t in [0,1] to [r,g,b].
   */
  const palettes = {
    classic: (t) => {
      // Smooth blue → orange gradient
      const r = Math.round(9 * (1 - t) * t * t * t * 255);
      const g = Math.round(15 * (1 - t) * (1 - t) * t * t * 255);
      const b = Math.round(8.5 * (1 - t) * (1 - t) * (1 - t) * t * 255);
      return [r, g, b];
    },
    fire: (t) => {
      const r = Math.round(255 * Math.min(1, 2.2 * t));
      const g = Math.round(255 * Math.max(0, Math.min(1, 2.2 * t - 0.6)));
      const b = Math.round(255 * Math.max(0, Math.min(1, 3 * t - 1.6)));
      return [r, g, b];
    },
    ice: (t) => {
      const r = Math.round(255 * Math.max(0, Math.min(1, 2 * t - 0.8)));
      const g = Math.round(255 * Math.max(0, Math.min(1, 1.5 * t)));
      const b = Math.round(255 * Math.min(1, 1.5 * t + 0.3));
      return [r, g, b];
    },
    greyscale: (t) => {
      const v = Math.round(255 * t);
      return [v, v, v];
    },
  };

  /**
   * Rotate through a list of tip strings, showing one at a time.
   * Auto-advances every `intervalMs`. Returns an object with .next() and .stop().
   */
  function tips(el, messages, intervalMs = 8000) {
    if (!el || !messages.length) {
      return { next() {}, stop() {} };
    }
    let idx = 0;
    const show = () => {
      el.innerHTML = messages[idx];
      el.classList.remove('hidden');
    };
    show();
    const handle = setInterval(() => {
      idx = (idx + 1) % messages.length;
      show();
    }, intervalMs);
    return {
      next() {
        idx = (idx + 1) % messages.length;
        show();
      },
      stop() {
        clearInterval(handle);
      },
    };
  }

  /**
   * Format a big/small number compactly.
   */
  function fmt(n, decimals = 4) {
    if (!isFinite(n)) return '∞';
    if (Math.abs(n) < 1e-4 && n !== 0) return n.toExponential(2);
    if (Math.abs(n) > 1e6) return n.toExponential(2);
    return n.toFixed(decimals);
  }

  return { tween, tweenRect, palettes, tips, fmt };
})();