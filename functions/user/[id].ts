// Cloudflare Pages Function — renders the public profile page at
// https://lustimacy.com/user/<uuid>. Vertical photo stack → name + verified
// badge → age → highlight chips → "Story" + multiple grouped sections
// (Identity / Desires / Interests / Meeting / Positions), each with its
// own purple-circle icon header. Dark theme.
//
// Mirrors janerek-landing's /user/<id> route — Lustimacy migrated from
// the old /p/<token> path when the share-token model was replaced with
// a stable user-id URL gated by `is_publicly_shareable`.

import {
  BODY_TYPE,
  DESIRE,
  GENDER,
  INTEREST,
  lookup,
  mapIds,
  MEETING_PREFERENCE,
  POWER_DYNAMIC,
  RELATIONSHIP_STATUS,
  SEXUAL_ORIENTATION,
  SEXUAL_POSITION,
} from "../_labels";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  APP_NAME?: string;
  APP_HOST?: string;
  PLAY_STORE_URL?: string;
  APP_STORE_URL?: string;
}

interface PublicProfile {
  user_id: string;
  name: string;
  age: number;
  bio: string | null;
  gender: number | null;
  city: string | null;
  country_code: string | null;
  sexual_orientation: number | null;
  desires: unknown;
  relationship_status: number | null;
  interests: unknown;
  height: number | null;
  meeting_preferences: unknown;
  sexual_positions: unknown;
  power_dynamic: number | null;
  body_type: number | null;
  is_verified: boolean;
  profile_photos: unknown;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractPhotoIds(v: unknown): string[] {
  let arr: unknown[] = [];
  if (Array.isArray(v)) arr = v;
  else if (typeof v === "string") {
    try {
      const j = JSON.parse(v);
      if (Array.isArray(j)) arr = j;
    } catch { /* ignore */ }
  }
  return arr
    .map((x) => {
      if (typeof x === "string") return x;
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        const candidate = o.id ?? o.photoId ?? o.photo_id ?? o.path ?? o.name;
        return typeof candidate === "string" ? candidate : null;
      }
      return null;
    })
    .filter((x): x is string => Boolean(x));
}

const VERIFIED_SVG = `<svg class="verified-badge" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-label="Verified"><path d="M12 1l2.39 2.06 3.13-.4.91 3.04 2.96 1.31-.94 3 1 3-3 1.3-.91 3.04-3.13-.4L12 19.7l-2.4-2.06-3.13.4-.91-3.04-3-1.3 1-3-1-3 3-1.3.91-3.04 3.13.4L12 1z" fill="#1C64F2"/><path d="M8.4 12.2l2.5 2.5 4.9-5" stroke="#fff" stroke-width="2.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const ICON_STORY = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 4a2 2 0 012-2h7l5 5v13a2 2 0 01-2 2H7a2 2 0 01-2-2V4z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 2v5h5M9 13h6M9 17h6M9 9h2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_IDENTITY = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.6"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
const ICON_HEART = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21s-7-4.5-9.5-9C1 9 2.5 5 6.5 5c2 0 3.5 1 5.5 3 2-2 3.5-3 5.5-3 4 0 5.5 4 4 7-2.5 4.5-9.5 9-9.5 9z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
const ICON_STAR = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6-5.4-2.8L6.6 20l1-6L3.2 9.5l6.1-.9L12 3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
const ICON_PIN = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21s-7-7-7-12a7 7 0 1114 0c0 5-7 12-7 12z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" stroke-width="1.6"/></svg>`;
const ICON_FLAME = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3s-4 4-4 8a4 4 0 008 0c0-1.5-1-3-2-4 0 2-1.5 3-2 3-1 0-1.5-1-1.5-2 0-2 1.5-3 1.5-5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

function notFound(host: string, appName: string): Response {
  const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Profile not available — ${escapeHtml(appName)}</title>
<link rel="stylesheet" href="/css/profile.css">
</head><body>
<div class="shell"><div class="notfound">
  <h1>This profile isn't available</h1>
  <p>The link may have been removed by its owner.</p>
  <a href="https://${host}">Back to ${escapeHtml(appName)}</a>
</div></div>
</body></html>`;
  return new Response(html, {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=300",
    },
  });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { params, env } = context;
  const userId = String(params.id ?? "").toLowerCase();
  const host = env.APP_HOST ?? "lustimacy.com";
  const appName = env.APP_NAME ?? "Lustimacy";

  if (!UUID_RE.test(userId)) {
    return notFound(host, appName);
  }

  const rpcRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/rpc/get_public_profile`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "apikey": env.SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${env.SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ p_user_id: userId }),
    },
  );

  if (!rpcRes.ok) {
    const body = await rpcRes.text().catch(() => "");
    console.error(
      `[user/${userId}] get_public_profile RPC error status=${rpcRes.status} body=${body.slice(0, 300)}`,
    );
    return notFound(host, appName);
  }
  const rows = (await rpcRes.json()) as PublicProfile[];
  if (!Array.isArray(rows) || rows.length === 0) {
    console.warn(
      `[user/${userId}] RPC returned 0 rows — user is likely not setup-complete or has is_publicly_shareable=false`,
    );
    return notFound(host, appName);
  }
  const p = rows[0];

  const photoIds = extractPhotoIds(p.profile_photos);
  const photoCount = photoIds.length;
  const ogImageUrl = photoCount > 0
    ? `https://${host}/user/${userId}/img/0.jpg`
    : `https://${host}/assets/og-default.jpg`;

  const bio = (p.bio ?? "").trim();
  const ogDescription = bio.length > 0
    ? bio.length > 160 ? bio.slice(0, 157) + "…" : bio
    : `I'm using ${appName} to connect.`;

  const cityLine = [p.city, p.country_code].filter(Boolean).join(", ");

  const playStoreUrl = env.PLAY_STORE_URL ??
    `https://play.google.com/store/apps/details?id=com.lustimacy`;
  const appStoreUrl = env.APP_STORE_URL ??
    `https://apps.apple.com/app/lustimacy`;
  const shareUrl = `https://${host}/user/${userId}`;

  const photoStack = photoCount > 0
    ? photoIds
        .map((_, i) =>
          `<div class="photo"><img src="/user/${userId}/img/${i}.jpg" alt="${escapeHtml(p.name)}" loading="${i === 0 ? "eager" : "lazy"}"></div>`
        )
        .join("")
    : `<div class="photo photo--empty"></div>`;

  // Highlights: city, gender, height.
  const highlights: string[] = [];
  if (cityLine) highlights.push(`<span class="chip"><span class="icon">📍</span>${escapeHtml(cityLine)}</span>`);
  const genderLabel = lookup(GENDER, p.gender);
  if (genderLabel) highlights.push(`<span class="chip"><span class="icon">⚥</span>${escapeHtml(genderLabel)}</span>`);
  if (typeof p.height === "number" && p.height > 0) {
    highlights.push(`<span class="chip"><span class="icon">📏</span>${p.height} cm</span>`);
  }

  const sectionsHtml: string[] = [];

  if (bio) {
    sectionsHtml.push(`
      <section class="section">
        <div class="section-head">
          <div class="section-circle">${ICON_STORY}</div>
          <div class="section-title">Story</div>
        </div>
        <div class="story-text">${escapeHtml(bio)}</div>
      </section>`);
  }

  const identityTags: string[] = [];
  const orient = lookup(SEXUAL_ORIENTATION, p.sexual_orientation);
  if (orient) identityTags.push(orient);
  const status = lookup(RELATIONSHIP_STATUS, p.relationship_status);
  if (status) identityTags.push(status);
  const body = lookup(BODY_TYPE, p.body_type);
  if (body) identityTags.push(body);
  const power = lookup(POWER_DYNAMIC, p.power_dynamic);
  if (power) identityTags.push(power);
  if (identityTags.length) {
    sectionsHtml.push(`
      <section class="section">
        <div class="section-head">
          <div class="section-circle">${ICON_IDENTITY}</div>
          <div class="section-title">Identity</div>
        </div>
        <div class="chips">${identityTags.map(t => `<span class="chip">${escapeHtml(t)}</span>`).join("")}</div>
      </section>`);
  }

  const desires = mapIds(DESIRE, p.desires);
  if (desires.length) {
    sectionsHtml.push(`
      <section class="section">
        <div class="section-head">
          <div class="section-circle">${ICON_HEART}</div>
          <div class="section-title">Desires</div>
        </div>
        <div class="chips">${desires.map(t => `<span class="chip">${escapeHtml(t)}</span>`).join("")}</div>
      </section>`);
  }

  const interests = mapIds(INTEREST, p.interests);
  if (interests.length) {
    sectionsHtml.push(`
      <section class="section">
        <div class="section-head">
          <div class="section-circle">${ICON_STAR}</div>
          <div class="section-title">Interests</div>
        </div>
        <div class="chips">${interests.map(t => `<span class="chip">${escapeHtml(t)}</span>`).join("")}</div>
      </section>`);
  }

  const meets = mapIds(MEETING_PREFERENCE, p.meeting_preferences);
  if (meets.length) {
    sectionsHtml.push(`
      <section class="section">
        <div class="section-head">
          <div class="section-circle">${ICON_PIN}</div>
          <div class="section-title">Meeting</div>
        </div>
        <div class="chips">${meets.map(t => `<span class="chip">${escapeHtml(t)}</span>`).join("")}</div>
      </section>`);
  }

  const positions = mapIds(SEXUAL_POSITION, p.sexual_positions);
  if (positions.length) {
    sectionsHtml.push(`
      <section class="section">
        <div class="section-head">
          <div class="section-circle">${ICON_FLAME}</div>
          <div class="section-title">Positions</div>
        </div>
        <div class="chips">${positions.map(t => `<span class="chip">${escapeHtml(t)}</span>`).join("")}</div>
      </section>`);
  }

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#374151">
<title>${escapeHtml(p.name)} — ${escapeHtml(appName)}</title>

<meta property="og:type" content="profile">
<meta property="og:title" content="Meet ${escapeHtml(p.name)} on ${escapeHtml(appName)}">
<meta property="og:description" content="${escapeHtml(ogDescription)}">
<meta property="og:image" content="${ogImageUrl}">
<meta property="og:url" content="${shareUrl}">
<meta property="og:site_name" content="${escapeHtml(appName)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Meet ${escapeHtml(p.name)} on ${escapeHtml(appName)}">
<meta name="twitter:description" content="${escapeHtml(ogDescription)}">
<meta name="twitter:image" content="${ogImageUrl}">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="/css/profile.css">
</head>
<body>
<div class="shell">
  <div class="photos">${photoStack}</div>
  <div class="transition"></div>

  <div class="content">
    <div class="name-row">
      <h1 class="name">${escapeHtml(p.name)}</h1>
      ${p.is_verified ? VERIFIED_SVG : ""}
    </div>
    ${typeof p.age === "number" ? `<div class="age-line">${p.age}</div>` : ""}

    ${highlights.length ? `<div class="chips">${highlights.join("")}</div>` : ""}

    ${sectionsHtml.join("")}
  </div>
</div>

<div class="cta-bar">
  <a class="cta" id="open-app"
     href="${playStoreUrl}"
     data-host="${host}"
     data-user-id="${userId}"
     data-android-pkg="com.lustimacy"
     data-ios-scheme="com.lustimacy://user/${userId}"
     data-android-store="${playStoreUrl}"
     data-ios-store="${appStoreUrl}"
     data-universal-link="${shareUrl}">
    Open in ${escapeHtml(appName)}
  </a>
</div>

<script>
  (function () {
    var btn = document.getElementById('open-app');
    if (!btn) return;
    var ua = navigator.userAgent || '';
    var isAndroid = /Android/i.test(ua);
    var isIOS = /iPhone|iPad|iPod/i.test(ua) && !window.MSStream;
    btn.addEventListener('click', function (e) {
      if (isAndroid) {
        e.preventDefault();
        var fallback = encodeURIComponent(btn.dataset.androidStore);
        window.location.href = 'intent://' + btn.dataset.host + '/user/' + btn.dataset.userId +
          '#Intent;scheme=https;package=' + btn.dataset.androidPkg +
          ';S.browser_fallback_url=' + fallback + ';end';
      } else if (isIOS) {
        e.preventDefault();
        var t = Date.now();
        // iOS blocks same-domain Universal Links (you can't tap a link
        // on lustimacy.com that opens lustimacy.com in the app). Use the
        // custom URL scheme (com.lustimacy://user/<id>) — registered in
        // the app's Info.plist and routed by SharedProfileRouter — and
        // fall through to the App Store after 1.5s if the app isn't
        // installed (no scheme handler intercepted the navigation).
        window.location.href = btn.dataset.iosScheme;
        setTimeout(function () {
          if (Date.now() - t < 1800) window.location.href = btn.dataset.iosStore;
        }, 1500);
      }
    });
  })();
</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=300",
    },
  });
};
