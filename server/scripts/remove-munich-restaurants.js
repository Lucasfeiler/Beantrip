import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Flagged after the batch-1 import as restaurants, not specialty coffee shops.
const slugs = [
  'wildmosers-restaurant-cafe-am-marienplatz-munchen',
  'neuhauser',
  'argana-taste-of-morocco',
];

async function main() {
  const result = await prisma.shop.deleteMany({ where: { slug: { in: slugs } } });
  console.log('Deleted', result.count, 'of', slugs.length, 'shops.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
