import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 10000,
      max: 20,
      idleTimeoutMillis: 30000,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    let retries = 5;
    while (retries > 0) {
      try {
        await this.$connect();
        await this.$executeRaw`SELECT 1`;
        this.logger.log('Neon Database active connection established.');
        break;
      } catch (err: any) {
        this.logger.error(`Database connection failure. Retries left: ${retries - 1}`);
        retries -= 1;
        if (retries === 0) throw err;
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection terminated.');
  }
}
