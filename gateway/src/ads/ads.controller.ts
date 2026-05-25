import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AdsService } from './ads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ads')
@UseGuards(JwtAuthGuard)
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Post()
  create(@Body() createAdDto: any) {
    return this.adsService.create(createAdDto);
  }

  @Get()
  findAll() {
    return this.adsService.findAll();
  }

  @Get('active')
  findActive() {
    return this.adsService.findActive();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAdDto: any) {
    return this.adsService.update(id, updateAdDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adsService.remove(id);
  }
}
