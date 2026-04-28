// Image proxy for shared profile photos (mirror of janerek-landing's
// equivalent). Photos live in the public Supabase Storage bucket
// `profile_photos` at path `{user_id}/{photo_id}`. The proxy keeps the
// outward-facing URL stable (so OG previews don't break), and a disabled
// share token immediately starts 404'ing.

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  PROFILE_PHOTOS_BUCKET?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const token = String(params.token ?? "");
  const idxRaw = String(params.index ?? "");
  const idx = parseInt(idxRaw.replace(/\.\w+$/, ""), 10);

  if (!/^[A-Za-z0-9]{8,32}$/.test(token) || Number.isNaN(idx) || idx < 0) {
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
      body: JSON.stringify({ p_token: token }),
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

  const photos = Array.isArray(row.profile_photos) ? row.profile_photos : [];
  if (idx >= photos.length) return new Response("Not Found", { status: 404 });

  const photoId = String(photos[idx] ?? "").replace(/^\/+/, "");
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
