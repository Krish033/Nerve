import { Controller, Get, Post, Body, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { EventPattern, Payload } from '@nestjs/microservices';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getMyNotifications(@Req() req) {
    return this.notificationService.getUserNotifications(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('read-all')
  async markAllAsRead(@Req() req) {
    return this.notificationService.markAllAsRead(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('fcm-token')
  async updateFcmToken(@Req() req, @Body('token') token: string) {
    return this.notificationService.updateFcmToken(req.user.id, token);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('delete-all')
  async deleteAllNotifications(@Req() req) {
    return this.notificationService.deleteAllNotifications(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/delete')
  async deleteNotification(@Param('id') id: string) {
    return this.notificationService.deleteNotification(id);
  }

  // RabbitMQ Event Handlers
  @EventPattern('notification.send')
  async handleSendNotification(@Payload() data: any) {
    return this.notificationService.createNotification(data);
  }

  // Example: Listen for new messages from messaging microservice
  @EventPattern('message.sent')
  async handleMessageSent(@Payload() data: any) {
    // data: { senderId, receiverId, content, conversationId }
    return this.notificationService.createNotification({
      userId: data.receiverId,
      title: 'New Message',
      message: `You received a new message: ${data.content.substring(0, 50)}...`,
      type: 'MESSAGE',
      metadata: { conversationId: data.conversationId },
    });
  }
}
