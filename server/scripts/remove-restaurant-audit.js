import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

// Flagged by cross-checking every shop's Google place-type classification
// (restaurant without cafe) plus editorial summaries -- these turned out to
// be genuine restaurants/bars, not specialty coffee shops.
const slugs = JSON.parse(readFileSync(join(__dirname, 'restaurant-audit-slugs.json'), 'utf8'));

async function main() {
  const result = await prisma.shop.deleteMany({ where: { slug: { in: slugs } } });
  console.log('Deleted', result.count, 'of', slugs.length, 'shops.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
