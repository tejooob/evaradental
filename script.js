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
    ['.service-card, .story-card, .feature, .gallery-item', 'item'],
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
    '.service-grid, .story-cards, .feature-list, .gallery-grid'
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

/* ---------- scroll-linked motion ----------
   Three things follow the scroll position itself rather than firing once:
   the hero video drifts (depth), the doctor's statement inks in word by word
   (reading it), and the step rails draw down each process (moving through the
   visit). One rAF-throttled listener drives all of them, and each writes only
   transforms or custom properties that feed transform/opacity. */
safely('scroll-fx', () => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp01 = (v) => Math.min(1, Math.max(0, v));

  // Hero parallax.
  const heroBg = document.querySelector('.hero-bg');

  // Statement: wrap each word so CSS can ink them in reading order. The text
  // reads the same to assistive tech; the wrapping is presentational.
  const statement = document.querySelector('[data-split]');
  if (statement) {
    const words = statement.textContent.trim().split(/\s+/);
    statement.textContent = '';
    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.className = 'word';
      span.style.setProperty('--w', i);
      span.textContent = word;
      statement.append(span, document.createTextNode(' '));
    });
    statement.style.setProperty('--n', words.length);
    statement.dataset.scrub = '';
  }

  // Rails: each step owns one segment and gets --f (0 to 1). A horizontal row
  // of steps shares one reading position, so it is scrubbed as a whole; a
  // vertical list fills each segment as that step passes the reading line.
  const rails = [...document.querySelectorAll('[data-rail]')].map((list) => ({
    list,
    steps: [...list.children],
  }));

  if (!heroBg && !statement && !rails.length) return;

  const setRail = ({ list, steps }, vh) => {
    if (reduce.matches) {
      steps.forEach((s) => { s.style.setProperty('--f', 1); s.classList.add('is-reached'); });
      return;
    }
    const line = vh * 0.62;                       // where the eye rests while reading
    const horizontal = steps.length > 1 && steps[0].offsetTop === steps[1].offsetTop;
    let fills;
    if (horizontal) {
      // Starts as the row comes up the screen and finishes by the time it is
      // in the upper third, where it is actually being read.
      const r = list.getBoundingClientRect();
      const p = clamp01((vh * 0.88 - r.top) / (vh * 0.5));
      fills = steps.map((_, i) => clamp01(p * steps.length - i));
    } else {
      fills = steps.map((s) => {
        const r = s.getBoundingClientRect();
        return clamp01((line - r.top) / Math.max(r.height, 1));
      });
    }
    steps.forEach((s, i) => {
      s.style.setProperty('--f', fills[i].toFixed(3));
      s.classList.toggle('is-reached', fills[i] > 0);
    });
  };

  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = window.innerHeight;

    // Video drifts slower than the page, only while the hero is on screen.
    if (heroBg && !reduce.matches) {
      const y = window.scrollY;
      heroBg.style.transform = y < vh ? `translate3d(0, ${(y * 0.18).toFixed(1)}px, 0)` : '';
    }

    // Fully inked by the time the line reaches the upper third of the screen.
    if (statement) {
      const r = statement.getBoundingClientRect();
      const p = clamp01((vh * 0.9 - r.top) / (vh * 0.55));
      statement.style.setProperty('--sp', p.toFixed(4));
    }

    rails.forEach((rail) => setRail(rail, vh));
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  reduce.addEventListener('change', () => {
    if (heroBg) heroBg.style.transform = '';
    onScroll();
  });
});

/* ---------- FAQ: only one answer open at a time ---------- */
safely('faq', () => {
  const items = [...document.querySelectorAll('.faq-item')];
  if (!items.length) return;
  items.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      items.forEach((other) => { if (other !== item) other.open = false; });
    });
  });
});

/* ---------- hero video ----------
   Browsers autoplay a muted <video> even when the visitor prefers reduced
   motion, so we honour it ourselves: pause and show the poster instead. If the
   video fails to load or decode, the poster already covers it (no action). */
safely('hero-video', () => {
  const video = document.getElementById('heroVideo');
  if (!video) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const apply = () => {
    if (reduce.matches) {
      video.removeAttribute('autoplay');
      video.pause();
    } else if (video.paused) {
      video.play().catch(() => {}); // autoplay may still be blocked; poster stays
    }
  };
  apply();
  reduce.addEventListener('change', apply);
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
