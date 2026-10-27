// Lustimacy cookie consent — GDPR/ePrivacy + Google Consent Mode v2.
//
// Pairs with the inline gtag block in each <head>, which sets default consent
// to denied for EEA/UK/CH and granted elsewhere. This file:
//   1. Shows a banner for EEA-region visitors without a stored choice.
//   2. Persists their choice in localStorage and calls gtag consent update.
//   3. Exposes window.lustimacyConsent.open() so a footer link can reopen it.
//   4. Injects a discreet "Cookie settings" link as a fallback on any page
//      that doesn't already have a .consent-trigger element.
//
// Banner is only rendered after a country lookup confirms the visitor is in
// a denied-default region (matches the `region` array in the inline gtag
// snippet) — visitors elsewhere already have granted consent and don't need
// the prompt.

(function () {
    'use strict';

    var STORAGE_KEY = 'lustimacy_consent';
    var DENIED_REGIONS = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH'];

    var lang = (document.documentElement.lang || 'en').toLowerCase();
    var copy = {
        en: {
            text: 'We use cookies for ads and conversion measurement so we can reach the right people and learn what works. Plausible analytics runs cookie-free and is always on.',
            accept: 'Accept all',
            reject: 'Reject all',
            more: 'Privacy policy',
            manage: 'Cookie settings',
            dialogLabel: 'Cookie consent'
        },
        de: {
            text: 'Wir verwenden Cookies für Werbung und Conversion-Messung, damit wir die richtigen Menschen erreichen und lernen, was funktioniert. Plausible Analytics läuft cookiefrei und ist immer aktiv.',
            accept: 'Alle akzeptieren',
            reject: 'Alle ablehnen',
            more: 'Datenschutz',
            manage: 'Cookie-Einstellungen',
            dialogLabel: 'Cookie-Zustimmung'
        },
        nl: {
            text: 'We gebruiken cookies voor advertenties en conversiemeting, zodat we de juiste mensen kunnen bereiken en kunnen leren wat werkt. Plausible analytics werkt zonder cookies en staat altijd aan.',
            accept: 'Alles accepteren',
            reject: 'Alles weigeren',
            more: 'Privacybeleid',
            manage: 'Cookievoorkeuren',
            dialogLabel: 'Cookie-toestemming'
        }
    };
    var t = copy[lang] || copy.en;

    function gtag() {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(arguments);
    }

    function applyConsent(granted) {
        var v = granted ? 'granted' : 'denied';
        gtag('consent', 'update', {
            ad_storage: v,
            ad_user_data: v,
            ad_personalization: v,
            analytics_storage: v
        });
        try { localStorage.setItem(STORAGE_KEY, v); } catch (e) { /* private mode */ }
    }

    function removeBanner() {
        var b = document.getElementById('consentBanner');
        if (b && b.parentNode) b.parentNode.removeChild(b);
    }

    function renderBanner() {
        if (document.getElementById('consentBanner')) return;
        var banner = document.createElement('div');
        banner.id = 'consentBanner';
        banner.className = 'consent-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', t.dialogLabel);
        banner.innerHTML =
            '<p class="consent-banner__text">' + t.text +
                ' <a href="/privacy.html" class="consent-banner__more">' + t.more + ' →</a></p>' +
            '<div class="consent-banner__actions">' +
                '<button type="button" class="consent-banner__btn consent-banner__btn--reject" data-consent-action="reject">' + t.reject + '</button>' +
                '<button type="button" class="consent-banner__btn consent-banner__btn--accept" data-consent-action="accept">' + t.accept + '</button>' +
            '</div>';
        document.body.appendChild(banner);
        banner.querySelector('[data-consent-action="accept"]').addEventListener('click', function () {
            applyConsent(true);
            removeBanner();
        });
        banner.querySelector('[data-consent-action="reject"]').addEventListener('click', function () {
            applyConsent(false);
            removeBanner();
        });
    }

    function bindTriggers() {
        var triggers = document.querySelectorAll('.consent-trigger');
        for (var i = 0; i < triggers.length; i++) {
            triggers[i].textContent = t.manage;
            triggers[i].addEventListener('click', function (e) {
                e.preventDefault();
                renderBanner();
            });
        }
        // Fallback: if no .consent-trigger exists on the page, inject a discreet
        // floating link so consent is always revocable (GDPR Art. 7(3)).
        if (triggers.length === 0) {
            var link = document.createElement('button');
            link.type = 'button';
            link.className = 'consent-fab';
            link.textContent = t.manage;
            link.addEventListener('click', renderBanner);
            document.body.appendChild(link);
        }
    }

    // Public API for HTML-side triggers
    window.lustimacyConsent = {
        open: renderBanner,
        accept: function () { applyConsent(true); removeBanner(); },
        reject: function () { applyConsent(false); removeBanner(); }
    };

    function maybeShowBanner() {
        var stored;
        try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) { /* private mode */ }
        if (stored === 'granted' || stored === 'denied') return; // already chose

        // Country gate: only prompt inside denied-default regions. Falls back to
        // showing the banner if /api/country fails (privacy-safer default).
        if (typeof fetch !== 'function') { renderBanner(); return; }
        fetch('/api/country', { headers: { Accept: 'application/json' } })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
                var cc = d && d.country ? String(d.country).toUpperCase() : '';
                if (DENIED_REGIONS.indexOf(cc) !== -1) renderBanner();
            })
            .catch(function () { renderBanner(); });
    }

    function init() {
        bindTriggers();
        maybeShowBanner();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
