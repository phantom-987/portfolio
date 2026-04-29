/**
 * interactions.js
 * DOM-level interactive features for Shantanu Biswas portfolio
 *
 * Features:
 *  3. Hero name — 3D tilt + animated gradient on cursor move
 *  4. Magnetic buttons — drift toward cursor + glow + ripple on click
 */

(function () {
  'use strict';

  const lerp = (a, b, t) => a + (b - a) * t;

  // ─────────────────────────────────────────────
  // HERO NAME — 3D TILT + GRADIENT (feature 3)
  // ─────────────────────────────────────────────
  (function heroTilt() {
    const heroName = document.getElementById('hero-name');
    if (!heroName) return;

    let tx = 0, ty = 0;   // target rotation
    let cx = 0, cy = 0;   // current rotation (lerped)
    let gx = 50;          // gradient x %

    function onMove(mx, my) {
      // Normalise to -1..1 relative to viewport centre
      const nx = (mx / window.innerWidth  - 0.5) * 2;
      const ny = (my / window.innerHeight - 0.5) * 2;

      tx = ny * -8;          // tilt up/down max ±8°
      ty = nx *  6;          // tilt left/right max ±6°
      gx = ((nx + 1) / 2) * 100;  // gradient follows cursor
    }

    window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
    window.addEventListener('touchmove', e => onMove(
      e.touches[0].clientX, e.touches[0].clientY
    ), { passive: true });

    // On mouse-leave hero section, ease back to zero
    const heroSection = document.getElementById('hero');
    if (heroSection) {
      heroSection.addEventListener('mouseleave', () => { tx = 0; ty = 0; gx = 50; });
    }

    function tick() {
      requestAnimationFrame(tick);
      cx = lerp(cx, tx, 0.07);
      cy = lerp(cy, ty, 0.07);

      heroName.style.transform =
        `perspective(600px) rotateX(${cx}deg) rotateY(${cy}deg)`;

      // Animated gradient shift
      heroName.style.backgroundImage =
        `linear-gradient(135deg,
          #ffffff          ${gx - 40}%,
          var(--accent2)   ${gx}%,
          var(--accent)    ${gx + 40}%)`;
      heroName.style.webkitBackgroundClip = 'text';
      heroName.style.webkitTextFillColor  = 'transparent';
      heroName.style.backgroundClip       = 'text';
    }
    tick();
  })();

  // ─────────────────────────────────────────────
  // MAGNETIC BUTTONS (feature 4)
  // ─────────────────────────────────────────────
  (function magneticButtons() {

    // Ripple helper
    function addRipple(el, x, y) {
      const rect   = el.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size   = Math.max(rect.width, rect.height) * 1.6;

      ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        width: ${size}px; height: ${size}px;
        left: ${x - rect.left - size / 2}px;
        top:  ${y - rect.top  - size / 2}px;
        background: rgba(255,255,255,0.18);
        transform: scale(0);
        animation: ripple-expand 0.55s ease-out forwards;
        pointer-events: none;
        z-index: 10;
      `;
      el.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    }

    // Apply to all .btn elements
    const buttons = document.querySelectorAll('.btn, .social-btn, .theme-toggle');

    buttons.forEach(btn => {
      // Ensure position:relative for ripple containment
      if (getComputedStyle(btn).position === 'static') {
        btn.style.position = 'relative';
      }
      btn.style.overflow = 'hidden';

      let bx = 0, by = 0;         // current translate offset
      let targetBx = 0, targetBy = 0;
      let rafId = null;
      const STRENGTH = 0.32;      // magnetic pull strength

      function animBtn() {
        bx = lerp(bx, targetBx, 0.14);
        by = lerp(by, targetBy, 0.14);
        btn.style.transform = `translate(${bx}px, ${by}px)`;
        if (Math.abs(targetBx - bx) > 0.05 || Math.abs(targetBy - by) > 0.05) {
          rafId = requestAnimationFrame(animBtn);
        } else {
          // Snap to final
          btn.style.transform = `translate(${targetBx}px, ${targetBy}px)`;
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }

      btn.addEventListener('mousemove', e => {
        const rect = btn.getBoundingClientRect();
        const cx   = rect.left + rect.width  / 2;
        const cy   = rect.top  + rect.height / 2;
        targetBx   = (e.clientX - cx) * STRENGTH;
        targetBy   = (e.clientY - cy) * STRENGTH;
        btn.style.boxShadow = '0 0 28px rgba(108,99,255,0.45)';
        if (!rafId) rafId = requestAnimationFrame(animBtn);
      });

      btn.addEventListener('mouseleave', () => {
        targetBx = 0; targetBy = 0;
        btn.style.boxShadow = '';
        if (!rafId) rafId = requestAnimationFrame(animBtn);
      });

      btn.addEventListener('click', e => {
        addRipple(btn, e.clientX, e.clientY);
      });
    });
  })();

  // ─────────────────────────────────────────────
  // RE-APPLY TO LATE-RENDERED ELEMENTS
  // ─────────────────────────────────────────────
  // In case new buttons appear via JS after load
  window.addEventListener('load', () => {
    document.querySelectorAll('.btn, .social-btn').forEach(btn => {
      if (!btn.dataset.magneticReady) {
        btn.dataset.magneticReady = '1';
        // (The logic above already ran — this is a guard for future dynamic elements)
      }
    });
  });

})();