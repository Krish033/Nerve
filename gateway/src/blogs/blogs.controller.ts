import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { BlogsService } from './blogs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthRequest {
  user: { id: string };
}

export interface BlogPayload {
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string | null;
  coverImage?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  published?: boolean;
}

@Controller('blogs')
@UseGuards(JwtAuthGuard)
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Post()
  create(@Body() createBlogDto: BlogPayload, @Req() req: AuthRequest) {
    // Assuming auth guard attaches user to req
    return this.blogsService.create({
      ...createBlogDto,
      authorId: req.user.id,
    });
  }

  @Get()
  findAll() {
    return this.blogsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blogsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBlogDto: BlogPayload) {
    return this.blogsService.update(id, updateBlogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blogsService.remove(id);
  }
}
