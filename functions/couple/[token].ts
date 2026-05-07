// Cloudflare Pages Function — handles
// https://lustimacy.com/couple/<token>. Renders a small landing page
// that:
//   1. Tries to open the Lustimacy app via the custom-scheme deep link
//      (com.lustimacy://couple/<token>). On Android with the app
//      installed, this fires the registered intent filter and lands
//      directly on CoupleSettingsFragment. On iOS the App Link will
//      catch the https://lustimacy.com/couple/* URL via AASA before we
//      ever render this page (TODO: add /couple/* to AASA paths).
//   2. Falls back to a "Get the app" CTA for users who don't have it.
//
// The page is intentionally barebones — invite links are private, not
// indexed, and only need to bridge a tap from a chat into the app.

interface Env {
  PLAY_STORE_URL?: string;
  APP_STORE_URL?: string;
}

const DEFAULT_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.lustimacy";
const DEFAULT_APP_STORE_URL = "https://apps.apple.com/app/lustimacy"; // TODO: real iOS App Store ID

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const rawToken = String(params.token ?? "");
  const token = rawToken.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
  if (!token) {
    return new Response("Invalid invite link", { status: 400 });
  }

  const playUrl = env.PLAY_STORE_URL || DEFAULT_PLAY_URL;
  const appStoreUrl = env.APP_STORE_URL || DEFAULT_APP_STORE_URL;
  const deepLink = `com.lustimacy://couple/${token}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Couple invite — Lustimacy</title>
  <style>
    *,*::before,*::after { box-sizing: border-box; }
    body { margin:0; min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; background:#0c0712; color:#fff; }
    .card { max-width:420px; width:100%; padding:32px 24px; background:#1c0f2a; border-radius:16px; text-align:center; }
    h1 { font-size:22px; margin:16px 0 8px; }
    p { font-size:15px; line-height:1.45; opacity:.85; margin:0 0 24px; }
    .btn { display:block; width:100%; padding:14px 20px; border-radius:10px; font-weight:600; font-size:15px; text-decoration:none; margin-top:12px; }
    .btn-primary { background:#a855f7; color:#fff; }
    .btn-secondary { background:transparent; color:#a855f7; border:1px solid #a855f7; }
    .small { font-size:12px; opacity:.6; margin-top:24px; }
    .logo { font-weight:700; letter-spacing:1px; font-size:14px; opacity:.7; margin-bottom:8px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">LUSTIMACY</div>
    <h1>You've been invited to link as a couple</h1>
    <p>Tap the button to open Lustimacy and accept your partner's invite. If you don't have the app yet, install it first — your invite stays valid for 7 days.</p>

    <a class="btn btn-primary" href="${escapeHtml(deepLink)}">Open in Lustimacy</a>
    <a class="btn btn-secondary" id="play" href="${escapeHtml(playUrl)}">Get it on Google Play</a>
    <a class="btn btn-secondary" id="appstore" href="${escapeHtml(appStoreUrl)}" style="display:none;">Download on the App Store</a>

    <div class="small">Invite token: ${escapeHtml(token)}</div>
  </div>

  <script>
    (function() {
      var ua = navigator.userAgent || "";
      var isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
      var isAndroid = /Android/.test(ua);
      if (isIOS) {
        var play = document.getElementById('play');
        var ios = document.getElementById('appstore');
        if (play) play.style.display = 'none';
        if (ios) ios.style.display = 'block';
      }
      // Auto-attempt the deep link on mobile so users land in the app
      // immediately when it's installed. Falls through to the CTAs if
      // the OS rejects the scheme.
      if (isIOS || isAndroid) {
        setTimeout(function () {
          window.location.href = ${JSON.stringify(deepLink)};
        }, 250);
      }
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
};
