import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly MESSAGING_URL = process.env.MESSAGING_URL || 'http://localhost:3001';

  // Temporary Mock Data for consistency with frontend
  private readonly MOCK_BLOGS = [
    { id: 'mock-b1', title: 'The Future of Neural Gateways', content: 'Exploring the evolution of neural architecture...', published: true, author: 'Admin', date: 'Oct 12, 2026', views: '1.2k', slug: 'future-neural-gateways' },
    { id: 'mock-b2', title: 'Securing Decentralized Microservices', content: 'Deep dive into security protocols...', published: false, author: 'S. Varma', date: 'Oct 10, 2026', views: '0', slug: 'securing-microservices' },
    { id: 'mock-b3', title: 'Nerve Architecture Deep Dive', content: 'The technical specifications of the Nerve platform.', published: true, author: 'Admin', date: 'Oct 08, 2026', views: '4k', slug: 'nerve-architecture' },
  ];

  private readonly MOCK_NEWS = [
    { id: 'mock-n1', title: 'System Nodes Scaling Architecture', content: 'Guidelines for scaling intelligence nodes across the global matrix.', published: true, author: 'Admin', date: 'Oct 12, 2026', views: '2.4k' },
    { id: 'mock-n2', title: 'Neural Gateways Now Offline', content: 'Alert: Several core gateways have been decommissioned for maintenance.', published: false, author: 'S. Varma', date: 'Oct 10, 2026', views: '0' },
    { id: 'mock-n3', title: 'Global Database Sharding Updates', content: 'New sharding protocols implemented for the Nurve data core.', published: true, author: 'Admin', date: 'Oct 08, 2026', views: '8.1k' },
  ];

  constructor(private prisma: PrismaService) {}

  async globalSearch(query: string, userId?: string) {
    if (!query || query.length < 2) return {
      blogs: [], news: [], notifications: [], settings: [], users: [], chats: { messages: [], conversations: [] },
      logs: { activity: [], errors: [], access: [] },
      timestamp: new Date().toISOString(),
      query,
    };

    this.logger.log(`Performing deep global search for: "${query}"`);

    // 1. Search Core Gateway Models & Intelligence Logs
    const [dbBlogs, notifications, settings, users, activityLogs, errorLogs, accessLogs] = await Promise.all([
      this.prisma.blog.findMany({
        where: { OR: [{ title: { contains: query, mode: 'insensitive' } }, { content: { contains: query, mode: 'insensitive' } }] },
        take: 5,
      }),
      this.prisma.notification.findMany({
        where: { AND: [userId ? { userId } : {}, { OR: [{ title: { contains: query, mode: 'insensitive' } }, { message: { contains: query, mode: 'insensitive' } }] }] },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.setting.findMany({
        where: { OR: [{ key: { contains: query, mode: 'insensitive' } }, { group: { contains: query, mode: 'insensitive' } }] },
        take: 10,
      }),
      this.prisma.user.findMany({
        where: { OR: [{ name: { contains: query, mode: 'insensitive' } }, { email: { contains: query, mode: 'insensitive' } }] },
        select: { id: true, name: true, email: true },
        take: 5,
      }),
      this.prisma.activityLog.findMany({
        where: { OR: [{ action: { contains: query, mode: 'insensitive' } }, { details: { contains: query, mode: 'insensitive' } }] },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.errorLog.findMany({
        where: { OR: [{ type: { contains: query, mode: 'insensitive' } }, { message: { contains: query, mode: 'insensitive' } }] },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.accessLog.findMany({
        where: { OR: [{ path: { contains: query, mode: 'insensitive' } }, { ip: { contains: query, mode: 'insensitive' } }] },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // 2. Search Messaging
    let chats = { messages: [], conversations: [] };
    if (userId) {
      try {
        const response = await fetch(`${this.MESSAGING_URL}/conversations?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          const conversations = data.filter((c: any) => 
            (c.name && c.name.toLowerCase().includes(query.toLowerCase())) ||
            (c.lastMessage && c.lastMessage.toLowerCase().includes(query.toLowerCase()))
          );
          chats.conversations = conversations.slice(0, 5);
        }
      } catch (err: any) {
        this.logger.warn(`Messaging node unreachable: ${err.message}`);
      }
    }

    // 3. Merge Mock Data
    const filteredMockBlogs = this.MOCK_BLOGS.filter(blog => 
      blog.title.toLowerCase().includes(query.toLowerCase()) || 
      blog.content.toLowerCase().includes(query.toLowerCase())
    );

    const filteredMockNews = this.MOCK_NEWS.filter(item => 
      item.title.toLowerCase().includes(query.toLowerCase()) || 
      item.content.toLowerCase().includes(query.toLowerCase())
    );

    return {
      blogs: [...dbBlogs, ...filteredMockBlogs].map(b => ({ ...b, category: 'BLOG' })),
      news: filteredMockNews.map(n => ({ ...n, category: 'NEWS' })),
      notifications: notifications.map(n => ({ ...n, category: 'INTEL' })),
      settings: settings.map(s => ({ ...s, category: 'SETTING' })),
      users: users.map(u => ({ ...u, category: 'USER' })),
      logs: {
        activity: activityLogs.map(l => ({ ...l, category: 'LOG_ACTIVITY' })),
        errors: errorLogs.map(l => ({ ...l, category: 'LOG_ERROR' })),
        access: accessLogs.map(l => ({ ...l, category: 'LOG_ACCESS' })),
      },
      chats,
      timestamp: new Date().toISOString(),
      query,
    };
  }
}
