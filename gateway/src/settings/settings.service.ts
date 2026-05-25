import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.setting.findMany();
  }

  async findByGroup(group: string) {
    return this.prisma.setting.findMany({
      where: { group },
    });
  }

  async upsert(key: string, value: any, group?: string) {
    return this.prisma.setting.upsert({
      where: { key },
      update: { value, group },
      create: { key, value, group },
    });
  }

  async getByKey(key: string) {
    return this.prisma.setting.findUnique({
      where: { key },
    });
  }
}
