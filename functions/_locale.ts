// Locale resolution for the Lustimacy landing site.
//
// Resolution order: cookie → country ∩ Accept-Language → Accept-Language →
// country → 'en'. Used by the root middleware to redirect / → /fr/, /de/ or
// /nl/ for first-time visitors.
//
// Country was added on 2026-10-27 to close the gap that Accept-Language alone
// cannot: a great many people in France, Germany and the Netherlands run their
// browser in English. Accept-Language reports `en` for them, which is a true
// statement about their browser and a poor guess about the page they want to
// read. France is the largest market and was being served English.
//
// Language still wins over geography wherever it is decisive. A French speaker
// in Amsterdam gets French — Accept-Language describes the person, the IP only
// describes where the device happens to be, and the second is the weaker claim
// of the two. Country is a tiebreaker and a fallback, never an override.

export type Locale = 'en' | 'de' | 'nl' | 'fr';
export const SUPPORTED: readonly Locale[] = ['en', 'de', 'nl', 'fr'] as const;
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'lustimacy-locale';

// Countries where a non-English locale is the better default. Listed in order
// of preference, so a multilingual country can be resolved by Accept-Language
// first and fall back to the larger language group.
//
// Deliberately narrow: only places whose majority language this site actually
// speaks. Everywhere else gets English, which is the honest answer when the
// alternative is a language we have not translated.
const COUNTRY_LOCALES: Record<string, readonly Locale[]> = {
  FR: ['fr'],
  MC: ['fr'],
  BE: ['nl', 'fr'], // Flanders is the larger share; Accept-Language usually settles it
  LU: ['fr', 'de'],
  CH: ['de', 'fr'],
  DE: ['de'],
  AT: ['de'],
  LI: ['de'],
  NL: ['nl'],
  SR: ['nl'],
  AW: ['nl'],
  CW: ['nl'],
  SX: ['nl'],
};

export function isLocale(v: string): v is Locale {
  return (SUPPORTED as readonly string[]).includes(v);
}

export function fromCookie(cookieHeader: string | null): Locale | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === LOCALE_COOKIE) {
      const v = decodeURIComponent(rest.join('='));
      if (isLocale(v)) return v;
    }
  }
  return null;
}

/** Supported locales from Accept-Language, best first. */
export function acceptLanguageRanking(header: string | null): Locale[] {
  if (!header) return [];
  const entries = header.split(',').map((raw) => {
    const [tagPart, ...params] = raw.trim().split(';');
    const tag = tagPart.toLowerCase().split('-')[0];
    let q = 1;
    for (const p of params) {
      const m = p.trim().match(/^q=(.+)$/);
      if (m) {
        const parsed = parseFloat(m[1]);
        if (!Number.isNaN(parsed)) q = parsed;
      }
    }
    return { tag, q };
  });
  // Stable sort by q descending, so equal-q tags keep header order.
  entries.sort((a, b) => b.q - a.q);
  const out: Locale[] = [];
  for (const { tag } of entries) {
    if (isLocale(tag) && !out.includes(tag)) out.push(tag);
  }
  return out;
}

export function fromAcceptLanguage(header: string | null): Locale | null {
  return acceptLanguageRanking(header)[0] ?? null;
}

/**
 * The visitor's country, from Cloudflare.
 *
 * `request.cf` is absent outside Cloudflare's edge — local `wrangler dev`, a
 * plain fetch in a test — so the CF-IPCountry header is read as well. Tor
 * exits report T1/T2 and unknown reports XX; none of those map to anything.
 */
export function countryOf(request: Request): string | null {
  const cf = (request as unknown as { cf?: { country?: string } }).cf;
  const raw = cf?.country || request.headers.get('cf-ipcountry');
  if (!raw) return null;
  const code = raw.toUpperCase();
  if (code === 'XX' || code === 'T1' || code === 'T2') return null;
  return code;
}

export function fromCountry(request: Request): readonly Locale[] {
  const code = countryOf(request);
  if (!code) return [];
  return COUNTRY_LOCALES[code] ?? [];
}

export function pickLocale(request: Request): Locale {
  // An explicit choice from the switcher outranks everything.
  const cookie = fromCookie(request.headers.get('cookie'));
  if (cookie) return cookie;

  const wanted = acceptLanguageRanking(request.headers.get('accept-language'));
  const local = fromCountry(request);

  if (local.length > 0) {
    // Both signals agree on a language this country speaks: Belgian visitor
    // with a French browser gets French, with a Dutch browser gets Dutch.
    for (const l of wanted) {
      if (local.includes(l)) return l;
    }
    // The browser asks for a language we speak that is not local to here —
    // a French speaker in Berlin. Honour the request, it is the stronger
    // signal, but only when it is not the default we would fall back to
    // anyway: `en` here means "browser in English", not "wants English".
    const explicit = wanted.find((l) => l !== DEFAULT_LOCALE);
    if (explicit) return explicit;
    // Browser is English or says nothing useful, and we know where they are.
    return local[0];
  }

  // Country we do not translate for: language preference, then English.
  return wanted[0] ?? DEFAULT_LOCALE;
}

/**
 * Search crawlers are left on "/" in English.
 *
 * Google's own guidance is that geo-redirecting the root can leave a site
 * looking like it has no canonical homepage — the crawler sees whatever the
 * datacentre it came from resolves to. The hreflang cluster already tells it
 * about /de/, /nl/ and /fr/, so a crawler gets more from a stable "/" than
 * from a guess about its IP. The blog is the main organic entry point and is
 * not redirected at all; this protects the one page that is.
 */
const BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|showyoubot|outbrain|pinterest|vkshare|w3c_validator|whatsapp|telegrambot|discordbot|lighthouse|headlesschrome/i;

export function isCrawler(request: Request): boolean {
  const ua = request.headers.get('user-agent');
  return !!ua && BOT_RE.test(ua);
}

export function localePath(locale: Locale): string {
  return locale === 'en' ? '/' : `/${locale}/`;
}
