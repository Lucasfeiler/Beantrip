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
import { YEAR as MUNICH_YEAR, PICKS as MUNICH_PICKS } from '../src/data/best-coffee-munich.js';

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

// Everything written here is marked data-prerendered. That marker is only an
// identification: it says the tag describes the URL that was fetched, not the page
// React is showing now. Layout.jsx uses it twice -- to drop a prerendered tag once
// the app has rendered its own copy, and to drop the whole set once the app
// navigates somewhere else. Tags the app never renders, such as the social tags
// and the lists, simply stay until one of those two things happens.
const jsonLd = (obj) =>
  `<script type="application/ld+json" data-prerendered>${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

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


/**
 * Some shops have more than one branch under the same name in the same city
 * (LAP COFFEE has three in Berlin). Those extra branches are slugged -2, -3,
 * which is the only per-shop signal that says "there is already one of these".
 * They get a locator in the title so no two pages share one. The first branch
 * keeps the short title, so only the extras get longer.
 *
 * ShopDetail.jsx uses the same rule, so the title a crawler is served and the
 * title React renders are the same string.
 */
function shopLocator(shop) {
  if (shop.neighborhood && !shop.name.toLowerCase().includes(shop.neighborhood.toLowerCase())) {
    return shop.neighborhood;
  }
  const street = (shop.address || '')
    .split(',')[0]
    .trim()
    .replace(/^\d+[A-Za-z]?[\s-]+/, '')
    .replace(/\s+\d+[A-Za-z]?$/, '');
  return street || null;
}

export function shopTitle(shop) {
  if (/-\d+$/.test(shop.slug)) {
    const loc = shopLocator(shop);
    if (loc) return `${shop.name} \u2014 ${loc} \u2014 Specialty Coffee Shop in ${shop.city} | Beantrip`;
  }
  return `${shop.name} \u2014 Specialty Coffee Shop in ${shop.city} | Beantrip`;
}

function shopRoute(shop) {
  const canonical = `/shop/${shop.slug}`;
  const title = shopTitle(shop);
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
  const listed = cityShops.filter((s) => !s.placeholder);

  // A city whose entries are all placeholders has no shop pages to point at.
  // Emitting an empty ItemList there would be thin structured data, so we skip it
  // and let the page carry the breadcrumb only until real shops are added.
  const itemList =
    listed.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: `Specialty coffee shops in ${city}`,
          numberOfItems: listed.length,
          itemListElement: listed.map((s, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${SITE_URL}/shop/${s.slug}`,
            name: s.name,
          })),
        }
      : null;

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
  const items = listed
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

  return { canonical, title, description, schemas: itemList ? [itemList, breadcrumb] : [breadcrumb], body };
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

/** The explore hub: a list of the cities, said twice, once for people and once for machines. */
function exploreRoute(cities, body) {
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Cities on Beantrip',
    numberOfItems: cities.length,
    itemListElement: cities.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/explore/${c.toLowerCase()}`,
      name: `Specialty coffee in ${c}`,
    })),
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Explore', item: `${SITE_URL}/explore` }],
  };
  return {
    canonical: '/explore',
    title: 'Explore the Coffee Scene \u2014 Beantrip',
    description: SITE_DESCRIPTION,
    schemas: [itemList, breadcrumb],
    body,
  };
}


/**
 * The rest of the public routes in the sitemap. Each one's title and description
 * is the same string its page renders, so the served page and the rendered page
 * agree. Three of them (near me, add shop, feedback) had no meta of their own;
 * they now do, in the page as well as here.
 */
function listPageRoute({ canonical, title, description, heading, intro, links = [], schemas = [] }) {
  const body = `
    <h1>${esc(heading)}</h1>
    <p>${esc(intro)}</p>${
      links.length
        ? `\n    <ul>\n      ${links
            .map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`)
            .join('\n      ')}\n    </ul>`
        : ''
    }`;
  return { canonical, title, description, schemas, body };
}

function munichGuideRoute() {
  const canonical = '/guides/best-coffee-shops-munich';
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Best Coffee Shops in Munich (${MUNICH_YEAR})`,
    itemListElement: MUNICH_PICKS.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/shop/${p.slug}`,
      name: p.name,
    })),
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Munich', item: `${SITE_URL}/explore/munich` },
      { '@type': 'ListItem', position: 2, name: `Best Coffee Shops in Munich (${MUNICH_YEAR})`, item: `${SITE_URL}${canonical}` },
    ],
  };
  const body = `
    <h1>Best Coffee Shops in Munich (${MUNICH_YEAR})</h1>
    <p>Our pick of ${MUNICH_PICKS.length} standout specialty coffee shops across Munich.</p>
    <ol>
      ${MUNICH_PICKS.map(
        (p) =>
          `<li><a href="/shop/${esc(p.slug)}">${esc(p.name)}</a>${p.neighborhood ? `, ${esc(p.neighborhood)}` : ''}${p.blurb ? ` &mdash; ${esc(p.blurb)}` : ''}</li>`
      ).join('\n      ')}
    </ol>`;
  return {
    canonical,
    title: `Best Coffee Shops in Munich (${MUNICH_YEAR}) | Beantrip`,
    description: `Our pick of ${MUNICH_PICKS.length} standout specialty coffee shops across Munich, from Glockenbach to Altstadt to Schwabing, with real ratings and what makes each one worth the visit.`,
    schemas: [itemList, breadcrumb],
    body,
  };
}

function otherRoutes(cities, located) {
  const cityLinks = cities.map((c) => ({
    href: `/explore/${c.toLowerCase()}`,
    label: `Specialty coffee in ${c}`,
  }));

  return [
    listPageRoute({
      canonical: '/map',
      title: 'Coffee Map \u2014 Beantrip',
      description: `Explore ${located.length} specialty coffee shops on the map. Find the closest spot wherever you are.`,
      heading: 'Coffee Map',
      intro: `All ${located.length} specialty coffee shops on one map, across ${cities.length} cities.`,
      links: cityLinks,
    }),
    listPageRoute({
      canonical: '/near-me',
      title: 'Coffee Near Me \u2014 Beantrip',
      description: 'Find specialty coffee shops near you, wherever you are, with opening hours and directions.',
      heading: 'Coffee Near Me',
      intro: 'Specialty coffee shops closest to you. Browse by city if you would rather not share your location.',
      links: cityLinks,
    }),
    listPageRoute({
      canonical: '/news',
      title: 'Coffee News \u2014 Beantrip',
      description: 'Stories, updates, and expert commentary from the specialty coffee world, curated by Beantrip.',
      heading: 'News',
      intro: 'Stories, updates, and expert commentary from the coffee world.',
    }),
    listPageRoute({
      canonical: '/events',
      title: 'Coffee Festivals & Events \u2014 Beantrip',
      description: 'Discover upcoming coffee festivals and specialty coffee events, curated by Beantrip.',
      heading: 'Events',
      intro: 'Coffee festivals and events, curated for you.',
    }),
    listPageRoute({
      canonical: '/gear',
      title: 'Coffee Gear We Love \u2014 Beantrip',
      description: 'Coffee equipment, brewers, and beans recommended by Beantrip for specialty coffee lovers.',
      heading: 'Gear We Love',
      intro: 'Coffee equipment and beans we recommend.',
    }),
    munichGuideRoute(),
    listPageRoute({
      canonical: '/add-shop',
      title: 'Add a Coffee Spot \u2014 Beantrip',
      description: 'Know a specialty coffee shop that belongs on Beantrip? Send it in and we will take a look.',
      heading: 'Add a Coffee Spot',
      intro: 'Know a specialty coffee shop that belongs here? Send it in and we will take a look.',
    }),
    listPageRoute({
      canonical: '/feedback',
      title: 'Feedback \u2014 Beantrip',
      description: 'Tell us what would make Beantrip more useful. Beantrip is still being built and every note helps.',
      heading: 'Help shape Beantrip',
      intro: 'Tell us what would make Beantrip more useful.',
    }),
  ];
}

function render(shell, route) {
  const url = `${SITE_URL}${route.canonical === '/' ? '/' : route.canonical}`;
  const head = [
    `<title data-prerendered>${esc(route.title)}</title>`,
    `<meta data-prerendered name="description" content="${esc(route.description)}" />`,
    `<link data-prerendered rel="canonical" href="${esc(url)}" />`,
    `<meta data-prerendered property="og:type" content="website" />`,
    `<meta data-prerendered property="og:site_name" content="Beantrip" />`,
    `<meta data-prerendered property="og:title" content="${esc(route.title)}" />`,
    `<meta data-prerendered property="og:description" content="${esc(route.description)}" />`,
    `<meta data-prerendered property="og:image" content="${OG_IMAGE}" />`,
    `<meta data-prerendered property="og:url" content="${esc(url)}" />`,
    `<meta data-prerendered name="twitter:card" content="summary_large_image" />`,
    `<meta data-prerendered name="twitter:title" content="${esc(route.title)}" />`,
    `<meta data-prerendered name="twitter:description" content="${esc(route.description)}" />`,
    `<meta data-prerendered name="twitter:image" content="${OG_IMAGE}" />`,
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
    exploreRoute(cities,
      `<h1>Explore the Coffee Scene</h1>\n    <ul>\n      ${cities
        .map((c) => `<li><a href="/explore/${esc(c.toLowerCase())}">Specialty coffee in ${esc(c)}</a></li>`)
        .join('\n      ')}\n    </ul>`),
    ...cities.map((c) => cityRoute(c, shops.filter((s) => s.city === c))),
    ...otherRoutes(cities, located),
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

  console.log(`Prerendered ${count} routes (${cities.length} cities, ${located.length} shops, ${routes.length - cities.length - located.length} other pages).`);
}

main().catch((err) => {
  console.error('Prerender failed:', err.message);
  process.exit(1);
});
