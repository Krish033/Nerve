import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { themes } from './seed-data';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`Seeding ${themes.length} themes...`);
  for (const theme of themes) {
    await prisma.marketplaceItem.upsert({
      where: { name_type: { name: theme.name, type: theme.type } },
      update: theme,
      create: theme,
    });
  }

  console.log('Marketplace seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
