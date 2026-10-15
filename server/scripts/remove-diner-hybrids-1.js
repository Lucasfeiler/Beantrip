import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Confirmed greasy-spoon/diner-style places, not specialty coffee.
const slugs = ['regency-cafe', 'premises-cafe-bistro'];

async function main() {
  const result = await prisma.shop.deleteMany({ where: { slug: { in: slugs } } });
  console.log('Deleted', result.count, 'of', slugs.length, 'shops.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
