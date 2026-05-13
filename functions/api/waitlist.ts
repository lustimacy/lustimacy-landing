// /api/waitlist — POST { email, locale, source, referrer } → enroll on the
// Lustimacy waitlist.
//
// Switched to the public.enroll_in_waitlist RPC (migration 20260512120000)
// which atomically:
//   1. Checks for duplicate by email
//   2. Inserts the row (BEFORE trigger generates referral_code)
//   3. Credits the referrer (AFTER trigger adds bonus_points)
//   4. Returns { referral_code, position, is_duplicate }
//
// Referral attribution: the visitor's referral cookie (lustimacy_ref) is
// set by /r/[code] Pages function. We read it server-side here.
//
// Welcome email: after a successful (non-duplicate) enrollment we call the
// Supabase Edge Function send-waitlist-email to send sequence 0 (welcome).
// Failures are logged but don't fail the response — signup is the priority.

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

interface EnrollResult {
    referral_code: string;
    waitlist_position: number;
    is_duplicate: boolean;
}

const WELCOME_TIMEOUT_MS = 4500;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUPPORTED_LOCALES = new Set(["en", "de", "nl"]);
const REFERRAL_COOKIE = "lustimacy_ref";

function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
        },
    });
}

async function hashIp(ip: string): Promise<string> {
    const enc = new TextEncoder().encode(`lustimacy:${ip}`);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 32);
}

function readReferralCookie(request: Request): string | null {
    const header = request.headers.get("cookie") || "";
    const parts = header.split(/;\s*/);
    for (const p of parts) {
        const [k, v] = p.split("=");
        if (k === REFERRAL_COOKIE && v) {
            try {
                return decodeURIComponent(v).slice(0, 32);
            } catch (_) {
                return null;
            }
        }
    }
    return null;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
        return jsonResponse({ error: "misconfigured" }, 500);
    }

    let body: Body;
    try {
        body = await request.json();
    } catch (_) {
        return jsonResponse({ error: "invalid_json" }, 400);
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const locale =
        typeof body.locale === "string" && SUPPORTED_LOCALES.has(body.locale)
            ? body.locale
            : "en";
    const source = typeof body.source === "string" ? body.source.slice(0, 64) : null;
    const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 256) : null;

    if (!EMAIL_RE.test(email) || email.length > 254) {
        return jsonResponse({ error: "invalid_email" }, 400);
    }

    const cf = (request as any).cf as { country?: string } | undefined;
    const country = cf?.country?.toUpperCase() || null;
    const ip = request.headers.get("cf-connecting-ip") || "0.0.0.0";
    const ipHash = await hashIp(ip);
    const userAgent = (request.headers.get("user-agent") || "").slice(0, 256);
    const referredByCode = readReferralCookie(request);

    const rpcUrl = `${env.SUPABASE_URL}/rest/v1/rpc/enroll_in_waitlist`;
    let rpcRes: Response;
    try {
        rpcRes = await fetch(rpcUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                apikey: env.SUPABASE_ANON_KEY,
                Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
                p_email: email,
                p_locale: locale,
                p_source: source,
                p_referrer: referrer,
                p_country: country,
                p_ip_hash: ipHash,
                p_user_agent: userAgent,
                p_referred_by_code: referredByCode,
            }),
        });
    } catch (err) {
        return jsonResponse({ error: "network" }, 502);
    }

    if (rpcRes.status < 200 || rpcRes.status >= 300) {
        return jsonResponse({ error: "upstream" }, 502);
    }

    let enrollResult: EnrollResult | null = null;
    try {
        const data = await rpcRes.json();
        // Supabase returns an array of rows from a set-returning function
        if (Array.isArray(data) && data.length > 0) {
            enrollResult = data[0] as EnrollResult;
        } else if (data && typeof data === "object" && "referral_code" in data) {
            enrollResult = data as EnrollResult;
        }
    } catch (_) {
        /* ignore */
    }

    if (!enrollResult) {
        return jsonResponse({ ok: true });
    }

    // Send welcome email — AWAITED. Cloudflare Pages kills the worker
    // when the response goes out, so fire-and-forget cuts the fetch
    // mid-flight and Resend may never receive the request. We accept
    // the ~400ms added latency in exchange for reliable delivery.
    // Email failure is non-fatal: we still return success to the
    // client. The drip cron will pick up sequence 1+ regardless.
    if (!enrollResult.is_duplicate) {
        try {
            await sendWelcomeEmail(env, email, locale, enrollResult.referral_code);
        } catch (err) {
            console.log("welcome email send failed (non-fatal):", err);
        }
    }

    // Clear the referral cookie now that it's been used
    const responseHeaders = new Headers({
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
    });
    if (referredByCode) {
        responseHeaders.append(
            "Set-Cookie",
            `${REFERRAL_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`,
        );
    }

    return new Response(
        JSON.stringify({
            ok: true,
            duplicate: enrollResult.is_duplicate,
            referral_code: enrollResult.referral_code,
            position: enrollResult.waitlist_position,
        }),
        { status: 200, headers: responseHeaders },
    );
};

async function sendWelcomeEmail(
    env: Env,
    email: string,
    locale: string,
    referralCode: string,
): Promise<void> {
    // Calls the Supabase Edge Function. Auth: anon key (function allows anon).
    // Bounded timeout so an unresponsive edge fn doesn't stall the whole
    // signup response indefinitely.
    const url = `${env.SUPABASE_URL}/functions/v1/send-waitlist-email`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WELCOME_TIMEOUT_MS);
    try {
        const r = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
                apikey: env.SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
                email,
                sequence_index: 0,
                locale,
                referral_code: referralCode,
            }),
            signal: controller.signal,
        });
        if (r.status < 200 || r.status >= 300) {
            console.log("send-waitlist-email returned", r.status);
        }
    } finally {
        clearTimeout(timer);
    }
}

export const onRequest: PagesFunction = async ({ request }) => {
    if (request.method !== "POST") {
        return jsonResponse({ error: "method_not_allowed" }, 405);
    }
    return jsonResponse({ error: "method_not_allowed" }, 405);
};
