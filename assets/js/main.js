// =====================
// THEME TOGGLE
// =====================
const themeToggle = document.getElementById('theme-toggle');
const body        = document.body;

if (localStorage.getItem('theme') === 'light') {
  body.classList.add('light-mode');
}

themeToggle.addEventListener('click', () => {
  body.classList.toggle('light-mode');
  localStorage.setItem('theme', body.classList.contains('light-mode') ? 'light' : 'dark');
});

// =====================
// SCROLL PROGRESS BAR
// =====================
const progressBar = document.createElement('div');
progressBar.id = 'scroll-progress';
document.body.prepend(progressBar);

window.addEventListener('scroll', () => {
  const scrolled = window.scrollY;
  const total    = document.body.scrollHeight - window.innerHeight;
  progressBar.style.width = (scrolled / total * 100) + '%';
});

// =====================
// CUSTOM CURSOR
// =====================
const cursorDot  = document.getElementById('cursor-dot');
const cursorRing = document.getElementById('cursor-ring');

let cx = 0, cy = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', (e) => {
  cx = e.clientX; cy = e.clientY;
  cursorDot.style.left = cx + 'px';
  cursorDot.style.top  = cy + 'px';
});

// Smooth ring follow
function animateCursor() {
  rx += (cx - rx) * 0.12;
  ry += (cy - ry) * 0.12;
  cursorRing.style.left = rx + 'px';
  cursorRing.style.top  = ry + 'px';
  requestAnimationFrame(animateCursor);
}
animateCursor();

// Hover effects
document.querySelectorAll('a, button, .project-card, .social-btn, .about-tags span').forEach(el => {
  el.addEventListener('mouseenter', () => body.classList.add('cursor-hover'));
  el.addEventListener('mouseleave', () => body.classList.remove('cursor-hover'));
});

// =====================
// NAVBAR SCROLL
// =====================
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// =====================
// MOBILE NAV
// =====================
const hamburger = document.getElementById('hamburger');
const navLinks  = document.querySelector('.nav-links');
hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => navLinks.classList.remove('open'));
});

// =====================
// TYPED TEXT
// =====================
const phrases = [
  "In God we trust. All others must bring data.",
  "Without data, you're just another person with an opinion.",
  "Automate what is repetitive. Analyze what is valuable.",
  "Data is the new oil, but insight is the combustion engine.",
  "Garbage in, garbage out — data quality is everything.",
  "Code is logic. Data is truth.",
  "Measure what matters. Ignore what doesn't.",
  "The goal is not data, but decisions.",
  "AI is only as smart as the data you feed it.",
  "First solve the problem, then optimize the pipeline.",
  "Data tells stories. Analysts give them meaning.",
  "If you can't measure it, you can't improve it.",
  "Behind every dashboard is a messy dataset.",
  "Prediction is hard — especially about the future.",
  "Small data errors lead to big business mistakes."
];

let phraseIndex = 0, charIndex = 0, isDeleting = false;
const typedEl = document.querySelector('.typed-text');

function type() {
  const current = phrases[phraseIndex];
  typedEl.textContent = isDeleting
    ? current.substring(0, charIndex--)
    : current.substring(0, charIndex++);

  let delay = isDeleting ? 40 : 75;
  if (!isDeleting && charIndex === current.length + 1) {
    delay = 2000; isDeleting = true;
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    phraseIndex = (phraseIndex + 1) % phrases.length;
    delay = 400;
  }
  setTimeout(type, delay);
}
type();

// =====================
// CINEMATIC SCROLL
// =====================
const sections = document.querySelectorAll('section:not(#hero)');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      entry.target.classList.remove('out-of-view');
    } else {
      entry.target.classList.remove('in-view');
      entry.target.classList.add('out-of-view');
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

sections.forEach(s => sectionObserver.observe(s));

// =====================
// EMAILJS
// =====================
emailjs.init('YOUR_PUBLIC_KEY'); // 🔴 Replace

const contactForm = document.getElementById('contact-form');
const submitBtn   = document.getElementById('submit-btn');
const btnText     = document.getElementById('btn-text');
const btnSpinner  = document.getElementById('btn-spinner');
const feedback    = document.getElementById('form-feedback');

function showFeedback(msg, type) {
  feedback.innerHTML = `<div class="feedback-${type}">${msg}</div>`;
  setTimeout(() => { feedback.innerHTML = ''; }, 6000);
}

function validateForm() {
  let valid = true;
  const fields = [
    { id: 'name',    msg: 'Please enter your name.' },
    { id: 'email',   msg: 'Please enter a valid email.', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    { id: 'subject', msg: 'Please enter a subject.' },
    { id: 'message', msg: 'Please enter your message.' }
  ];
  fields.forEach(f => {
    const el  = document.getElementById(f.id);
    const err = document.getElementById(f.id + '-error');
    const val = el.value.trim();
    if (!val || (f.pattern && !f.pattern.test(val))) {
      err.textContent = f.msg; el.classList.add('input-error'); valid = false;
    } else {
      err.textContent = ''; el.classList.remove('input-error');
    }
  });
  return valid;
}

['name', 'email', 'subject', 'message'].forEach(id => {
  document.getElementById(id).addEventListener('input', function () {
    document.getElementById(id + '-error').textContent = '';
    this.classList.remove('input-error');
  });
});

contactForm.addEventListener('submit', function (e) {
  e.preventDefault();
  if (!validateForm()) return;
  btnText.style.display    = 'none';
  btnSpinner.style.display = 'inline';
  submitBtn.disabled       = true;

  const serviceID  = 'YOUR_SERVICE_ID';   // 🔴 Replace
  const templateID = 'YOUR_TEMPLATE_ID';  // 🔴 Replace

  emailjs.sendForm(serviceID, templateID, this)
    .then(() => { showFeedback("✅ Message sent! I'll get back to you soon.", 'success'); contactForm.reset(); })
    .catch(err => { console.error(err); showFeedback('❌ Something went wrong. Please email me directly at shantanubiswas5555@gmail.com', 'error'); })
    .finally(() => { btnText.style.display = 'inline'; btnSpinner.style.display = 'none'; submitBtn.disabled = false; });
});