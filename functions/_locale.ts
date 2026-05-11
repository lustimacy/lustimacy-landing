// Locale resolution for the Lustimacy landing site.
// Resolution order: cookie → Accept-Language → 'en'.
// Used by the root middleware to redirect / → /de/ or /nl/ for first-time
// visitors whose Accept-Language matches a supported non-default locale.

export type Locale = 'en' | 'de' | 'nl';
export const SUPPORTED: readonly Locale[] = ['en', 'de', 'nl'] as const;
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'lustimacy-locale';

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

export function fromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
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
  entries.sort((a, b) => b.q - a.q);
  for (const { tag } of entries) {
    if (isLocale(tag)) return tag;
  }
  return null;
}

export function pickLocale(request: Request): Locale {
  const cookie = fromCookie(request.headers.get('cookie'));
  if (cookie) return cookie;
  const al = fromAcceptLanguage(request.headers.get('accept-language'));
  if (al) return al;
  return DEFAULT_LOCALE;
}

export function localePath(locale: Locale): string {
  return locale === 'en' ? '/' : `/${locale}/`;
}
