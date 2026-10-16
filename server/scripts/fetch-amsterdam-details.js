import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const API_URL = process.env.API_URL || 'https://beantrip-webapp-production.up.railway.app';
const CITY = process.env.CITY || 'Amsterdam';
const SHOP_DIR = path.join(__dirname, '../../public/images/shops');
const GALLERY_DIR = path.join(SHOP_DIR, 'gallery');
const OUT_FILE = path.join(__dirname, `${CITY.toLowerCase()}-details.json`);
const MAX_PHOTOS = 5;
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

if (!API_KEY) {
  console.error('GOOGLE_PLACES_API_KEY is not set in server/.env');
  process.exit(1);
}

fs.mkdirSync(GALLERY_DIR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gget(endpoint, params) {
  const url = new URL(`https://maps.googleapis.com/maps/api/place/${endpoint}/json`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('key', API_KEY);
  return (await fetch(url)).json();
}

function buildHours(periods) {
  if (!periods?.length) return null;
  const hours = {};
  for (const p of periods) {
    if (!p.open) continue;
    const day = DAYS[p.open.day];
    const fmt = (t) => `${t.slice(0, 2)}:${t.slice(2)}`;
    const range = p.close ? `${fmt(p.open.time)}-${fmt(p.close.time)}` : '00:00-24:00';
    hours[day] = hours[day] ? `${hours[day]}, ${range}` : range;
  }
  for (const d of DAYS) if (!hours[d]) hours[d] = null;
  return hours;
}

async function download(photoRef, dest) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/photo');
  url.searchParams.set('maxwidth', '1000');
  url.searchParams.set('photo_reference', photoRef);
  url.searchParams.set('key', API_KEY);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`photo ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  const { shops } = await fetch(`${API_URL}/api/shops`).then((r) => r.json());
  const targets = shops.filter((s) => s.city === CITY && s.placeholder);
  console.log(`${targets.length} placeholder shops in ${CITY}\n`);

  const results = [];
  for (const shop of targets) {
    console.log(`== ${shop.name} (${shop.slug}) -- ${shop.address}`);

    const found = await gget('findplacefromtext', {
      input: `${shop.name}, ${shop.address}`,
      inputtype: 'textquery',
      fields: 'place_id,name',
    });
    const cand = found.candidates?.[0];
    if (!cand) {
      console.log('   NOT FOUND on Google\n');
      continue;
    }

    const d = (
      await gget('details', {
        place_id: cand.place_id,
        fields: 'name,formatted_address,geometry,opening_hours,website,business_status,types,editorial_summary,photos,rating,user_ratings_total',
      })
    ).result;
    if (!d) {
      console.log('   no details\n');
      continue;
    }

    console.log(`   google name: ${d.name} | status: ${d.business_status} | rating: ${d.rating} (${d.user_ratings_total})`);
    console.log(`   types: ${(d.types || []).join(', ')}`);
    if (d.editorial_summary?.overview) console.log(`   summary: ${d.editorial_summary.overview}`);

    const refs = (d.photos || []).slice(0, MAX_PHOTOS).map((p) => p.photo_reference);
    const gallery = [];
    for (let i = 0; i < refs.length; i++) {
      await download(refs[i], path.join(GALLERY_DIR, `${shop.slug}-${i + 1}.jpg`));
      gallery.push(`/images/shops/gallery/${shop.slug}-${i + 1}.jpg`);
      await sleep(120);
    }
    let image = null;
    if (refs.length) {
      fs.copyFileSync(path.join(GALLERY_DIR, `${shop.slug}-1.jpg`), path.join(SHOP_DIR, `${shop.slug}.jpg`));
      image = `/images/shops/${shop.slug}.jpg`;
    }
    console.log(`   photos: ${gallery.length}, hours: ${d.opening_hours?.periods ? 'yes' : 'no'}, website: ${d.website || 'none'}\n`);

    results.push({
      slug: shop.slug,
      name: shop.name,
      businessStatus: d.business_status,
      types: d.types || [],
      editorialSummary: d.editorial_summary?.overview || null,
      address: d.formatted_address,
      lat: d.geometry?.location?.lat ?? null,
      lng: d.geometry?.location?.lng ?? null,
      hours: buildHours(d.opening_hours?.periods),
      website: d.website || null,
      image,
      images: gallery,
    });
    await sleep(200);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));
  console.log(`Wrote ${results.length} entries to ${path.basename(OUT_FILE)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
