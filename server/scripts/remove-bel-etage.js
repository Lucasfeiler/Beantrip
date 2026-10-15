import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.shop.deleteMany({ where: { slug: 'bel-etage' } });
  console.log('Deleted', result.count, 'shop(s).');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
