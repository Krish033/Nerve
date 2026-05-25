import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async search(@Query('q') query: string, @Req() req) {
    // Pass the authenticated userId to restrict notification searches
    return this.searchService.globalSearch(query, req.user.id);
  }

  @Get('public')
  async publicSearch(@Query('q') query: string) {
    // Public search (no userId, so no private notifications)
    const results: any = await this.searchService.globalSearch(query);
    return {
      blogs: results.blogs || [],
      notifications: [], // No private notifications for public search
      settings: [], // Hide settings from public search for security
      users: [], // Hide users from public search for privacy
      timestamp: results.timestamp,
      query: results.query,
    };
  }
}
