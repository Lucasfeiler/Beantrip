import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Confirmed via Google's own editorial summary mentioning no coffee at all
// (breakfast/brunch/tea-room identity instead), cross-checked against the
// stored description (all generic auto-import text, no hand-curated data
// to override the Google signal).
const slugs = [
  'yuna',
  'good-morning-monday',
  'yada-yada-breakfast-club',
  'twins-coffee',
  'the-haberdashery',
];

async function main() {
  const result = await prisma.shop.deleteMany({ where: { slug: { in: slugs } } });
  console.log('Deleted', result.count, 'of', slugs.length, 'shops.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
