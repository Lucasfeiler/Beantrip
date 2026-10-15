import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const shops = JSON.parse(readFileSync(join(__dirname, 'london-batch-1-data.json'), 'utf8'));

async function main() {
  const result = await prisma.shop.createMany({ data: shops, skipDuplicates: true });
  console.log('Inserted', result.count, 'of', shops.length, 'shops.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
