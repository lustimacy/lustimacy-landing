// Lustimacy enum-id → display-string mappings.
//
// The DB stores these as smallint / jsonb-of-int. The renderer needs
// human-readable labels; the canonical source is the Android enums in
// `productinfra/data/src/Lustimacy/java/com/aboutyou/productinfra/data/user/lustimacy/`.
// Keep this file in sync if the Android enums grow new values.
//
// Strings here mirror what appears in `app/src/Lustimacy/res/values/strings.xml`
// (Lustimacy is English-only, so no Arabic mirror is needed).

export const GENDER: Record<number, string> = {
  0: "Man",
  1: "Woman",
  2: "Non-binary",
  3: "Trans man",
  4: "Trans woman",
  5: "Genderqueer",
  6: "Genderfluid",
  7: "Agender",
  8: "Two-spirit",
  9: "Other",
};

export const SEXUAL_ORIENTATION: Record<number, string> = {
  0: "Straight",
  1: "Gay",
  2: "Lesbian",
  3: "Bisexual",
  4: "Pansexual",
  5: "Asexual",
  6: "Demisexual",
  7: "Queer",
  8: "Questioning",
};

export const RELATIONSHIP_STATUS: Record<number, string> = {
  0: "Single",
  1: "In a relationship",
  2: "Married",
  3: "ENM",
  4: "Poly",
};

export const POWER_DYNAMIC: Record<number, string> = {
  0: "Dominant",
  1: "Submissive",
  2: "Switch",
  3: "Power bottom",
  4: "Service top",
  5: "Vanilla",
};

export const BODY_TYPE: Record<number, string> = {
  0: "Slim",
  1: "Athletic",
  2: "Average",
  3: "Muscular",
  4: "Curvy",
  5: "Plus size",
};

export const MEETING_PREFERENCE: Record<number, string> = {
  0: "My place",
  1: "Your place",
  2: "Hotel",
  3: "Public first",
  4: "Outdoors",
  5: "Virtual first",
};

export const DESIRE: Record<number, string> = {
  0: "Bondage",
  1: "Role play",
  2: "Voyeurism",
  3: "Exhibitionism",
  4: "Tantric",
  5: "Threesome",
  6: "Group play",
  7: "Power play",
  8: "Sensory play",
  9: "Dom/Sub",
  10: "Deep conversations",
  11: "Emotional intimacy",
  12: "Cuddling",
  13: "Aftercare",
  14: "Romantic dates",
};

export const SEXUAL_POSITION: Record<number, string> = {
  0: "Missionary",
  1: "Doggy style",
  2: "Cowgirl",
  3: "Reverse cowgirl",
  4: "Spooning",
  5: "Sixty-nine",
  6: "Lotus",
  7: "Standing",
  8: "Seated",
  9: "Prone bone",
  10: "Bridge",
  11: "Butterfly",
  12: "Pretzel",
  13: "Side by side",
  14: "Face off",
};

export const INTEREST: Record<number, string> = {
  0: "Sports",
  1: "Travelling",
  2: "Music",
  3: "Reading",
  4: "Cooking",
  5: "Photography",
  6: "Gaming",
  7: "Yoga",
  8: "Hiking",
  9: "Dancing",
  10: "Art",
  11: "Movies",
  12: "Fitness",
  13: "Wine and dine",
  14: "Meditation",
  15: "Nightlife",
  16: "Fashion",
  17: "Nature",
  18: "Raves",
  19: "Festivals",
  20: "Tattoos",
  21: "Astrology",
  22: "Cosplay",
  23: "Sauna and spa",
  24: "Pole dancing",
  25: "Mixology",
  26: "Adventure",
  27: "Beach",
  28: "Pets",
  29: "Live music",
  30: "Karaoke",
  31: "Wellness",
  32: "Camping",
};

export function mapIds(
  table: Record<number, string>,
  ids: unknown,
): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  for (const v of ids) {
    const n = typeof v === "number" ? v : parseInt(String(v), 10);
    const label = table[n];
    if (label) out.push(label);
  }
  return out;
}

export function lookup(
  table: Record<number, string>,
  id: number | null | undefined,
): string | null {
  if (id == null) return null;
  return table[id] ?? null;
}
