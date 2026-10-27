// Lustimacy landing — main.js
// Vanilla, ES2017+. Loaded with `defer`. No frameworks.

(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Plausible event helper. No-op until the script is loaded (Phase 4).
  const track = (name, props = {}) => {
    if (typeof window.plausible === 'function') {
      window.plausible(name, { props });
    }
  };

  // --- Locale highlight + cookie pin ---------------------------------------
  // The user's manual choice persists in a cookie so the middleware respects
  // it on subsequent visits and doesn't auto-redirect by Accept-Language.
  function initLocaleSwitcher() {
    const path = window.location.pathname;
    let active = 'en';
    if (path.startsWith('/de/')) active = 'de';
    else if (path.startsWith('/nl/')) active = 'nl';
    else if (path.startsWith('/fr/')) active = 'fr';
    $$('.nav__locale').forEach((el) => {
      if (el.dataset.locale === active) el.classList.add('is-active');
      el.addEventListener('click', (e) => {
        const target = el.dataset.locale;
        document.cookie = `lustimacy-locale=${target}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
        track('LocaleSwitch', { from: active, to: target });
      });
    });
  }

  // --- Mobile nav ----------------------------------------------------------
  function initNav() {
    const toggle = $('#navToggle');
    const menu = $('#navMenu');
    const nav = $('#nav');
    if (!toggle || !menu || !nav) return;

    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('is-open');
      toggle.classList.toggle('is-active', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    menu.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => {
        menu.classList.remove('is-open');
        toggle.classList.remove('is-active');
        toggle.setAttribute('aria-expanded', 'false');
      })
    );
    document.addEventListener('click', (e) => {
      if (!menu.classList.contains('is-open')) return;
      if (menu.contains(e.target) || toggle.contains(e.target)) return;
      menu.classList.remove('is-open');
      toggle.classList.remove('is-active');
      toggle.setAttribute('aria-expanded', 'false');
    });

    const onScroll = () => {
      nav.classList.toggle('is-scrolled', window.scrollY > 30);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // --- Smooth anchor scroll (account for sticky nav) -----------------------
  function initSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id === '#' || id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        const navH = $('#nav')?.offsetHeight || 0;
        const top = target.getBoundingClientRect().top + window.pageYOffset - navH - 12;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }

  // --- Reveal on scroll ----------------------------------------------------
  function initReveals() {
    const els = $$('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -10% 0px' }
    );
    els.forEach((el) => obs.observe(el));
  }

  // --- Platform CTA --------------------------------------------------------
  // The hero used to swap its badge on country, telling anyone outside DE/NL
  // that Lustimacy was "not open in your country yet". That stopped being true
  // once the app went live on Play worldwide — France alone has more users than
  // DE and NL combined — so geo-gating the message was turning away people who
  // could have installed it there and then.
  //
  // The real constraint is the platform, not the country: there is no iOS build
  // yet. Both buttons now ship to everyone — the iPhone one opens a dialog that
  // says so — and all this does is flip which of the two looks like the
  // obvious one to press.
  function isIOS() {
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/.test(ua)) return true;
    // iPadOS 13+ reports a Mac UA; the touch-point check separates it from a
    // real desktop Mac.
    return /Macintosh/.test(ua) && typeof navigator.maxTouchPoints === 'number'
      && navigator.maxTouchPoints > 1;
  }

  function initPlatformCta() {
    if (!isIOS()) return;
    // The Play button stays on the page: an iPhone owner may well have an
    // Android lying around, or a partner who does, and the dialog points at it
    // too. Demoted, not removed.
    $$('.appstore-btn').forEach((el) => {
      el.classList.remove('btn--ghost');
      el.classList.add('is-primary');
    });
    $$('a.playstore-btn').forEach((el) => {
      el.classList.remove('btn--primary');
      el.classList.add('is-secondary');
    });
  }

  // --- iPhone dialog -------------------------------------------------------
  // Native <dialog>. showModal() gives us the top layer, Escape, focus
  // trapping and an inert background for free.
  //
  // The opening button's data-source is stashed on the form so the submit
  // handler can report which CTA the signup came through — hero or final —
  // now that there is only one form in the document instead of two.
  function initIosDialog() {
    const dlg = $('#iosDialog');
    if (!dlg || typeof dlg.showModal !== 'function') return;
    const form = $('form.waitlist', dlg);

    const close = () => {
      if (dlg.open) dlg.close();
    };

    $$('[data-ios-dialog]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (form) form.dataset.source = btn.dataset.source || 'iphone';
        dlg.showModal();
        track('IosDialogOpen', { source: btn.dataset.source || 'iphone' });
        const input = form && form.querySelector('input[name="email"]');
        // Only focus the field if they have not already signed up in this
        // visit — reopening on the success state should not put a cursor in a
        // box they are done with.
        if (input && !form.classList.contains('is-success')) {
          setTimeout(() => input.focus(), 60);
        }
      });
    });

    $$('[data-ios-dialog-close]', dlg).forEach((btn) =>
      btn.addEventListener('click', close)
    );

    // Click outside the card. The backdrop is part of the dialog's own box, so
    // a click lands on <dialog> itself only when it misses the content.
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) close();
    });
  }

  // --- Waitlist form -------------------------------------------------------
  function initWaitlistForms() {
    const forms = $$('form.waitlist');
    if (forms.length === 0) return;

    const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
    const errEmail = {
      en: "That doesn't look like an email.",
      de: 'Das sieht nicht nach einer gültigen E-Mail aus.',
      nl: 'Dit lijkt geen geldig e-mailadres.',
      fr: "Cela ne ressemble pas à une adresse e-mail.",
    };
    const errGeneric = {
      en: 'Something went wrong. Try again in a moment?',
      de: 'Etwas ist schiefgegangen. Bitte gleich noch einmal versuchen.',
      nl: 'Er ging iets mis. Probeer het zo nog eens.',
      fr: "Quelque chose n'a pas fonctionné. Réessayez dans un instant ?",
    };
    const locale = (document.documentElement.lang || 'en').toLowerCase();

    forms.forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        form.classList.remove('is-error', 'is-success');
        const email = form.querySelector('input[name="email"]')?.value.trim() || '';
        const hp = form.querySelector('input[name="hp"]')?.value.trim() || '';
        const errorEl = form.querySelector('[data-error]');

        if (!isEmail(email)) {
          if (errorEl) errorEl.textContent = errEmail[locale] || errEmail.en;
          form.classList.add('is-error');
          return;
        }
        // Honeypot tripped — silently accept and bail.
        if (hp) {
          form.classList.add('is-success');
          return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        try {
          const res = await fetch('/api/waitlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              locale,
              source: form.dataset.source || form.id || 'unknown',
              referrer: document.referrer || '',
            }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json().catch(() => ({}));
          form.classList.add('is-success');
          renderSuccessPanel(form);
          track('WaitlistSubmit', { source: form.dataset.source || form.id || 'unknown', locale });
        } catch (err) {
          if (errorEl) errorEl.textContent = errGeneric[locale] || errGeneric.en;
          form.classList.add('is-error');
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    });
  }

  // The success panel used to show a queue position and a referral link worth
  // "10 spots". Both were artefacts of a staged pre-launch rollout that no
  // longer exists: there is no queue to move up, and the drip that would have
  // invited people in order was retired. All that is honest now is "we have
  // your address, check your inbox".
  function renderSuccessPanel(form) {
    const panel = form.querySelector('[data-success-panel]');
    if (!panel) return;
    const row = form.querySelector('.waitlist__row');
    if (row) row.hidden = true;
    const hint = form.querySelector('.waitlist__hint');
    if (hint) hint.hidden = true;
    panel.hidden = false;
  }

  // --- Card-stack demo -----------------------------------------------------
  // Lightweight pointer-driven swipe. No gestures library.
  function initCardStack() {
    const stack = $('#cardStack');
    if (!stack) return;
    const cards = $$('.card-stack__card', stack);
    let queue = cards.slice();
    let dragging = null;
    let startX = 0, startY = 0, dx = 0;
    const interactedKey = 'lustimacy_demo_interacted';
    let interacted = false;

    function applyZ() {
      cards.forEach((c) => {
        const idx = queue.indexOf(c);
        if (idx === -1) {
          c.style.display = 'none';
          c.classList.remove('is-leaving-left', 'is-leaving-right');
          c.style.transform = '';
          c.style.opacity = '';
        } else {
          c.style.display = '';
          c.dataset.card = String(idx);
          c.classList.remove('is-leaving-left', 'is-leaving-right');
          c.style.transform = '';
          c.style.opacity = '';
        }
      });
    }
    applyZ();

    function fling(card, direction) {
      card.classList.add(direction === 1 ? 'is-leaving-right' : 'is-leaving-left');
      window.setTimeout(() => {
        const i = queue.indexOf(card);
        if (i !== -1) queue.splice(i, 1);
        // recycle: push to end so the demo loops
        queue.push(card);
        applyZ();
      }, 500);
      if (!interacted) {
        interacted = true;
        try { sessionStorage.setItem(interactedKey, '1'); } catch (_) {}
        track('CardStackInteract', { direction: direction === 1 ? 'like' : 'pass' });
      }
    }

    function getTopCard() {
      return queue[0];
    }

    function onPointerDown(e) {
      const top = getTopCard();
      if (!top || !top.contains(e.target)) return;
      dragging = top;
      startX = e.clientX;
      startY = e.clientY;
      dx = 0;
      top.style.transition = 'none';
      top.setPointerCapture?.(e.pointerId);
    }
    function onPointerMove(e) {
      if (!dragging) return;
      dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const rot = dx / 20;
      dragging.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
    }
    function onPointerUp() {
      if (!dragging) return;
      const card = dragging;
      dragging = null;
      card.style.transition = '';
      const threshold = 80;
      if (dx > threshold) fling(card, 1);
      else if (dx < -threshold) fling(card, -1);
      else card.style.transform = '';
      dx = 0;
    }

    stack.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    // Buttons
    $$('.card-stack__btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const top = getTopCard();
        if (!top) return;
        fling(top, btn.dataset.action === 'like' ? 1 : -1);
      });
    });
  }

  // --- Screens carousel ----------------------------------------------------
  function initScreens() {
    const rail = $('#screensRail');
    if (!rail) return;
    const prev = $('.screens__nav--prev');
    const next = $('.screens__nav--next');
    const step = 280;
    const update = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      prev?.classList.toggle('is-hidden', rail.scrollLeft <= 8);
      next?.classList.toggle('is-hidden', rail.scrollLeft >= max - 8);
    };
    prev?.addEventListener('click', () =>
      rail.scrollBy({ left: -step, behavior: 'smooth' })
    );
    next?.addEventListener('click', () =>
      rail.scrollBy({ left: step, behavior: 'smooth' })
    );
    rail.addEventListener('scroll', update, { passive: true });
    setTimeout(update, 200);
  }

  // --- Run -----------------------------------------------------------------
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(() => {
    initLocaleSwitcher();
    initNav();
    initSmoothAnchors();
    initReveals();
    initPlatformCta();
    initIosDialog();
    initWaitlistForms();
    initCardStack();
    initScreens();
  });
})();
