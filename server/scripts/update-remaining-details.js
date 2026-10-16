import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

// suessi-vienna: Google lists it as permanently closed.
// salzi-vienna: a bar/bistro, not a coffee shop -- Beantrip doesn't list bars or restaurants.
const REMOVE = ['suessi-vienna', 'salzi-vienna'];
const SKIP = [];

const COUNTRY_SUFFIX = /, (Austria|United Kingdom)$/;

async function apply(file) {
  const entries = JSON.parse(readFileSync(join(__dirname, file), 'utf8'));
  let updated = 0;
  for (const e of entries) {
    if (REMOVE.includes(e.slug) || SKIP.includes(e.slug)) continue;
    const result = await prisma.shop.updateMany({
      where: { slug: e.slug },
      data: {
        address: e.address.replace(COUNTRY_SUFFIX, ''),
        lat: e.lat,
        lng: e.lng,
        hours: e.hours,
        website: e.website,
        image: e.image,
        images: e.images,
        placeholder: false,
      },
    });
    updated += result.count;
    if (!result.count) console.log('NOT FOUND', e.slug);
  }
  console.log(`${file}: updated ${updated} of ${entries.length} shops.`);
}

async function main() {
  await apply('vienna-details.json');
  await apply('london-details.json');
  const removed = await prisma.shop.deleteMany({ where: { slug: { in: REMOVE } } });
  console.log(`Removed ${removed.count} shop(s) (closed or not a coffee shop).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
