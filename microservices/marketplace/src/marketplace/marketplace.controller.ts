import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('items')
  getItems(@Query('type') type: string) {
    return this.marketplaceService.getItems(type);
  }

  @Get('themes')
  getThemes() {
    return this.marketplaceService.getThemes();
  }

  @Get('themes/:id')
  getTheme(@Param('id') id: string) {
    return this.marketplaceService.getTheme(id);
  }

  @Post('themes')
  createTheme(@Body() data: any) {
    return this.marketplaceService.createTheme(data);
  }

  // User endpoints
  @Get('users/:userId/themes')
  getUserThemes(@Param('userId') userId: string) {
    return this.marketplaceService.getUserThemes(userId);
  }

  @Post('users/:userId/themes/:themeId/install')
  installTheme(@Param('userId') userId: string, @Param('themeId') themeId: string) {
    return this.marketplaceService.installTheme(userId, themeId);
  }

  @Post('users/:userId/themes/:themeId/activate')
  activateTheme(@Param('userId') userId: string, @Param('themeId') themeId: string) {
    return this.marketplaceService.activateTheme(userId, themeId);
  }

  @Delete('users/:userId/themes/:themeId')
  uninstallTheme(@Param('userId') userId: string, @Param('themeId') themeId: string) {
    return this.marketplaceService.uninstallTheme(userId, themeId);
  }
}
