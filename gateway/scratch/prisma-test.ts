import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('Connecting to database...');
  try {
    const allBlogs = await prisma.blog.findMany({
      select: { title: true, published: true }
    });
    console.log('All Blogs in DB:', allBlogs);

    const match = await prisma.blog.findMany({
      where: {
        OR: [
          { title: { contains: 'future', mode: 'insensitive' } },
          { content: { contains: 'future', mode: 'insensitive' } },
        ],
      },
    });
    console.log(`Found ${match.length} blogs matching "future"`);
  } catch (error) {
    console.error('Prisma test failed:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
