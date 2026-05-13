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

  // --- Country detection ---------------------------------------------------
  // Cloudflare Function /api/country returns { country, locale, available }.
  // We use the result to swap the hero badge if the visitor isn't in DE/NL,
  // so the gating story is concrete and personal.
  async function initCountryBanner() {
    const els = $$('[data-country-text]');
    if (els.length === 0) return;
    try {
      const res = await fetch('/api/country', { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const data = await res.json();
      if (!data || !data.country) return;
      const locale = (document.documentElement.lang || 'en').toLowerCase();
      const messages = {
        en: {
          de: 'Available now in your country (Germany)',
          nl: 'Available now in your country (Netherlands)',
          other: (c) => `Coming to ${c} soon — join the waitlist`,
        },
        de: {
          de: 'Verfügbar in Deutschland — sicher dir deinen Platz',
          nl: 'Verfügbar in den Niederlanden — sicher dir deinen Platz',
          other: (c) => `Bald in ${c} — jetzt auf die Warteliste`,
        },
        nl: {
          de: 'Beschikbaar in Duitsland — reserveer je plek',
          nl: 'Nu beschikbaar in Nederland — reserveer je plek',
          other: (c) => `Binnenkort in ${c} — meld je aan voor de wachtlijst`,
        },
      };
      const m = messages[locale] || messages.en;
      const code = data.country.toUpperCase();
      let text;
      if (code === 'DE') text = m.de;
      else if (code === 'NL') text = m.nl;
      else text = m.other(data.countryName || code);
      els.forEach((el) => (el.textContent = text));
    } catch (err) {
      // silently keep the default badge text
    }
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
    };
    const errGeneric = {
      en: 'Something went wrong. Try again in a moment?',
      de: 'Etwas ist schiefgegangen. Bitte gleich noch einmal versuchen.',
      nl: 'Er ging iets mis. Probeer het zo nog eens.',
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
              source: form.id || 'unknown',
              referrer: document.referrer || '',
            }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json().catch(() => ({}));
          form.classList.add('is-success');
          renderSuccessPanel(form, data);
          track('WaitlistSubmit', { source: form.id || 'unknown', locale });
        } catch (err) {
          if (errorEl) errorEl.textContent = errGeneric[locale] || errGeneric.en;
          form.classList.add('is-error');
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    });
  }

  // Build the referral URL preferring the current locale path
  function buildReferralUrl(code) {
    const path = (document.documentElement.lang || 'en').toLowerCase();
    const prefix = path === 'de' ? '/de/' : path === 'nl' ? '/nl/' : '/';
    return `https://lustimacy.com${prefix}?ref=${encodeURIComponent(code)}`;
  }

  function buildStatusUrl(code) {
    return `https://lustimacy.com/waitlist-status.html?c=${encodeURIComponent(code)}`;
  }

  function renderSuccessPanel(form, data) {
    const panel = form.querySelector('[data-success-panel]');
    if (!panel) return;
    const code = data && data.referral_code;
    const position = data && (data.position != null ? data.position : null);
    const refUrl = code ? buildReferralUrl(code) : '';

    const posEl = panel.querySelector('[data-position]');
    const linkEl = panel.querySelector('[data-share-link]');
    const statusEl = panel.querySelector('[data-status-link]');
    const shareBtn = panel.querySelector('[data-share-btn]');
    const copyBtn = panel.querySelector('[data-copy-btn]');

    if (posEl) posEl.textContent = position != null ? `#${position}` : '—';
    if (linkEl) linkEl.textContent = refUrl || '—';
    if (statusEl && code) statusEl.setAttribute('href', buildStatusUrl(code));

    if (shareBtn) {
      shareBtn.onclick = async () => {
        if (!refUrl) return;
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'Join me on Lustimacy',
              text: 'Lifestyle dating for couples, polycules, and open-minded singles — DE & NL.',
              url: refUrl,
            });
            track('ReferralShared', { method: 'native' });
          } catch (_) { /* user cancelled */ }
        } else {
          // Desktop fallback: copy to clipboard
          copyToClipboard(refUrl);
          shareBtn.dataset.originalText = shareBtn.dataset.originalText || shareBtn.textContent;
          shareBtn.textContent = copyBtn ? (copyBtn.dataset.copiedLabel || 'Copied ✓') : 'Copied ✓';
          setTimeout(() => { shareBtn.textContent = shareBtn.dataset.originalText; }, 2200);
          track('ReferralShared', { method: 'copy_fallback' });
        }
      };
    }
    if (copyBtn) {
      copyBtn.onclick = () => {
        if (!refUrl) return;
        copyToClipboard(refUrl);
        const copied = copyBtn.dataset.copiedLabel || 'Copied ✓';
        const original = copyBtn.dataset.copyLabel || 'Copy';
        copyBtn.textContent = copied;
        copyBtn.classList.add('is-copied');
        setTimeout(() => {
          copyBtn.textContent = original;
          copyBtn.classList.remove('is-copied');
        }, 2200);
      };
    }

    panel.hidden = false;
    // Smoothly scroll the panel into view so the user sees the new content
    setTimeout(() => {
      try { panel.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
    }, 80);
  }

  function copyToClipboard(text) {
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(fallback);
    } else {
      fallback();
    }
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
    initCountryBanner();
    initWaitlistForms();
    initCardStack();
    initScreens();
  });
})();
