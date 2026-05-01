/**
 * interactions.js
 * Handles: custom cursor, magnetic buttons, hero name 3D tilt, ripple on click
 */
(function () {
  'use strict';

  const lerp = (a, b, t) => a + (b - a) * t;

  // ── CUSTOM CURSOR ────────────────────────────
  const dot  = document.getElementById('cur-dot');
  const ring = document.getElementById('cur-ring');
  let cx = 0, cy = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', e => {
    cx = e.clientX; cy = e.clientY;
    dot.style.left = cx + 'px';
    dot.style.top  = cy + 'px';
  });

  (function animRing() {
    rx += (cx - rx) * 0.12;
    ry += (cy - ry) * 0.12;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(animRing);
  })();

  // Hover expand
  document.querySelectorAll('a, button, .project-card, .stat-card, .skill-group, .skill-tag').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('hovered'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('hovered'));
  });

  // ── HERO NAME 3D TILT ────────────────────────
  const heroName = document.getElementById('hero-name');
  if (heroName) {
    let hx = 0, hy = 0, thx = 0, thy = 0;

    document.addEventListener('mousemove', e => {
      thx = (e.clientY / window.innerHeight - 0.5) * -10;
      thy = (e.clientX / window.innerWidth  - 0.5) *  8;
    });

    const heroSec = document.getElementById('hero');
    if (heroSec) heroSec.addEventListener('mouseleave', () => { thx = 0; thy = 0; });

    (function tiltLoop() {
      hx += (thx - hx) * 0.07;
      hy += (thy - hy) * 0.07;
      heroName.style.transform = `perspective(700px) rotateX(${hx}deg) rotateY(${hy}deg)`;
      requestAnimationFrame(tiltLoop);
    })();
  }

  // ── MAGNETIC BUTTONS ─────────────────────────
  function addMagnet(el) {
    el.style.position = 'relative';
    el.style.overflow = 'hidden';

    let bx = 0, by = 0, tbx = 0, tby = 0, raf = null;

    function anim() {
      bx += (tbx - bx) * 0.14;
      by += (tby - by) * 0.14;
      el.style.transform = `translate(${bx}px, ${by}px)`;
      if (Math.abs(tbx - bx) > 0.05 || Math.abs(tby - by) > 0.05) {
        raf = requestAnimationFrame(anim);
      } else {
        el.style.transform = `translate(${tbx}px, ${tby}px)`;
        raf = null;
      }
    }

    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      tbx = (e.clientX - r.left - r.width  / 2) * 0.28;
      tby = (e.clientY - r.top  - r.height / 2) * 0.28;
      if (!raf) raf = requestAnimationFrame(anim);
    });

    el.addEventListener('mouseleave', () => {
      tbx = 0; tby = 0;
      if (!raf) raf = requestAnimationFrame(anim);
    });

    // Ripple on click
    el.addEventListener('click', e => {
      const r    = el.getBoundingClientRect();
      const rip  = document.createElement('span');
      const sz   = Math.max(r.width, r.height) * 1.5;
      rip.style.cssText = `
        position:absolute;border-radius:50%;
        width:${sz}px;height:${sz}px;
        left:${e.clientX - r.left - sz/2}px;
        top:${e.clientY - r.top  - sz/2}px;
        background:rgba(255,255,255,0.15);
        transform:scale(0);
        animation:ripple-exp .55s ease-out forwards;
        pointer-events:none;z-index:10;
      `;
      el.appendChild(rip);
      rip.addEventListener('animationend', () => rip.remove());
    });
  }

  document.querySelectorAll('.btn, .nav-cta, .form-submit, .btn-primary, .btn-secondary').forEach(addMagnet);

  // ── SKILL TAG HOVER WAVE ─────────────────────
  document.querySelectorAll('.skill-tag').forEach((tag, i) => {
    tag.addEventListener('mouseenter', () => {
      tag.style.transitionDelay = '0ms';
      tag.style.transform = 'translateY(-3px) scale(1.05)';
    });
    tag.addEventListener('mouseleave', () => {
      tag.style.transform = '';
    });
  });

})();