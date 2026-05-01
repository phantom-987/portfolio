/**
 * main.js — Navbar, typed text, scroll progress, astronaut guide, contact form
 */
(function () {
  'use strict';

  // ── SCROLL PROGRESS BAR ──────────────────────
  const scrollBar = document.getElementById('scroll-bar');
  window.addEventListener('scroll', () => {
    const total = document.body.scrollHeight - window.innerHeight;
    if (scrollBar) scrollBar.style.width = (window.scrollY / total * 100) + '%';
  });

  // ── NAVBAR ───────────────────────────────────
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  const ham = document.getElementById('ham');
  const navLinks = document.querySelector('.nav-links');
  if (ham && navLinks) {
    ham.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      ham.classList.toggle('open');
    });
    document.querySelectorAll('.nav-links a').forEach(a => {
      a.addEventListener('click', () => {
        navLinks.classList.remove('open');
        ham.classList.remove('open');
      });
    });
  }

  // ── TYPED TEXT ───────────────────────────────
  const phrases = [
    'In God we trust. All others must bring data.',
    'Without data, you\'re just another person with an opinion.',
    'Data is the new oil — insight is the combustion engine.',
    'Garbage in, garbage out. Data quality is everything.',
    'Measure what matters. Ignore what doesn\'t.',
    'The goal is not data, but decisions.',
    'Behind every dashboard is a messy dataset.',
    'Data tells stories. Analysts give them meaning.',
    'If you can\'t measure it, you can\'t improve it.',
    'Small data errors lead to big business mistakes.',
  ];
  let phraseIdx = 0, charIdx = 0, deleting = false;
  const typedEl = document.getElementById('typed-text');
  function type() {
    if (!typedEl) return;
    const cur = phrases[phraseIdx];
    typedEl.textContent = deleting ? cur.substring(0, charIdx--) : cur.substring(0, charIdx++);
    let delay = deleting ? 45 : 85;
    if (!deleting && charIdx === cur.length + 1) { delay = 2200; deleting = true; }
    else if (deleting && charIdx === 0) { deleting = false; phraseIdx = (phraseIdx + 1) % phrases.length; delay = 450; }
    setTimeout(type, delay);
  }
  type();

  // ── ASTRONAUT GUIDE ──────────────────────────
  const astro = document.getElementById('astronaut');
  const bubble = document.getElementById('bubble');

  if (astro && bubble) {
    const sectionData = [
      { id: 'hero',     msg: "Hey there! 👋 I'm Shantanu's guide!",           pos: () => ({ left: window.innerWidth - 145, top: window.innerHeight * 0.55 }) },
      { id: 'about',    msg: "💼 Data analyst & full-stack builder!",           pos: () => ({ left: window.innerWidth - 145, top: window.innerHeight * 0.45 }) },
      { id: 'projects', msg: "🚀 Swipe through his projects →",                pos: () => ({ left: 40, top: window.innerHeight * 0.60 }) },
      { id: 'skills',   msg: "⚡ Python, SQL, Power BI & more!",               pos: () => ({ left: window.innerWidth - 145, top: window.innerHeight * 0.50 }) },
      { id: 'contact',  msg: "📬 He's open to opportunities!",                 pos: () => ({ left: window.innerWidth / 2 - 44, top: window.innerHeight * 0.75 }) },
    ];

    let currentIdx = 0;
    let bubbleTimer = null;

    // Place without transition on load
    astro.style.transition = 'none';
    const init = sectionData[0].pos();
    astro.style.left = init.left + 'px';
    astro.style.top  = init.top  + 'px';
    astro.style.opacity = '1';

    requestAnimationFrame(() => requestAnimationFrame(() => {
      astro.style.transition = 'left 1.1s cubic-bezier(.4,0,.2,1), top 1.1s cubic-bezier(.4,0,.2,1), opacity 0.5s';
    }));

    function showBubble(msg) {
      clearTimeout(bubbleTimer);
      bubble.textContent = msg;
      bubble.classList.add('show');
      bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 3800);
    }

    function moveTo(idx) {
      const sd = sectionData[idx];
      const p = sd.pos();
      astro.style.left = p.left + 'px';
      astro.style.top  = p.top  + 'px';
      showBubble(sd.msg);
    }

    setTimeout(() => showBubble(sectionData[0].msg), 1400);

    function getActiveSection() {
      let best = 0, bestRatio = 0;
      sectionData.forEach((sd, i) => {
        const el = document.getElementById(sd.id);
        if (!el) return;
        const r = el.getBoundingClientRect();
        const vis = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
        const ratio = vis / window.innerHeight;
        if (ratio > bestRatio) { bestRatio = ratio; best = i; }
      });
      return best;
    }

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const idx = getActiveSection();
        if (idx !== currentIdx) { currentIdx = idx; moveTo(currentIdx); }
        ticking = false;
      });
    });

    window.addEventListener('resize', () => {
      const p = sectionData[currentIdx].pos();
      astro.style.left = p.left + 'px';
      astro.style.top  = p.top  + 'px';
    });
  }

  // ── CONTACT FORM ─────────────────────────────
  const contactForm = document.getElementById('contact-form');
  const submitBtn   = document.getElementById('submit-btn');
  const btnText     = document.getElementById('btn-text');

  if (contactForm) {
    if (typeof emailjs !== 'undefined') emailjs.init('iA6oLRlC16jB7mijY');

    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (submitBtn) submitBtn.disabled = true;
      if (btnText) btnText.textContent = 'Sending…';

      if (typeof emailjs !== 'undefined') {
        emailjs.sendForm('service_3nodu52', 'template_16bcr62', this)
          .then(() => {
            if (btnText) btnText.textContent = '✓ Sent!';
            contactForm.reset();
            setTimeout(() => { if (btnText) btnText.textContent = 'Send Message'; if (submitBtn) submitBtn.disabled = false; }, 3000);
          })
          .catch(err => {
            console.error(err);
            if (btnText) btnText.textContent = 'Send Message';
            if (submitBtn) submitBtn.disabled = false;
            alert('Something went wrong. Email: shantanubiswas5555@gmail.com');
          });
      } else {
        setTimeout(() => {
          if (btnText) btnText.textContent = 'Send Message';
          if (submitBtn) submitBtn.disabled = false;
        }, 1000);
      }
    });
  }

})();