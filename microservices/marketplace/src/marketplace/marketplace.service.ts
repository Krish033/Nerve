import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);
  
  constructor(private prisma: PrismaService) {}

  async getItems(type?: string) {
    return this.prisma.marketplaceItem.findMany({
      where: { 
        ...(type && { type }),
        isActive: true 
      },
    });
  }

  async getThemes() {
    return this.prisma.marketplaceItem.findMany({
      where: { type: 'THEME', isActive: true },
    });
  }

  async getTheme(id: string) {
    const theme = await this.prisma.marketplaceItem.findUnique({ where: { id } });
    if (!theme) {
      throw new NotFoundException(`Theme with id ${id} not found`);
    }
    return theme;
  }

  async createTheme(data: any) {
    return this.prisma.marketplaceItem.create({
      data: {
        name: data.name,
        type: 'THEME',
        description: data.description,
        assets: data.assets,
        config: data.config,
        author: data.author,
      },
    });
  }

  async getUserThemes(userId: string) {
    return this.prisma.userInstalledItem.findMany({
      where: { userId },
      include: { item: true },
    });
  }

  async installTheme(userId: string, themeId: string) {
    // Ensure user exists in marketplace DB (auto-create if not)
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) {
      await this.prisma.user.create({
        data: {
          id: userId,
          firebaseUid: userId,
          email: `user-${userId.slice(0, 8)}@placeholder.com`,
          name: 'User',
        },
      });
    }
    
    // Check if theme exists
    const theme = await this.prisma.marketplaceItem.findUnique({
      where: { id: themeId },
    });
    
    if (!theme) {
      throw new NotFoundException(`Theme ${themeId} not found`);
    }
    
    // Check if already installed
    const existing = await this.prisma.userInstalledItem.findFirst({
      where: { userId, itemId: themeId },
    });
    
    if (existing) {
      return existing;
    }
    
    // Create new installation
    return this.prisma.userInstalledItem.create({
      data: {
        userId,
        itemId: themeId,
        isActive: false,
      },
      include: { item: true },
    });
  }

  async activateTheme(userId: string, themeId: string) {
    const item = await this.prisma.marketplaceItem.findUnique({ 
      where: { id: themeId }
    });
    
    if (!item) {
      throw new NotFoundException('Theme not found');
    }

    // Deactivate all items of the same type first
    await this.prisma.userInstalledItem.updateMany({
      where: { userId, item: { type: item.type } },
      data: { isActive: false },
    });

    // Find the user installed item
    const userItem = await this.prisma.userInstalledItem.findFirst({
      where: { userId, itemId: themeId },
    });
    
    if (!userItem) {
      throw new NotFoundException('Theme not installed');
    }

    // Activate the selected theme
    return this.prisma.userInstalledItem.update({
      where: { id: userItem.id },
      data: { isActive: true },
    });
  }

  async uninstallTheme(userId: string, themeId: string) {
    const userItem = await this.prisma.userInstalledItem.findFirst({
      where: { userId, itemId: themeId },
    });
    
    if (!userItem) {
      throw new NotFoundException('Theme not installed');
    }
    
    return this.prisma.userInstalledItem.delete({
      where: { id: userItem.id },
    });
  }
}
