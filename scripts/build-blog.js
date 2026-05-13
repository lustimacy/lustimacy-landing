#!/usr/bin/env node
// Lustimacy blog — markdown build.
//
// Reads blog/posts/*.md (with YAML-ish front-matter) and writes:
//   /blog/index.html
//   /blog/<slug>/index.html
//
// Each post's front-matter:
//   ---
//   title: ...
//   description: ...
//   slug: what-is-the-lifestyle
//   locale: en   (or de, nl)
//   published: 2026-05-12
//   updated: 2026-05-12   (optional)
//   author: Albert A.
//   tags: [Lifestyle 101, Couples]
//   cover: /assets/images/blog/foo.jpg   (optional)
//   ---
//
// The body is Markdown (subset — see toHtml() for what's supported).
//
// Zero deps. Run via `node scripts/build-blog.js` or as part of the main
// build (the main build.js can call this).

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'blog/posts');
const TPL_DIR = path.join(ROOT, 'blog/templates');
const SITE_URL = 'https://lustimacy.com';

function readText(p) { return fs.readFileSync(p, 'utf8'); }

function parseFrontMatter(raw) {
    const m = raw.match(/^---\s*\n([\s\S]+?)\n---\s*\n?/);
    if (!m) return { meta: {}, body: raw };
    const fm = m[1];
    const body = raw.slice(m[0].length);
    const meta = {};
    let currentKey = null;
    for (const line of fm.split('\n')) {
        const kvMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
        if (kvMatch) {
            currentKey = kvMatch[1];
            const value = kvMatch[2].trim();
            if (value.startsWith('[') && value.endsWith(']')) {
                meta[currentKey] = value
                    .slice(1, -1)
                    .split(',')
                    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
                    .filter(Boolean);
            } else if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                meta[currentKey] = value.slice(1, -1);
            } else {
                meta[currentKey] = value;
            }
        }
    }
    return { meta, body };
}

function escHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Minimal Markdown -> HTML.
// Supported: headings (## ###), paragraphs, bold (**), italic (*),
// links [text](url), bullet lists (- ), ordered lists (1. ), code (`),
// blockquotes (> ), horizontal rule (---), inline HTML pass-through.
function toHtml(md) {
    const lines = md.split('\n');
    const out = [];
    let i = 0;

    function inlineFmt(text) {
        // Escape HTML, then re-introduce our allowed inline markup
        let s = escHtml(text);
        // Bold + italic (order matters: ** first)
        s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        // Inline code
        s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
        // Links [text](url) — be careful, the bracket chars were escaped to &lt;
        // No, [ ] aren't HTML-escaped by escHtml. Good.
        s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, url) => {
            const safeUrl = url.replace(/"/g, '%22');
            const isInternal = safeUrl.startsWith('/') || safeUrl.startsWith(SITE_URL);
            const target = isInternal ? '' : ' target="_blank" rel="noopener"';
            return `<a href="${safeUrl}"${target}>${text}</a>`;
        });
        return s;
    }

    while (i < lines.length) {
        const line = lines[i];

        if (/^---\s*$/.test(line)) {
            out.push('<hr>');
            i++;
            continue;
        }
        const heading = line.match(/^(#{1,6})\s+(.+)$/);
        if (heading) {
            const lvl = Math.min(6, Math.max(2, heading[1].length + 1)); // demote: # → h2
            out.push(`<h${lvl}>${inlineFmt(heading[2])}</h${lvl}>`);
            i++;
            continue;
        }
        if (/^>\s+/.test(line)) {
            const quote = [];
            while (i < lines.length && /^>\s+/.test(lines[i])) {
                quote.push(inlineFmt(lines[i].replace(/^>\s+/, '')));
                i++;
            }
            out.push(`<blockquote><p>${quote.join('<br>')}</p></blockquote>`);
            continue;
        }
        if (/^[-*]\s+/.test(line)) {
            const items = [];
            while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
                items.push(`<li>${inlineFmt(lines[i].replace(/^[-*]\s+/, ''))}</li>`);
                i++;
            }
            out.push(`<ul>${items.join('')}</ul>`);
            continue;
        }
        if (/^\d+\.\s+/.test(line)) {
            const items = [];
            while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
                items.push(`<li>${inlineFmt(lines[i].replace(/^\d+\.\s+/, ''))}</li>`);
                i++;
            }
            out.push(`<ol>${items.join('')}</ol>`);
            continue;
        }
        if (line.trim() === '') {
            i++;
            continue;
        }
        // Paragraph: collect contiguous non-blank lines
        const para = [];
        while (i < lines.length && lines[i].trim() !== '' &&
            !/^#{1,6}\s/.test(lines[i]) &&
            !/^[-*]\s/.test(lines[i]) &&
            !/^\d+\.\s/.test(lines[i]) &&
            !/^>\s/.test(lines[i]) &&
            !/^---\s*$/.test(lines[i])) {
            para.push(lines[i]);
            i++;
        }
        if (para.length) {
            out.push(`<p>${inlineFmt(para.join(' '))}</p>`);
        }
    }
    return out.join('\n');
}

function loadPosts() {
    if (!fs.existsSync(POSTS_DIR)) return [];
    const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));
    const posts = [];
    for (const file of files) {
        const raw = readText(path.join(POSTS_DIR, file));
        const { meta, body } = parseFrontMatter(raw);
        if (!meta.slug) {
            console.warn(`  [warn] ${file} has no slug — skipping`);
            continue;
        }
        const html = toHtml(body);
        const readingMinutes = Math.max(2, Math.round(body.split(/\s+/).length / 220));
        posts.push({
            file,
            slug: meta.slug,
            title: meta.title || meta.slug,
            description: meta.description || '',
            locale: meta.locale || 'en',
            published: meta.published || '',
            updated: meta.updated || meta.published || '',
            author: meta.author || 'Albert A.',
            tags: Array.isArray(meta.tags) ? meta.tags : [],
            cover: meta.cover || '',
            html,
            readingMinutes,
        });
    }
    posts.sort((a, b) => (b.published || '').localeCompare(a.published || ''));
    return posts;
}

function postPageHtml(tpl, post, allPosts) {
    const canonical = `${SITE_URL}/blog/${post.slug}/`;
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.description,
        author: { '@type': 'Person', name: post.author },
        publisher: {
            '@type': 'Organization',
            name: 'Lustimacy',
            logo: { '@type': 'ImageObject', url: `${SITE_URL}/assets/icon-512.png` },
        },
        datePublished: post.published,
        dateModified: post.updated,
        mainEntityOfPage: canonical,
    };
    if (post.cover) jsonLd.image = `${SITE_URL}${post.cover}`;

    const related = allPosts
        .filter((p) => p.slug !== post.slug && p.locale === post.locale)
        .slice(0, 3)
        .map(
            (p) =>
                `<a class="related-card" href="/blog/${p.slug}/"><div class="related-card__title">${escHtml(p.title)}</div><div class="related-card__meta">${escHtml(p.published)} · ${p.readingMinutes} min read</div></a>`,
        )
        .join('');

    return tpl
        .replace(/\{\{title\}\}/g, escHtml(post.title))
        .replace(/\{\{description\}\}/g, escHtml(post.description))
        .replace(/\{\{canonical\}\}/g, canonical)
        .replace(/\{\{published\}\}/g, escHtml(post.published))
        .replace(/\{\{updated\}\}/g, escHtml(post.updated))
        .replace(/\{\{author\}\}/g, escHtml(post.author))
        .replace(/\{\{readingMinutes\}\}/g, String(post.readingMinutes))
        .replace(/\{\{locale\}\}/g, escHtml(post.locale))
        .replace(/\{\{tags\}\}/g, post.tags.map((t) => `<span class="tag">${escHtml(t)}</span>`).join(''))
        .replace(/\{\{body\}\}/g, post.html)
        .replace(/\{\{related\}\}/g, related)
        .replace(/\{\{jsonLd\}\}/g, `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`)
        .replace(/\{\{ogImage\}\}/g, post.cover ? `${SITE_URL}${post.cover}` : `${SITE_URL}/assets/og-feature.jpg`);
}

function indexPageHtml(tpl, posts) {
    const cards = posts
        .map(
            (p) => `<a class="post-card" href="/blog/${p.slug}/">
        <div class="post-card__tag">${p.tags[0] ? escHtml(p.tags[0]) : 'Lustimacy'}</div>
        <h2 class="post-card__title">${escHtml(p.title)}</h2>
        <p class="post-card__desc">${escHtml(p.description)}</p>
        <div class="post-card__meta">${escHtml(p.published)} · ${p.readingMinutes} min read</div>
    </a>`,
        )
        .join('');
    return tpl
        .replace(/\{\{cards\}\}/g, cards)
        .replace(/\{\{count\}\}/g, String(posts.length));
}

function buildSitemapBlog(posts) {
    return posts
        .map(
            (p) => `  <url>
    <loc>${SITE_URL}/blog/${p.slug}/</loc>
    <lastmod>${p.updated || p.published}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`,
        )
        .join('\n');
}

function build() {
    console.log('Lustimacy blog — building');
    const posts = loadPosts();
    console.log(`  loaded ${posts.length} posts`);

    if (posts.length === 0) {
        console.log('  no posts to build');
        return;
    }

    const postTpl = readText(path.join(TPL_DIR, 'post.html'));
    const indexTpl = readText(path.join(TPL_DIR, 'index.html'));

    // Per-post pages
    for (const post of posts) {
        const outDir = path.join(ROOT, 'blog', post.slug);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        const html = postPageHtml(postTpl, post, posts);
        fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
        console.log(`  ✓ /blog/${post.slug}/`);
    }

    // Index page
    const indexHtml = indexPageHtml(indexTpl, posts);
    const blogDir = path.join(ROOT, 'blog');
    if (!fs.existsSync(blogDir)) fs.mkdirSync(blogDir, { recursive: true });
    fs.writeFileSync(path.join(blogDir, 'index.html'), indexHtml, 'utf8');
    console.log('  ✓ /blog/');

    // Sitemap fragment — appended to root sitemap by main build.js
    const sitemapFragment = buildSitemapBlog(posts);
    fs.writeFileSync(path.join(ROOT, '.blog-sitemap.xml'), sitemapFragment, 'utf8');
    console.log('  ✓ .blog-sitemap.xml (fragment)');

    console.log('done.');
}

if (require.main === module) build();
module.exports = { build, loadPosts };
