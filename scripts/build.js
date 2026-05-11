#!/usr/bin/env node
// Lustimacy landing — locale build.
//
// Reads src/index.template.html + i18n/{locale}.json and writes:
//   /index.html       (en, default)
//   /de/index.html
//   /nl/index.html
//   /sitemap.xml
//
// Template syntax:
//   {{ key.path }}         — dot-path lookup in the locale dictionary
//   {{ key.path | raw }}   — same, but skip HTML-escaping
//   <!--LOCALE_META-->     — replaced with per-locale <link rel="canonical">,
//                             hreflang cluster, og:locale, html lang attr
//   <!--JSONLD-->          — replaced with the per-locale JSON-LD blob
//
// Zero deps. Run with `npm run build` or `node scripts/build.js`.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'src/index.template.html');
const I18N_DIR = path.join(ROOT, 'i18n');
const SITE_URL = 'https://lustimacy.com';

const LOCALES = [
  { code: 'en', urlPath: '/', dir: '.', isDefault: true },
  { code: 'de', urlPath: '/de/', dir: 'de' },
  { code: 'nl', urlPath: '/nl/', dir: 'nl' },
];

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveKey(dict, dotPath) {
  return dotPath.split('.').reduce((acc, part) => {
    if (acc == null) return undefined;
    return acc[part];
  }, dict);
}

function substitute(template, dict) {
  // {{ key | raw }} or {{ key }}
  return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)(?:\s*\|\s*(raw))?\s*\}\}/g, (_, keyPath, modifier) => {
    const value = resolveKey(dict, keyPath);
    if (value === undefined) {
      console.warn(`  [warn] missing i18n key: ${keyPath}`);
      return '';
    }
    if (Array.isArray(value)) {
      console.warn(`  [warn] array value used as scalar for key: ${keyPath}`);
      return '';
    }
    return modifier === 'raw' ? String(value) : escapeHtml(value);
  });
}

function localeMetaBlock(locale, allLocales) {
  const canonical = `${SITE_URL}${locale.urlPath}`;
  const hreflangs = allLocales.map((l) => {
    return `    <link rel="alternate" hreflang="${l.code}" href="${SITE_URL}${l.urlPath}">`;
  });
  hreflangs.push(`    <link rel="alternate" hreflang="x-default" href="${SITE_URL}/">`);
  return [
    `    <link rel="canonical" href="${canonical}">`,
    ...hreflangs,
  ].join('\n');
}

function faqItemsBlock(dict) {
  const items = (dict.faq && dict.faq.items) || [];
  return items
    .map(
      (item, idx) => `                <details class="faq__item reveal"${idx === 0 ? ' open' : ''}>
                    <summary class="faq__question">
                        <span>${escapeHtml(item.q)}</span>
                        <svg class="faq__chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
                    </summary>
                    <div class="faq__answer"><p>${escapeHtml(item.a)}</p></div>
                </details>`
    )
    .join('\n');
}

function jsonLdBlock(locale, dict) {
  const canonical = `${SITE_URL}${locale.urlPath}`;
  const screenshots = [1, 2, 3, 4, 5, 6, 7, 8].map(
    (n) => `${SITE_URL}/assets/images/screenshot-${n}.jpg`
  );
  const faqs = (dict.faq && dict.faq.items) || [];

  const docs = [
    {
      '@context': 'https://schema.org',
      '@type': 'MobileApplication',
      name: 'Lustimacy',
      operatingSystem: 'ANDROID',
      applicationCategory: 'SocialNetworkingApplication',
      inLanguage: locale.code,
      url: canonical,
      description: dict.meta && dict.meta.description,
      screenshot: screenshots,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EUR',
      },
      author: {
        '@type': 'Organization',
        name: 'Lustimacy',
        url: SITE_URL,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Lustimacy',
      url: SITE_URL,
      logo: `${SITE_URL}/assets/icon-512.png`,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'info@lustimacy.com',
      },
    },
    faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: {
              '@type': 'Answer',
              text: f.a,
            },
          })),
        }
      : null,
  ].filter(Boolean);

  return docs
    .map(
      (doc) =>
        `    <script type="application/ld+json">${JSON.stringify(doc)}</script>`
    )
    .join('\n');
}

function buildLocale(template, locale, allLocales) {
  const dictPath = path.join(I18N_DIR, `${locale.code}.json`);
  const dict = readJson(dictPath);

  let html = template;

  // Replace structured blocks first (they may contain {{ }} placeholders).
  html = html.replace('<!--LOCALE_META-->', localeMetaBlock(locale, allLocales));
  html = html.replace('<!--JSONLD-->', jsonLdBlock(locale, dict));
  html = html.replace('<!--FAQ_ITEMS-->', faqItemsBlock(dict));

  // Then dictionary substitutions.
  html = substitute(html, dict);

  // Inject locale code into <html lang>.
  html = html.replace(/<html\s+lang="[^"]*"/, `<html lang="${locale.code}"`);

  // Stamp build info.
  const stamp = `<!-- locale: ${locale.code} · built: ${new Date().toISOString()} -->`;
  html = html.replace('</body>', `${stamp}\n</body>`);

  const outDir = locale.isDefault ? ROOT : path.join(ROOT, locale.dir);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'index.html');
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`  ✓ ${path.relative(ROOT, outPath)}`);
}

function buildSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ];
  for (const locale of LOCALES) {
    lines.push('  <url>');
    lines.push(`    <loc>${SITE_URL}${locale.urlPath}</loc>`);
    lines.push(`    <lastmod>${today}</lastmod>`);
    lines.push('    <changefreq>weekly</changefreq>');
    lines.push(`    <priority>${locale.isDefault ? '1.0' : '0.9'}</priority>`);
    for (const alt of LOCALES) {
      lines.push(
        `    <xhtml:link rel="alternate" hreflang="${alt.code}" href="${SITE_URL}${alt.urlPath}"/>`
      );
    }
    lines.push(
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/"/>`
    );
    lines.push('  </url>');
  }
  // Static pages (English only — privacy/terms/contact are EN single-source).
  for (const slug of ['privacy.html', 'terms.html', 'contact.html', 'child-safety.html']) {
    lines.push('  <url>');
    lines.push(`    <loc>${SITE_URL}/${slug}</loc>`);
    lines.push(`    <lastmod>${today}</lastmod>`);
    lines.push('    <changefreq>monthly</changefreq>');
    lines.push('    <priority>0.4</priority>');
    lines.push('  </url>');
  }
  lines.push('</urlset>');
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), lines.join('\n') + '\n', 'utf8');
  console.log('  ✓ sitemap.xml');
}

function main() {
  console.log('Lustimacy landing — building locales');
  const template = fs.readFileSync(TEMPLATE, 'utf8');
  for (const locale of LOCALES) {
    buildLocale(template, locale, LOCALES);
  }
  buildSitemap();
  console.log('done.');
}

main();
