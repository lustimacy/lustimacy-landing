// /api/country — returns the visitor's country (from Cloudflare's request.cf.country)
// and whether Lustimacy is available there. Used by the hero badge to swap
// copy based on geo.

const AVAILABLE: ReadonlySet<string> = new Set(['DE', 'NL']);

const NAMES: Record<string, Record<string, string>> = {
  en: {
    DE: 'Germany', NL: 'Netherlands', AT: 'Austria', BE: 'Belgium', CH: 'Switzerland',
    FR: 'France', ES: 'Spain', IT: 'Italy', PT: 'Portugal', GB: 'the UK', IE: 'Ireland',
    SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', PL: 'Poland',
    CZ: 'Czechia', HU: 'Hungary', US: 'the US', CA: 'Canada', AU: 'Australia',
  },
  de: {
    DE: 'Deutschland', NL: 'die Niederlande', AT: 'Österreich', BE: 'Belgien', CH: 'die Schweiz',
    FR: 'Frankreich', ES: 'Spanien', IT: 'Italien', PT: 'Portugal', GB: 'das UK', IE: 'Irland',
    SE: 'Schweden', NO: 'Norwegen', DK: 'Dänemark', FI: 'Finnland', PL: 'Polen',
    CZ: 'Tschechien', HU: 'Ungarn', US: 'die USA', CA: 'Kanada', AU: 'Australien',
  },
  nl: {
    DE: 'Duitsland', NL: 'Nederland', AT: 'Oostenrijk', BE: 'België', CH: 'Zwitserland',
    FR: 'Frankrijk', ES: 'Spanje', IT: 'Italië', PT: 'Portugal', GB: 'het VK', IE: 'Ierland',
    SE: 'Zweden', NO: 'Noorwegen', DK: 'Denemarken', FI: 'Finland', PL: 'Polen',
    CZ: 'Tsjechië', HU: 'Hongarije', US: 'de VS', CA: 'Canada', AU: 'Australië',
  },
};

function pickLocale(req: Request): 'en' | 'de' | 'nl' {
  const ref = req.headers.get('referer') || '';
  if (ref.includes('/de/')) return 'de';
  if (ref.includes('/nl/')) return 'nl';
  return 'en';
}

export const onRequest: PagesFunction = async ({ request }) => {
  const cf = (request as any).cf as { country?: string } | undefined;
  const country = (cf?.country || '').toUpperCase();
  const locale = pickLocale(request);
  const names = NAMES[locale];
  const countryName = names?.[country] ?? country;

  return new Response(
    JSON.stringify({
      country: country || null,
      countryName: countryName || null,
      available: country ? AVAILABLE.has(country) : false,
      locale,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    }
  );
};
