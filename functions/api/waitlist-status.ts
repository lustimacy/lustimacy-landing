// /api/waitlist-status?c=<referral_code>
//
// Returns the user's live waitlist position for a given referral code.
// Used by /waitlist-status.html to render position + share URL.
// Calls the public.get_waitlist_position_by_code RPC.

interface Env {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
}

const CODE_RE = /^[a-z0-9]{6,20}$/;

function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
        },
    });
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
        return json({ error: "misconfigured" }, 500);
    }
    const url = new URL(request.url);
    const code = (url.searchParams.get("c") || "").trim().toLowerCase();
    if (!CODE_RE.test(code)) {
        return json({ error: "invalid_code" }, 400);
    }

    let res: Response;
    try {
        res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/get_waitlist_position_by_code`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                apikey: env.SUPABASE_ANON_KEY,
                Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ p_code: code }),
        });
    } catch (_) {
        return json({ error: "network" }, 502);
    }

    if (res.status < 200 || res.status >= 300) {
        return json({ error: "upstream" }, 502);
    }

    try {
        const data = await res.json();
        return json(data);
    } catch (_) {
        return json({ error: "parse" }, 502);
    }
};

export const onRequest: PagesFunction = async () =>
    json({ error: "method_not_allowed" }, 405);
