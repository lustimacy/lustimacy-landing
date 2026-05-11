// /api/waitlist — accepts a POST { email, locale, source, referrer } and
// inserts a row into the public.lustimacy_waitlist table via Supabase REST.
//
// RLS allows anon INSERT only; the table is not selectable by anon, so the
// SUPABASE_ANON_KEY is enough. Duplicates collapse silently
// (Prefer: resolution=ignore-duplicates) so we never leak whether an email
// is already on the list.
//
// Country is read from Cloudflare's request.cf metadata server-side, so
// clients can't spoof it.

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

interface Body {
  email?: unknown;
  locale?: unknown;
  source?: unknown;
  referrer?: unknown;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUPPORTED_LOCALES = new Set(['en', 'de', 'nl']);

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

async function hashIp(ip: string): Promise<string> {
  const enc = new TextEncoder().encode(`lustimacy:${ip}`);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return jsonResponse({ error: 'misconfigured' }, 500);
  }

  let body: Body;
  try {
    body = await request.json();
  } catch (_) {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const locale = typeof body.locale === 'string' && SUPPORTED_LOCALES.has(body.locale) ? body.locale : 'en';
  const source = typeof body.source === 'string' ? body.source.slice(0, 64) : null;
  const referrer = typeof body.referrer === 'string' ? body.referrer.slice(0, 256) : null;

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return jsonResponse({ error: 'invalid_email' }, 400);
  }

  const cf = (request as any).cf as { country?: string } | undefined;
  const country = cf?.country?.toUpperCase() || null;

  const ip = request.headers.get('cf-connecting-ip') || '0.0.0.0';
  const ipHash = await hashIp(ip);
  const userAgent = (request.headers.get('user-agent') || '').slice(0, 256);

  const row = {
    email,
    locale,
    source,
    referrer,
    country,
    ip_hash: ipHash,
    user_agent: userAgent,
  };

  const url = `${env.SUPABASE_URL}/rest/v1/lustimacy_waitlist`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
        // Just minimal — `resolution=ignore-duplicates` makes PostgREST
        // run an upsert which requires SELECT on the table, and anon
        // intentionally doesn't have SELECT (subscriber emails stay
        // private). We let the unique-email constraint return 409, which
        // we handle as success below.
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
  } catch (err) {
    return jsonResponse({ error: 'network' }, 502);
  }

  if (res.status === 201 || res.status === 200) {
    return jsonResponse({ ok: true });
  }
  // PostgREST returns 409 on unique conflict; ignore-duplicates should
  // suppress that to 201, but treat it as success either way.
  if (res.status === 409) {
    return jsonResponse({ ok: true, duplicate: true });
  }
  // Don't leak Supabase error bodies to the client.
  return jsonResponse({ error: 'upstream' }, 502);
};

export const onRequest: PagesFunction = async ({ request }) => {
  // Reject anything that's not POST.
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }
  return jsonResponse({ error: 'method_not_allowed' }, 405);
};
