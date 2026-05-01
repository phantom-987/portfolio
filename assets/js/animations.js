/**
 * animations.js
 * Handles: scroll reveal, skill bar animation, section entrance effects
 */
(function () {
  'use strict';

  // ── SCROLL REVEAL ────────────────────────────
  const revealEls = document.querySelectorAll('.reveal');

  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach(el => revealObs.observe(el));

  // ── SKILL BARS ───────────────────────────────
  const skillObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.querySelectorAll('.si-fill').forEach(fill => {
          fill.style.width = fill.dataset.w + '%';
        });
      }
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('.skill-group').forEach(g => skillObs.observe(g));

  // ── STAT COUNTER ANIMATION ───────────────────
  function animateCounter(el, target, suffix, duration) {
    const isFloat = target % 1 !== 0;
    const start   = performance.now();
    function step(now) {
      const t   = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const val  = isFloat
        ? (target * ease).toFixed(2)
        : Math.round(target * ease);
      el.textContent = val + suffix;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const statObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const numEl  = e.target.querySelector('.stat-num');
      if (!numEl || numEl.dataset.animated) return;
      numEl.dataset.animated = '1';

      const raw    = numEl.textContent.trim();
      const num    = parseFloat(raw);
      const suffix = raw.replace(/[\d.]/g, ''); // e.g. '%', '+', ''
      animateCounter(numEl, num, suffix, 1200);
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.stat-card').forEach(c => statObs.observe(c));

  // ── PROJECT CARD MOUSE GLOW ──────────────────
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((e.clientX - r.left) / r.width  * 100) + '%');
      card.style.setProperty('--my', ((e.clientY - r.top)  / r.height * 100) + '%');
    });
  });

  // ── SECTION PARALLAX (subtle background shift) ──
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const sy = window.scrollY;
      // Subtle parallax offset on hero earth rings
      const rings = document.querySelectorAll('.earth-ring');
      rings.forEach((r, i) => {
        r.style.transform = `rotate(${sy * (i === 0 ? 0.03 : 0.015)}deg)`;
      });
      ticking = false;
    });
  });

})();