/**
 * Build-time prerender.
 *
 * The app is a client-rendered Vite + React SPA, so Firebase serves the same
 * ~2.5KB index.html shell for every route. Crawlers that do not execute JS --
 * and that includes the assistants people now ask for recommendations -- get an
 * empty page on all of them.
 *
 * This runs after `vite build` and writes a real HTML file for every public
 * route: correct title, meta description, canonical, Open Graph, JSON-LD and a
 * static content block. React hydrates over it on the client exactly as before.
 *
 * The route list comes from the same API call that generate-sitemap.js makes,
 * so new shops and new cities are picked up on the next build with no code
 * change. Private and account routes are never emitted.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = 'https://beantrip.com';
const API_URL = process.env.VITE_API_URL || 'https://beantrip-webapp-production.up.railway.app';
const DIST = path.join(__dirname, '../dist');
const OG_IMAGE = `${SITE_URL}/beantrip_feature_graphic.png`;

const SITE_DESCRIPTION =
  "Beantrip helps you discover the world's best specialty coffee shops. Browse reviews, filter by roast type and brewing method, and find your perfect cup.";

// Routes that exist in the router but must never be prerendered or indexed:
// account pages, admin and anything behind sign-in.
const PRIVATE_ROUTES = [
  '/auth', '/profile', '/admin', '/my-shop', '/favorites',
  '/onboarding', '/reset-password', '/verify-email', '/passport',
];

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const jsonLd = (obj) =>
  `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

function formatList(items) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Top neighbourhoods for a city, same shape the Explore page shows. */
function topNeighborhoods(cityShops) {
  const counts = cityShops.reduce((acc, s) => {
    if (s.neighborhood) acc[s.neighborhood] = (acc[s.neighborhood] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);
}

function shopRoute(shop) {
  const canonical = `/shop/${shop.slug}`;
  const title = `${shop.name} — Specialty Coffee Shop in ${shop.city} | Beantrip`;
  const description = shop.description
    ? shop.description.slice(0, 160)
    : `${shop.name} — specialty coffee in ${shop.neighborhood ? `${shop.neighborhood}, ` : ''}${shop.city}.`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CafeOrCoffeeShop',
    name: shop.name,
    image: shop.image ? `${SITE_URL}${shop.image}` : undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: shop.address,
      addressLocality: shop.city,
    },
    ...(shop.lat != null && shop.lng != null
      ? { geo: { '@type': 'GeoCoordinates', latitude: shop.lat, longitude: shop.lng } }
      : {}),
    ...(shop.rating > 0
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: shop.rating, reviewCount: shop.reviewCount } }
      : {}),
    ...(shop.website ? { url: shop.website } : {}),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Explore', item: `${SITE_URL}/explore` },
      { '@type': 'ListItem', position: 2, name: shop.city, item: `${SITE_URL}/explore/${shop.city.toLowerCase()}` },
      { '@type': 'ListItem', position: 3, name: shop.name, item: `${SITE_URL}${canonical}` },
    ],
  };

  const body = `
    <nav><a href="/explore/${esc(shop.city.toLowerCase())}">Back to ${esc(shop.city)}</a></nav>
    <h1>${esc(shop.name)}</h1>
    <p>${esc(shop.address)}${shop.neighborhood ? `, ${esc(shop.neighborhood)}` : ''}</p>
    ${shop.description ? `<p>${esc(shop.description)}</p>` : ''}
    ${shop.rating > 0 ? `<p>Rated ${esc(shop.rating)} from ${esc(shop.reviewCount)} reviews.</p>` : ''}
    ${Array.isArray(shop.tags) && shop.tags.length ? `<p>${shop.tags.map(esc).join(', ')}</p>` : ''}
    ${shop.website ? `<p><a href="${esc(shop.website)}" rel="nofollow">Website</a></p>` : ''}`;

  return { canonical, title, description, schemas: [schema, breadcrumb], body };
}

function cityRoute(city, cityShops) {
  const canonical = `/explore/${city.toLowerCase()}`;
  const count = cityShops.length;
  const hoods = topNeighborhoods(cityShops);
  const title = `Specialty Coffee in ${city} — Beantrip`;
  const description = `Discover ${count} specialty coffee shops in ${city}. Browse reviews, filter by roast type and brewing method, and find your next favorite spot.`;
  const intro = hoods.length
    ? `${count} specialty coffee shops across ${city}, including spots in ${formatList(hoods)}. Filter by roast type, brewing method, or vibe to find your next favorite.`
    : description;

  // The city pages carry no structured data at all today. An ItemList is what
  // lets a search engine or an assistant read the list as a list.
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Specialty coffee shops in ${city}`,
    numberOfItems: count,
    itemListElement: cityShops
      .filter((s) => !s.placeholder)
      .map((s, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/shop/${s.slug}`,
        name: s.name,
      })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Explore', item: `${SITE_URL}/explore` },
      { '@type': 'ListItem', position: 2, name: city, item: `${SITE_URL}${canonical}` },
    ],
  };

  // Every shop in the city is linked from here, which is also how the 705 shop
  // pages become reachable in a single crawl hop.
  const items = cityShops
    .filter((s) => !s.placeholder)
    .map(
      (s) =>
        `<li><a href="/shop/${esc(s.slug)}">${esc(s.name)}</a>${s.neighborhood ? ` — ${esc(s.neighborhood)}` : ''}${s.address ? `, ${esc(s.address)}` : ''}</li>`
    )
    .join('\n      ');

  const body = `
    <h1>Specialty Coffee in ${esc(city)}</h1>
    <p>${esc(intro)}</p>
    <ul>
      ${items}
    </ul>`;

  return { canonical, title, description, schemas: [itemList, breadcrumb], body };
}

function homeRoute(cities, shops) {
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Beantrip',
    url: `${SITE_URL}/`,
    description: SITE_DESCRIPTION,
  };
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Beantrip',
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/beantrip_icon_highcontrast.png`,
  };
  const body = `
    <h1>Find Your Perfect Coffee</h1>
    <p>${esc(SITE_DESCRIPTION)}</p>
    <p>${shops.filter((s) => !s.placeholder).length} specialty coffee shops across ${cities.length} cities.</p>
    <ul>
      ${cities.map((c) => `<li><a href="/explore/${esc(c.toLowerCase())}">Specialty coffee in ${esc(c)}</a></li>`).join('\n      ')}
    </ul>`;

  return {
    canonical: '/',
    title: 'Beantrip — Find Specialty Coffee Spots',
    description: SITE_DESCRIPTION,
    schemas: [website, org],
    body,
  };
}

/** Pages that are public but have no per-page data behind them. */
function staticRoute(p, title, description, body) {
  return { canonical: p, title, description, schemas: [], body };
}

function render(shell, route) {
  const url = `${SITE_URL}${route.canonical === '/' ? '/' : route.canonical}`;
  const head = [
    `<title>${esc(route.title)}</title>`,
    `<meta name="description" content="${esc(route.description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Beantrip" />`,
    `<meta property="og:title" content="${esc(route.title)}" />`,
    `<meta property="og:description" content="${esc(route.description)}" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(route.title)}" />`,
    `<meta name="twitter:description" content="${esc(route.description)}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
    ...route.schemas.map(jsonLd),
  ].join('\n    ');

  // Drop the shell's own title and social tags so no page ships two of anything.
  let html = shell
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/\s*<meta property="og:[^>]*>/gi, '')
    .replace(/\s*<meta name="twitter:[^>]*>/gi, '');

  html = html.replace('</head>', `  ${head}\n  </head>`);
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${route.body}\n    </div>`
  );
  return html;
}

function write(route, html) {
  const dir = route.canonical === '/' ? DIST : path.join(DIST, route.canonical);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

async function main() {
  const shellPath = path.join(DIST, 'index.html');
  if (!fs.existsSync(shellPath)) {
    console.error('dist/index.html not found. Run vite build first.');
    process.exit(1);
  }
  const shell = fs.readFileSync(shellPath, 'utf8');

  const { shops } = await fetch(`${API_URL}/api/shops`).then((r) => r.json());
  const located = shops.filter((s) => !s.placeholder);
  const cities = Array.from(new Set(shops.map((s) => s.city))).sort();

  const routes = [
    homeRoute(cities, shops),
    staticRoute('/explore', 'Explore the Coffee Scene — Beantrip', SITE_DESCRIPTION,
      `<h1>Explore the Coffee Scene</h1>\n    <ul>\n      ${cities
        .map((c) => `<li><a href="/explore/${esc(c.toLowerCase())}">Specialty coffee in ${esc(c)}</a></li>`)
        .join('\n      ')}\n    </ul>`),
    ...cities.map((c) => cityRoute(c, shops.filter((s) => s.city === c))),
    ...located.map(shopRoute),
  ];

  const emitted = new Set();
  let count = 0;
  for (const route of routes) {
    if (PRIVATE_ROUTES.includes(route.canonical)) continue;
    if (emitted.has(route.canonical)) continue;
    emitted.add(route.canonical);
    write(route, render(shell, route));
    count += 1;
  }

  console.log(`Prerendered ${count} routes (${cities.length} cities, ${located.length} shops).`);
}

main().catch((err) => {
  console.error('Prerender failed:', err.message);
  process.exit(1);
});
