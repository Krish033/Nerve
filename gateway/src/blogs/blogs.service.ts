import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { BlogPayload } from './blogs.controller';

type BlogWriteData = BlogPayload & { authorId?: string };

@Injectable()
export class BlogsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.blog.findMany({
      include: { author: { select: { id: true, name: true, profilePicture: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.blog.findUnique({
      where: { id },
      include: { author: true },
    });
  }

  private slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || `asset-${Date.now()}`;
  }

  private async uniqueSlug(seed: string, currentId?: string) {
    const base = this.slugify(seed);
    let slug = base;
    let suffix = 1;

    while (true) {
      const existing = await this.prisma.blog.findUnique({ where: { slug } });
      if (!existing || existing.id === currentId) return slug;
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
  }

  async create(data: BlogWriteData) {
    const slug = await this.uniqueSlug(data.slug || data.title || 'asset');
    return this.prisma.blog.create({
      data: {
        title: data.title || 'Untitled',
        slug,
        content: data.content || '',
        excerpt: data.excerpt || null,
        coverImage: data.coverImage || null,
        authorId: data.authorId as string,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        seoKeywords: data.seoKeywords || null,
        published: data.published ?? false,
      },
    });
  }

  async update(id: string, data: BlogPayload) {
    const updateData = {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.content !== undefined ? { content: data.content } : {}),
      ...(data.excerpt !== undefined ? { excerpt: data.excerpt } : {}),
      ...(data.coverImage !== undefined ? { coverImage: data.coverImage } : {}),
      ...(data.seoTitle !== undefined ? { seoTitle: data.seoTitle } : {}),
      ...(data.seoDescription !== undefined ? { seoDescription: data.seoDescription } : {}),
      ...(data.seoKeywords !== undefined ? { seoKeywords: data.seoKeywords } : {}),
      ...(data.published !== undefined ? { published: data.published } : {}),
      ...(data.slug ? { slug: await this.uniqueSlug(data.slug, id) } : {}),
    };

    return this.prisma.blog.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    return this.prisma.blog.delete({
      where: { id },
    });
  }
}
