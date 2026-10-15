import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const updates = JSON.parse(readFileSync(join(__dirname, 'munich-gallery-updates.json'), 'utf8'));

async function main() {
  let updated = 0;
  for (const u of updates) {
    if (u.images.length === 0) continue;
    await prisma.shop.update({ where: { slug: u.slug }, data: { images: u.images } });
    updated++;
  }
  console.log('Updated galleries for', updated, 'of', updates.length, 'shops.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
