import { pickLocale, localePath, DEFAULT_LOCALE } from './_locale';

// Pages global middleware.
// On a fresh visit to "/" we redirect to the right locale (DE/NL) if the
// visitor's Accept-Language matches and they haven't manually picked yet.
// All other paths pass through untouched — including /api/*, /p/*, /user/*,
// /couple/*, /de/*, /nl/*, and static files.

const PASSTHROUGH_PREFIXES = [
  '/api/',
  '/p/',
  '/user/',
  '/couple/',
  '/de/',
  '/nl/',
  '/assets/',
  '/css/',
  '/js/',
  '/.well-known/',
];

export const onRequest: PagesFunction = async (context) => {
  const { request, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Only operate on the root request (or "/index.html").
  if (path !== '/' && path !== '/index.html') {
    return next();
  }
  for (const prefix of PASSTHROUGH_PREFIXES) {
    if (path.startsWith(prefix)) return next();
  }

  const locale = pickLocale(request);
  if (locale !== DEFAULT_LOCALE) {
    const dest = new URL(localePath(locale), url);
    dest.search = url.search;
    return Response.redirect(dest.toString(), 302);
  }
  return next();
};
