// Evara Dental Clinic — single-page interactions.
// Everything here enhances a page that already works without JS.

document.body.classList.add('js');

/* ---------- header hairline on scroll ---------- */
const header = document.getElementById('siteHeader');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

/* ---------- mobile menu ---------- */
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

navToggle.addEventListener('click', () => {
  const open = navMenu.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(open));
});

navMenu.addEventListener('click', (e) => {
  if (e.target.closest('a')) {
    navMenu.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  }
});

/* ---------- scroll spy ---------- */
const sections = [...document.querySelectorAll('main section[id]')];
const navLinks = [...document.querySelectorAll('.nav-links a')];

const spy = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const id = entry.target.id;
    navLinks.forEach((a) => a.classList.toggle('active', a.hash === `#${id}`));
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach((s) => spy.observe(s));

/* ---------- subtle section reveals ---------- */
const revealer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      revealer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll(
  '.split-copy, .split-media, .dentist-card, .treatment-card, .feature, .story-card, .contact-copy, .appointment-card'
).forEach((el) => {
  el.classList.add('reveal');
  revealer.observe(el);
});

// Safety net: anything still hidden after load settles becomes visible.
setTimeout(() => {
  document.querySelectorAll('.reveal:not(.in)').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('in');
  });
}, 1200);

/* ---------- doctor photo fallback ---------- */
// Shows the monogram until images/dr-kshitija.jpg exists.
const doctorPhoto = document.getElementById('doctorPhoto');
const doctorPortrait = document.getElementById('doctorPortrait');
doctorPhoto.addEventListener('error', () => {
  doctorPhoto.classList.add('missing');
  doctorPortrait.classList.add('no-photo');
});
if (doctorPhoto.complete && doctorPhoto.naturalWidth === 0) {
  doctorPhoto.classList.add('missing');
  doctorPortrait.classList.add('no-photo');
}

/* ---------- appointment form → WhatsApp ---------- */
const CLINIC_WHATSAPP = '917400177989';
const form = document.getElementById('appointmentForm');
const formError = document.getElementById('formError');

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = form.name.value.trim();
  const phone = form.phone.value.trim();
  const service = form.service.value;
  const date = form.date.value;

  if (!name || !phone) {
    formError.hidden = false;
    (!name ? form.name : form.phone).focus();
    return;
  }
  formError.hidden = true;

  const lines = [
    'Hello Evara Dental Clinic, I would like to request an appointment.',
    '',
    `Name: ${name}`,
    `Phone: ${phone}`,
  ];
  if (service) lines.push(`Service: ${service}`);
  if (date) lines.push(`Preferred date: ${date}`);

  const url = `https://wa.me/${CLINIC_WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`;
  window.open(url, '_blank', 'noopener');
});

/* ---------- footer year ---------- */
document.getElementById('year').textContent = new Date().getFullYear();
