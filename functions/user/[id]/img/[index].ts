// Cloudflare Pages Function — image proxy for shared profile photos.
// Serves /user/<uuid>/img/<i>.jpg by:
//   1. Resolving the user id to profile_photos[] via the public RPC.
//   2. Fetching photos[i] from the public Supabase Storage bucket
//      `profile_photos` at path `{user_id}/{photo_id}`.
//   3. Streaming the bytes back with a long edge-cache TTL.
//
// Why proxy a public bucket: when a user toggles is_publicly_shareable
// off, the RPC returns no rows and this function returns 404 — the
// edge cache is the only leak window (capped at a week).
//
// Env vars:
//   SUPABASE_URL          — e.g. https://jnaxgadklstwicjrzatk.supabase.co
//   SUPABASE_ANON_KEY     — anon key (RPC uses this)
//   PROFILE_PHOTOS_BUCKET — defaults to "profile_photos"

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  PROFILE_PHOTOS_BUCKET?: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Mirrors extractPhotoIds() in ../[id].ts: profile_photos may be an
// array of strings, an array of objects with `id`/`photoId`/`path`, or
// a JSON-encoded string of either of those.
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

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const userId = String(params.id ?? "").toLowerCase();
  const idxRaw = String(params.index ?? "");
  const idx = parseInt(idxRaw.replace(/\.\w+$/, ""), 10);

  if (!UUID_RE.test(userId) || Number.isNaN(idx) || idx < 0) {
    return new Response("Not Found", { status: 404 });
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

  if (!rpcRes.ok) return new Response("Not Found", { status: 404 });
  const rows = (await rpcRes.json()) as Array<
    { user_id?: string; profile_photos?: unknown }
  >;
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row || !row.user_id) {
    return new Response("Not Found", { status: 404 });
  }

  const photoIds = extractPhotoIds(row.profile_photos);
  if (idx >= photoIds.length) return new Response("Not Found", { status: 404 });

  const photoId = photoIds[idx].replace(/^\/+/, "");
  if (!photoId) return new Response("Not Found", { status: 404 });

  const bucket = env.PROFILE_PHOTOS_BUCKET ?? "profile_photos";
  const imageUrl =
    `${env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${row.user_id}/${photoId}`;

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) return new Response("Not Found", { status: 404 });

  const contentType = imgRes.headers.get("content-type") ?? "image/webp";
  return new Response(imgRes.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=604800",
    },
  });
};
