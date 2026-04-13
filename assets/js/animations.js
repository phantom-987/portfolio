(function () {
  gsap.registerPlugin(ScrollTrigger);

  gsap.to('.hero-content', { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', delay: 0.3 });
  gsap.from('.hero-greeting', { y: 30, opacity: 0, duration: 0.8, delay: 0.5 });
  gsap.from('#hero-name',     { y: 40, opacity: 0, duration: 0.9, delay: 0.7 });
  gsap.from('#hero-title',    { y: 30, opacity: 0, duration: 0.8, delay: 0.9 });
  gsap.from('.hero-desc',     { y: 20, opacity: 0, duration: 0.8, delay: 1.1 });
  gsap.from('.hero-btns',     { y: 20, opacity: 0, duration: 0.8, delay: 1.3 });

  document.getElementById('hero').classList.add('in-view');

  gsap.from('.about-text', {
    scrollTrigger: { trigger: '#about', start: 'top 75%' },
    x: -50, opacity: 0, duration: 0.9, ease: 'power2.out'
  });
  gsap.from('.skills-panel', {
    scrollTrigger: { trigger: '#about', start: 'top 75%' },
    x: 50, opacity: 0, duration: 0.9, ease: 'power2.out'
  });

  ScrollTrigger.create({
    trigger: '.skill-bars', start: 'top 80%',
    onEnter: () => {
      document.querySelectorAll('.skill-fill').forEach(el => {
        el.style.width = el.dataset.width + '%';
      });
    }
  });

  gsap.from('.project-card', {
    scrollTrigger: { trigger: '#projects', start: 'top 75%' },
    y: 50, opacity: 0, duration: 0.7, ease: 'power2.out', stagger: 0.15
  });

  gsap.from('.contact-info', {
    scrollTrigger: { trigger: '#contact', start: 'top 80%' },
    x: -40, opacity: 0, duration: 0.8
  });
  gsap.from('.contact-form', {
    scrollTrigger: { trigger: '#contact', start: 'top 80%' },
    x: 40, opacity: 0, duration: 0.8
  });

})();