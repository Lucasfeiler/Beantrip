import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = 'https://beantrip.com';
const API_URL = process.env.VITE_API_URL || 'https://beantrip-webapp-production.up.railway.app';
const OUT_FILE = path.join(__dirname, '../public/sitemap.xml');

const STATIC_PATHS = [
  { path: '/', priority: '1.0' },
  { path: '/explore', priority: '0.9' },
  { path: '/map', priority: '0.7' },
  { path: '/near-me', priority: '0.6' },
  { path: '/news', priority: '0.6' },
  { path: '/events', priority: '0.6' },
  { path: '/gear', priority: '0.5' },
  { path: '/guides/best-coffee-shops-munich', priority: '0.7' },
  { path: '/about', priority: '0.5' },
  { path: '/add-shop', priority: '0.4' },
  { path: '/feedback', priority: '0.3' },
];

function urlEntry(loc, priority) {
  return `  <url>\n    <loc>${loc}</loc>\n    <priority>${priority}</priority>\n  </url>`;
}

async function main() {
  const { shops } = await fetch(`${API_URL}/api/shops`).then((r) => r.json());
  const located = shops.filter((s) => !s.placeholder);
  const cities = Array.from(new Set(shops.map((s) => s.city))).sort();

  const entries = [
    ...STATIC_PATHS.map((p) => urlEntry(`${SITE_URL}${p.path}`, p.priority)),
    ...cities.map((c) => urlEntry(`${SITE_URL}/explore/${c.toLowerCase()}`, '0.8')),
    ...located.map((s) => urlEntry(`${SITE_URL}/shop/${s.slug}`, '0.8')),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;

  fs.writeFileSync(OUT_FILE, xml);
  console.log(`Wrote sitemap.xml with ${entries.length} URLs (${cities.length} cities, ${located.length} shops).`);
}

main().catch((err) => {
  console.error('Failed to generate sitemap:', err.message);
  process.exit(1);
});
