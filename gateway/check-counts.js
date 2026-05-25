const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const activity = await prisma.activityLog.count();
  const errors = await prisma.errorLog.count();
  const access = await prisma.accessLog.count();
  const sessions = await prisma.session.count();
  const users = await prisma.user.count();

  console.log({ activity, errors, access, sessions, users });
  
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
