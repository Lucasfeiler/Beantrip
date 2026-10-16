import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const entries = JSON.parse(readFileSync(join(__dirname, 'amsterdam-details.json'), 'utf8'));

// The addresses stored for these four did not exist on Google; the matched
// places are the real, operating cafes, so their neighborhood follows the
// corrected address.
const OVERRIDES = {
  'monks-coffee-roasters': { neighborhood: 'Westpoort' },
  'screaming-beans': { neighborhood: 'Centrum' },
  toki: { neighborhood: 'Centrum' },
  caffenation: {
    neighborhood: 'West',
    description: 'Specialty coffee without compromising on quality.',
  },
};

async function main() {
  let updated = 0;
  for (const e of entries) {
    const data = {
      address: e.address.replace(/, Netherlands$/, ''),
      lat: e.lat,
      lng: e.lng,
      hours: e.hours,
      website: e.website,
      image: e.image,
      images: e.images,
      placeholder: false,
      ...(OVERRIDES[e.slug] ?? {}),
    };
    const result = await prisma.shop.updateMany({ where: { slug: e.slug }, data });
    updated += result.count;
    console.log(result.count ? 'Updated' : 'NOT FOUND', e.slug);
  }
  console.log(`Updated ${updated} of ${entries.length} Amsterdam shops.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
