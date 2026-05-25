import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async findAll() {
    return this.settingsService.findAll();
  }

  @Get('group/:group')
  async findByGroup(@Param('group') group: string) {
    return this.settingsService.findByGroup(group);
  }

  @Post()
  async upsert(@Body() data: { key: string; value: any; group?: string }) {
    return this.settingsService.upsert(data.key, data.value, data.group);
  }

  @Get(':key')
  async getByKey(@Param('key') key: string) {
    return this.settingsService.getByKey(key);
  }
}
