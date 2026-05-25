import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('Deep scanning all nodes for "future"...');
  try {
    const [blogs, notifications, settings, users] = await Promise.all([
      prisma.blog.findMany({ where: { OR: [{ title: { contains: 'future', mode: 'insensitive' } }, { content: { contains: 'future', mode: 'insensitive' } }] } }),
      prisma.notification.findMany({ where: { OR: [{ title: { contains: 'future', mode: 'insensitive' } }, { message: { contains: 'future', mode: 'insensitive' } }] } }),
      prisma.setting.findMany({ where: { key: { contains: 'future', mode: 'insensitive' } } }),
      prisma.user.findMany({ where: { OR: [{ name: { contains: 'future', mode: 'insensitive' } }, { email: { contains: 'future', mode: 'insensitive' } }] } }),
    ]);

    console.log('Results:');
    console.log(`- Blogs: ${blogs.length}`);
    console.log(`- Notifications: ${notifications.length}`);
    console.log(`- Settings: ${settings.length}`);
    console.log(`- Users: ${users.length}`);

    if (blogs.length > 0) console.log('Blog Titles:', blogs.map(b => b.title));
    if (notifications.length > 0) console.log('Notification Titles:', notifications.map(n => n.title));

  } catch (error) {
    console.error('Deep scan failed:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
