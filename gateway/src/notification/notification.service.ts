import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from '../firebase/firebase.service';
import { ClientProxy } from '@nestjs/microservices';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private prisma: PrismaService,
    private firebaseService: FirebaseService,
    private notificationGateway: NotificationGateway,
    @Inject('NOTIFICATION_SERVICE') private client: ClientProxy,
  ) {}

  async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type?: string;
    metadata?: any;
  }) {
    try {
      // 1. Save to Database
      const notification = await this.prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type || 'INFO',
          data: data.metadata || {},
        },
      });

      // 2. Emit Live Notification via Socket.io
      this.notificationGateway.sendNotificationToUser(data.userId, notification);

      // 3. Send Push Notification via Firebase (if user has a token)
      const user = await this.prisma.user.findUnique({
        where: { id: data.userId },
        select: { fcmToken: true },
      });

      if (user?.fcmToken) {
        await this.firebaseService.sendPushNotification(
          user.fcmToken,
          data.title,
          data.message,
          data.metadata,
        );
      }

      return notification;
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async deleteNotification(notificationId: string) {
    return this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  async deleteAllNotifications(userId: string) {
    return this.prisma.notification.deleteMany({
      where: { userId },
    });
  }

  async updateFcmToken(userId: string, token: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: token },
    });
  }
}
