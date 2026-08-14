// Evara Dental Clinic — single-page interactions.
// Everything here enhances a page that already works without JS.
//
// Each subsystem is isolated so a failure in one cannot take down the others.
// This matters most for the reveal animations, which hide content until they
// run: if an unrelated error threw first, those sections would stay invisible.

const safely = (name, fn) => {
  try { fn(); } catch (err) { console.error(`[evara] ${name} failed:`, err); }
};

/* ---------- scroll reveals ----------
   Four behaviours, matched to what is being revealed, rather than one
   fade-and-rise on everything. Registered first, and only once the observer
   is wired do we add the `js` class that hides them, so a failure anywhere
   leaves the page fully visible. */
safely('reveals', () => {
  if (!('IntersectionObserver' in window)) return;

  // selector -> behaviour. `item` groups also get a stagger index.
  const BEHAVIOURS = [
    ['.split-media, .why-media', 'media'],
    ['.split-copy, .contact-copy, .section-head', 'copy'],
    ['.dentist-card, .appointment-card, .stories-cta', 'panel'],
    ['.treatment-card, .story-card, .feature, .gallery-item', 'item'],
  ];

  const revealer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      revealer.unobserve(entry.target);
    });
  }, { threshold: 0.1 });

  let found = 0;
  BEHAVIOURS.forEach(([selector, behaviour]) => {
    document.querySelectorAll(selector).forEach((el) => {
      el.dataset.reveal = behaviour;
      revealer.observe(el);
      found++;
    });
  });
  if (!found) return;

  // Stagger runs per row of siblings, not across the whole page, so the last
  // card in any group waits ~350ms at most rather than several seconds.
  document.querySelectorAll(
    '.treatment-cards, .story-cards, .feature-list, .gallery-grid'
  ).forEach((group) => {
    [...group.children].forEach((child, i) => {
      child.style.setProperty('--i', Math.min(i, 5));
    });
  });

  // Only now is it safe to let CSS hide anything.
  document.body.classList.add('js');

  // Failsafe: if the observer never fires (background tab, headless renderer,
  // unusual scroll container), nothing stays hidden for long.
  setTimeout(() => {
    document.querySelectorAll('[data-reveal]:not(.in)').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 1.5) el.classList.add('in');
    });
  }, 1500);
});

/* ---------- header hairline on scroll ---------- */
safely('header', () => {
  const header = document.getElementById('siteHeader');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
});

/* ---------- mobile menu ---------- */
safely('nav', () => {
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  if (!navToggle || !navMenu) return;

  // Stagger indices so the menu rows unfold rather than appearing at once.
  [...navMenu.querySelectorAll('.nav-links li')].forEach((li, i) => {
    li.style.setProperty('--i', i);
  });
  const cta = navMenu.querySelector('.nav-cta');
  if (cta) cta.style.setProperty('--i', navMenu.querySelectorAll('.nav-links li').length);

  const srLabel = navToggle.querySelector('.sr-only');
  const setOpen = (open) => {
    navMenu.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    if (srLabel) srLabel.textContent = open ? 'Close menu' : 'Open menu';
  };

  navToggle.addEventListener('click', () => {
    setOpen(!navMenu.classList.contains('open'));
  });

  navMenu.addEventListener('click', (e) => {
    if (!e.target.closest('a')) return;
    setOpen(false);
  });

  // Escape closes the menu and returns focus to the control that opened it.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !navMenu.classList.contains('open')) return;
    setOpen(false);
    navToggle.focus();
  });
});

/* ---------- scroll spy ---------- */
safely('scrollspy', () => {
  const sections = [...document.querySelectorAll('main section[id]')];
  const navLinks = [...document.querySelectorAll('.nav-links a')];
  if (!sections.length || !('IntersectionObserver' in window)) return;

  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('active', a.hash === `#${entry.target.id}`));
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach((s) => spy.observe(s));
});

/* ---------- doctor photo fallback ----------
   The markup ships with no `src`, so there is no failed request. This only
   matters once a real photo is added and then fails to load. */
safely('portrait', () => {
  const photo = document.getElementById('doctorPhoto');
  const portrait = document.getElementById('doctorPortrait');
  if (!photo || !portrait || !photo.getAttribute('src')) return;

  const fallBack = () => portrait.classList.add('no-photo');
  photo.addEventListener('error', fallBack);
  if (photo.complete && photo.naturalWidth === 0) fallBack();
});

/* ---------- appointment form → WhatsApp ---------- */
safely('form', () => {
  const CLINIC_WHATSAPP = '917400177989';
  const form = document.getElementById('appointmentForm');
  const formError = document.getElementById('formError');
  if (!form) return;

  const fields = {
    name: form.elements.namedItem('name'),
    phone: form.elements.namedItem('phone'),
    service: form.elements.namedItem('service'),
    date: form.elements.namedItem('date'),
  };

  // Clear the error state as soon as the visitor starts correcting it.
  [fields.name, fields.phone].forEach((el) => {
    el.addEventListener('input', () => {
      if (el.value.trim()) el.removeAttribute('aria-invalid');
    });
  });

  // "2026-08-01" reads badly in a message; send "1 August 2026".
  const readableDate = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return iso;
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = fields.name.value.trim();
    const phone = fields.phone.value.trim();

    const missing = [!name && fields.name, !phone && fields.phone].filter(Boolean);
    missing.forEach((el) => el.setAttribute('aria-invalid', 'true'));

    if (missing.length) {
      if (formError) formError.hidden = false;
      // Re-trigger the shake even on a repeat submit of the same empty field.
      missing.forEach((el) => {
        const wrap = el.closest('.form-field');
        if (!wrap) return;
        wrap.classList.remove('shake');
        void wrap.offsetWidth;
        wrap.classList.add('shake');
        wrap.addEventListener('animationend', () => wrap.classList.remove('shake'), { once: true });
      });
      missing[0].focus();
      return;
    }
    if (formError) formError.hidden = true;

    const lines = [
      'Hello Evara Dental Clinic, I would like to request an appointment.',
      '',
      `Name: ${name}`,
      `Phone: ${phone}`,
    ];
    if (fields.service.value) lines.push(`Service: ${fields.service.value}`);
    if (fields.date.value) lines.push(`Preferred date: ${readableDate(fields.date.value)}`);

    const url = `https://wa.me/${CLINIC_WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`;

    // The result of this action happens in another tab, so acknowledge it here
    // or the click appears to have done nothing.
    const submit = form.querySelector('button[type="submit"]');
    const label = submit && submit.querySelector('.btn-label');
    if (label) {
      const original = label.textContent;
      submit.classList.add('is-sending');
      label.textContent = 'Opening WhatsApp…';
      setTimeout(() => {
        submit.classList.remove('is-sending');
        label.textContent = original;
      }, 2200);
    }

    window.open(url, '_blank', 'noopener');
  });
});

/* ---------- footer year ---------- */
safely('year', () => {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
});
