import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.adBanner.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive() {
    return this.prisma.adBanner.findMany({
      where: { active: true },
    });
  }

  async create(data: any) {
    return this.prisma.adBanner.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return this.prisma.adBanner.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.adBanner.delete({
      where: { id },
    });
  }
}
