import { pickLocale, localePath, isCrawler, DEFAULT_LOCALE } from './_locale';

// Pages global middleware.
// On a fresh visit to "/" we redirect to the right locale (FR/DE/NL) based on
// the visitor's Accept-Language and the country Cloudflare resolved from their
// IP, unless they have already picked one from the switcher. All other paths
// pass through untouched — including /api/*, /p/*, /user/*, /couple/*, /fr/*,
// /de/*, /nl/*, and static files. Deep links are never redirected: a shared
// /blog/ URL has to land where it was shared from.

const PASSTHROUGH_PREFIXES = [
  '/api/',
  '/p/',
  '/user/',
  '/couple/',
  '/de/',
  '/nl/',
  '/fr/',
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

  // Crawlers stay on the English root — see isCrawler().
  const locale = isCrawler(request) ? DEFAULT_LOCALE : pickLocale(request);
  if (locale !== DEFAULT_LOCALE) {
    const dest = new URL(localePath(locale), url);
    dest.search = url.search;
    // Built by hand rather than with Response.redirect so the headers can go
    // on. Without them a shared cache can serve one visitor's redirect to the
    // next: this response now varies by country as well as by language, and
    // the two together make "/" effectively per-visitor.
    return new Response(null, {
      status: 302,
      headers: {
        Location: dest.toString(),
        'Cache-Control': 'no-store',
        Vary: 'Accept-Language, CF-IPCountry',
      },
    });
  }
  // Serving "/" in English is also a decision about this visitor, so a shared
  // cache has to key on the same two inputs or it will pin the first visitor's
  // country onto everyone behind it. Only Vary is set — Pages already serves
  // HTML with a revalidating Cache-Control, and no-store here would throw away
  // the caching of the heaviest page on the site for no gain.
  const response = await next();
  const out = new Response(response.body, response);
  out.headers.set('Vary', 'Accept-Language, CF-IPCountry');
  return out;
};
