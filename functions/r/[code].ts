// /r/<code> — referral redirect.
// Sets the lustimacy_ref cookie (90-day) and redirects to the homepage.
// The visitor's locale is determined by middleware (Accept-Language).
//
// Expected use: a Lustimacy user shares lustimacy.com/r/abc123def0 with
// friends. The friend lands here, gets a cookie, and is redirected to /.
// When they submit the waitlist form, /api/waitlist reads the cookie and
// credits the referrer with +10 bonus points (and the new signup with
// referred_by_code).

const CODE_RE = /^[a-z0-9]{6,20}$/;
const COOKIE_NAME = "lustimacy_ref";
const COOKIE_MAX_AGE = 90 * 24 * 60 * 60;

export const onRequest: PagesFunction = async ({ request, params }) => {
    const code = (params.code as string | undefined)?.trim().toLowerCase() || "";
    const url = new URL(request.url);

    // Validate: if it's garbage, redirect to homepage without setting a cookie.
    if (!CODE_RE.test(code)) {
        return Response.redirect(new URL("/", url).toString(), 302);
    }

    // Redirect to root, letting locale middleware pick DE/NL/EN.
    const dest = new URL("/", url);
    // Preserve any utm_* parameters for analytics
    for (const [k, v] of url.searchParams.entries()) {
        if (k.startsWith("utm_")) dest.searchParams.set(k, v);
    }
    // Add a marker so the front-end can show "you were referred by a friend"
    dest.searchParams.set("ref", "1");

    const headers = new Headers();
    headers.set("Location", dest.toString());
    headers.set(
        "Set-Cookie",
        `${COOKIE_NAME}=${encodeURIComponent(code)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax; HttpOnly`,
    );
    headers.set("Cache-Control", "no-store");

    return new Response(null, { status: 302, headers });
};
