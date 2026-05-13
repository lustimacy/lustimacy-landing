// /api/unsubscribe?e=<email>
//
// Soft-unsubscribe: sets email_sequence_index to 99 (out of range) on the
// waitlist row so the drip cron skips it, AND records unsubscribed_at.
// Returns a small HTML confirmation page.
//
// Uses an RPC (unsubscribe_waitlist) to keep the table SELECT-locked from
// anon. The RPC is SECURITY DEFINER and accepts the email as a parameter.

interface Env {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function pageHtml(message: string, ok = true): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lustimacy — ${ok ? "Unsubscribed" : "Error"}</title>
<style>
  body { margin:0; padding:0; background:#0c0a14; color:#e8e3f5; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
  .card { max-width:480px; background:#1a1428; border:1px solid #2c2440; border-radius:12px; padding:36px; text-align:center; }
  h1 { margin:0 0 12px; color:#fbe6d5; }
  p { margin:0 0 16px; color:#c5b8d8; line-height:1.6; }
  a { color:#e8d3ff; }
</style>
</head>
<body>
  <div class="card">
    <h1>${ok ? "You're unsubscribed." : "Something went wrong."}</h1>
    <p>${message}</p>
    <p><a href="https://lustimacy.com/">← Back to lustimacy.com</a></p>
  </div>
</body>
</html>`;
}

function html(body: string, status = 200): Response {
    return new Response(body, {
        status,
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
        },
    });
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
        return html(pageHtml("Email system is misconfigured.", false), 500);
    }

    const url = new URL(request.url);
    const email = (url.searchParams.get("e") || "").trim().toLowerCase();

    if (!EMAIL_RE.test(email)) {
        return html(pageHtml("That doesn't look like a valid email link.", false), 400);
    }

    try {
        const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/unsubscribe_waitlist`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                apikey: env.SUPABASE_ANON_KEY,
                Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ p_email: email }),
        });
        if (res.status < 200 || res.status >= 300) {
            return html(
                pageHtml(
                    "We couldn't unsubscribe you right now. Email info@lustimacy.com and we'll remove you manually.",
                    false,
                ),
                502,
            );
        }
    } catch (_) {
        return html(
            pageHtml(
                "Network error. Email info@lustimacy.com and we'll remove you manually.",
                false,
            ),
            502,
        );
    }

    return html(
        pageHtml(
            "You won't receive any more emails from us. If you change your mind, just sign up again at lustimacy.com.",
            true,
        ),
    );
};

export const onRequest: PagesFunction = async () =>
    html(pageHtml("Use the unsubscribe link from your email.", false), 405);
